import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import { CacheManager } from './cacheManager';
import { CacheKeys } from './cacheKeys';
// Remove crypto-browserify import as it causes issues

interface ImageCacheEntry {
  uri: string;
  localPath: string;
  size: number;
  width?: number;
  height?: number;
  timestamp: number;
}

class ImageCacheManager {
  private cache: CacheManager;
  private cacheDir: string;
  private maxDiskSize: number;
  private currentDiskSize: number = 0;

  constructor() {
    this.cache = new CacheManager('image-metadata-cache', {
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 10 * 1024 * 1024, // 10MB for metadata
    });
    this.cacheDir = `${FileSystem.documentDirectory}image-cache/`;
    this.maxDiskSize = 200 * 1024 * 1024; // 200MB
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
      
      // Calculate current disk usage
      await this.calculateDiskUsage();
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  private async calculateDiskUsage(): Promise<void> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      // Note: expo-file-system doesn't provide file sizes in readDirectoryAsync
      // We'll need to get size for each file individually
      let totalSize = 0;
      for (const filename of files) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(this.cacheDir + filename);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        } catch (error) {
          // Ignore individual file errors
        }
      }
      this.currentDiskSize = totalSize;
    } catch (error) {
      console.error('Failed to calculate disk usage:', error);
      this.currentDiskSize = 0;
    }
  }

  private generateCacheKey(uri: string): string {
    // Simple hash function to replace crypto
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      const char = uri.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private getLocalPath(uri: string): string {
    const key = this.generateCacheKey(uri);
    const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
    return `${this.cacheDir}/${key}.${extension}`;
  }

  async getCachedImage(uri: string): Promise<string | null> {
    try {
      const cacheKey = CacheKeys.IMAGE(uri);
      const metadata = await this.cache.get<ImageCacheEntry>(cacheKey);
      
      if (!metadata) {
        return null;
      }

      // Check if file still exists
      const fileInfo = await FileSystem.getInfoAsync(metadata.localPath);
      const exists = fileInfo.exists;
      if (!exists) {
        await this.cache.delete(cacheKey);
        return null;
      }

      return metadata.localPath;
    } catch (error) {
      console.error('Failed to get cached image:', error);
      return null;
    }
  }

  async cacheImage(uri: string): Promise<string> {
    try {
      // Check if already cached
      const cached = await this.getCachedImage(uri);
      if (cached) {
        return cached;
      }

      const localPath = this.getLocalPath(uri);
      
      // Download image
      const downloadResult = await FileSystem.downloadAsync(uri, localPath);

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download image: ${downloadResult.status}`);
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      const fileSize = (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0) || 0;

      // Check if we need to evict old images
      if (this.currentDiskSize + fileSize > this.maxDiskSize) {
        await this.evictOldImages(fileSize);
      }

      // Get image dimensions
      let dimensions = { width: 0, height: 0 };
      try {
        dimensions = await new Promise((resolve, reject) => {
          Image.getSize(
            localPath,
            (width, height) => resolve({ width, height }),
            reject
          );
        });
      } catch {
        // Ignore dimension errors
      }

      // Save metadata
      const metadata: ImageCacheEntry = {
        uri,
        localPath,
        size: fileSize,
        width: dimensions.width,
        height: dimensions.height,
        timestamp: Date.now(),
      };

      const cacheKey = CacheKeys.IMAGE(uri);
      await this.cache.set(cacheKey, metadata);
      this.currentDiskSize += fileSize;

      return localPath;
    } catch (error) {
      console.error('Failed to cache image:', error);
      throw error;
    }
  }

  async preloadImages(uris: string[]): Promise<void> {
    const promises = uris.map(uri => 
      this.cacheImage(uri).catch(error => 
        console.error(`Failed to preload image ${uri}:`, error)
      )
    );
    await Promise.all(promises);
  }

  private async evictOldImages(requiredSpace: number): Promise<void> {
    try {
      const allKeys = await this.cache.getAllKeys();
      const imageEntries: Array<{ key: string; metadata: ImageCacheEntry }> = [];

      // Collect all image entries
      for (const key of allKeys) {
        if (key.startsWith('image:')) {
          const metadata = await this.cache.get<ImageCacheEntry>(key);
          if (metadata) {
            imageEntries.push({ key, metadata });
          }
        }
      }

      // Sort by timestamp (oldest first)
      imageEntries.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);

      // Evict until we have enough space
      let freedSpace = 0;
      for (const entry of imageEntries) {
        if (freedSpace >= requiredSpace) break;

        try {
          await FileSystem.deleteAsync(entry.metadata.localPath, { idempotent: true });
          this.cache.delete(entry.key);
          this.currentDiskSize -= entry.metadata.size;
          freedSpace += entry.metadata.size;
        } catch (error) {
          console.error('Failed to evict image:', error);
        }
      }
    } catch (error) {
      console.error('Failed to evict old images:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      this.cache.clear();
      this.currentDiskSize = 0;
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  async getCacheInfo(): Promise<{
    totalSize: number;
    fileCount: number;
    maxSize: number;
  }> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      return {
        totalSize: this.currentDiskSize,
        fileCount: files.length,
        maxSize: this.maxDiskSize,
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return {
        totalSize: 0,
        fileCount: 0,
        maxSize: this.maxDiskSize,
      };
    }
  }

  async deleteImage(uri: string): Promise<void> {
    try {
      const cacheKey = CacheKeys.IMAGE(uri);
      const metadata = await this.cache.get<ImageCacheEntry>(cacheKey);
      
      if (metadata) {
        await FileSystem.deleteAsync(metadata.localPath, { idempotent: true });
        await this.cache.delete(cacheKey);
        this.currentDiskSize -= metadata.size;
      }
    } catch (error) {
      console.error('Failed to delete cached image:', error);
    }
  }
}

export const imageCacheManager = new ImageCacheManager();