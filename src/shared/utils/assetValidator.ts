import { Asset } from 'expo-asset';
import * as Font from 'expo-font';
import { Image, Platform } from 'react-native';
import { startupLogger } from './startupLogger';
import { errorLogger } from './errorLogger';

interface AssetValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class AssetValidator {
  static async validateRequiredAssets(): Promise<AssetValidationResult> {
    const result: AssetValidationResult = {
      success: true,
      errors: [],
      warnings: []
    };

    startupLogger.log('Starting asset validation');

    // Validate required images
    const requiredImages = [
      require('../../../assets/icon.png'),
      require('../../../assets/splash-icon.png'),
      require('../../../assets/adaptive-icon.png')
    ];

    for (const imageModule of requiredImages) {
      try {
        const asset = Asset.fromModule(imageModule);
        await asset.downloadAsync();
        startupLogger.log(`Asset loaded: ${asset.name || asset.uri}`, 'info');
      } catch (error) {
        const err = error as Error;
        result.success = false;
        result.errors.push(`Failed to load image asset: ${err.message}`);
        errorLogger.log(err, { context: 'image asset loading' });
      }
    }

    // Validate fonts
    const requiredFonts = {
      SpaceMono: require('../../../assets/fonts/SpaceMono-Regular.ttf'),
      Offbeat: require('../../../assets/fonts/Offbeat.ttf')
    };

    for (const [fontName, fontModule] of Object.entries(requiredFonts)) {
      try {
        await Font.loadAsync({ [fontName]: fontModule });
        startupLogger.log(`Font loaded: ${fontName}`, 'info');
      } catch (error) {
        const err = error as Error;
        result.warnings.push(`Failed to load font ${fontName}: ${err.message}`);
        errorLogger.log(err, { context: 'font loading', fontName });
      }
    }

    // Pre-cache common images
    if (Platform.OS === 'ios') {
      const imagesToPreload = [
        require('../../../assets/icon.png'),
        require('../../../assets/splash-icon.png')
      ];

      await Promise.all(
        imagesToPreload.map(image => {
          return Image.prefetch(Image.resolveAssetSource(image).uri);
        })
      ).catch(error => {
        result.warnings.push('Failed to prefetch some images');
        errorLogger.log(error, { context: 'image prefetch' });
      });
    }

    startupLogger.log('Asset validation complete', result.success ? 'info' : 'error', {
      errors: result.errors.length,
      warnings: result.warnings.length
    });

    return result;
  }

  static async validateStoragePaths(): Promise<void> {
    // Validate that required directories exist
    try {
      const { FileSystem } = await import('expo-file-system');
      
      const directories = [
        FileSystem.documentDirectory,
        FileSystem.cacheDirectory
      ];

      for (const dir of directories) {
        if (dir) {
          const info = await FileSystem.getInfoAsync(dir);
          startupLogger.log(`Directory validated: ${dir}`, 'info', { exists: info.exists });
        }
      }
    } catch (error) {
      errorLogger.log(error as Error, { context: 'storage path validation' });
    }
  }
}