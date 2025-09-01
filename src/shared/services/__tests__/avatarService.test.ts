import { AvatarService, AvatarUploadResult } from '../avatarService';
import { supabase } from '@/shared/lib/supabase/client';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('@/shared/lib/supabase/client');
jest.mock('expo-file-system');
jest.mock('base64-arraybuffer');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;

describe('AvatarService', () => {
  const mockUserId = 'user-123';
  const mockImageUri = 'file:///path/to/image.jpg';
  const mockAvatarUrl = 'https://supabase.co/storage/avatars/user-123_123456.jpg';
  const mockFileName = 'user-123_123456.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockFileSystem.getInfoAsync.mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 1024 * 1024, // 1MB
      modificationTime: Date.now(),
      uri: mockImageUri,
    });

    mockFileSystem.readAsStringAsync.mockResolvedValue('base64string');

    mockSupabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: mockFileName }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: mockAvatarUrl } }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any);
  });

  describe('uploadAvatar', () => {
    it('should successfully upload avatar image', async () => {
      const result = await AvatarService.uploadAvatar(mockImageUri, mockUserId);

      expect(result.success).toBe(true);
      expect(result.avatarUrl).toBe(mockAvatarUrl);
      expect(result.error).toBeUndefined();

      // Verify file operations
      expect(mockFileSystem.getInfoAsync).toHaveBeenCalledWith(mockImageUri);
      expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(mockImageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify Supabase operations
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('avatars');
    });

    it('should fail when image file does not exist', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        size: 0,
        modificationTime: 0,
        uri: mockImageUri,
      });

      const result = await AvatarService.uploadAvatar(mockImageUri, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Selected image file does not exist');
      expect(result.avatarUrl).toBeUndefined();
    });

    it('should fail when image file is too large', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 10 * 1024 * 1024, // 10MB (over 5MB limit)
        modificationTime: Date.now(),
        uri: mockImageUri,
      });

      const result = await AvatarService.uploadAvatar(mockImageUri, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image file is too large. Please select an image under 5MB.');
    });

    it('should handle Supabase upload error', async () => {
      const uploadError = { message: 'Storage quota exceeded' };
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: null, error: uploadError }),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
      } as any);

      const result = await AvatarService.uploadAvatar(mockImageUri, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage quota exceeded');
    });

    it('should handle different image file extensions', async () => {
      const testCases = [
        { uri: 'file:///image.png', extension: 'png' },
        { uri: 'file:///image.jpeg', extension: 'jpeg' },
        { uri: 'file:///image.webp', extension: 'webp' },
        { uri: 'file:///image.gif', extension: 'jpg' }, // Should default to jpg
      ];

      for (const { uri, extension } of testCases) {
        await AvatarService.uploadAvatar(uri, mockUserId);
        
        const uploadCall = (mockSupabase.storage.from('avatars').upload as jest.Mock).mock.calls[0];
        const fileName = uploadCall[0];
        expect(fileName).toContain(`.${extension}`);
      }
    });

    it('should handle unexpected errors gracefully', async () => {
      mockFileSystem.getInfoAsync.mockRejectedValue(new Error('File system error'));

      const result = await AvatarService.uploadAvatar(mockImageUri, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File system error');
    });
  });

  describe('deleteAvatar', () => {
    it('should successfully delete avatar', async () => {
      const result = await AvatarService.deleteAvatar(mockAvatarUrl);

      expect(result).toBe(true);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('avatars');
    });

    it('should fail when URL is invalid', async () => {
      const result = await AvatarService.deleteAvatar('invalid-url');

      expect(result).toBe(false);
    });

    it('should handle Supabase deletion error', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'File not found' } 
        }),
      } as any);

      const result = await AvatarService.deleteAvatar(mockAvatarUrl);

      expect(result).toBe(false);
    });

    it('should handle unexpected deletion errors', async () => {
      mockSupabase.storage.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await AvatarService.deleteAvatar(mockAvatarUrl);

      expect(result).toBe(false);
    });
  });

  describe('updateAvatar', () => {
    const oldAvatarUrl = 'https://supabase.co/storage/avatars/old-avatar.jpg';

    it('should successfully update avatar and delete old one', async () => {
      const mockDeleteSpy = jest.spyOn(AvatarService, 'deleteAvatar').mockResolvedValue(true);

      const result = await AvatarService.updateAvatar(mockImageUri, mockUserId, oldAvatarUrl);

      expect(result.success).toBe(true);
      expect(result.avatarUrl).toBe(mockAvatarUrl);
      expect(mockDeleteSpy).toHaveBeenCalledWith(oldAvatarUrl);

      mockDeleteSpy.mockRestore();
    });

    it('should not delete old avatar if upload fails', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        size: 0,
        modificationTime: 0,
        uri: mockImageUri,
      });

      const mockDeleteSpy = jest.spyOn(AvatarService, 'deleteAvatar').mockResolvedValue(true);

      const result = await AvatarService.updateAvatar(mockImageUri, mockUserId, oldAvatarUrl);

      expect(result.success).toBe(false);
      expect(mockDeleteSpy).not.toHaveBeenCalled();

      mockDeleteSpy.mockRestore();
    });

    it('should not delete old avatar if URLs are the same', async () => {
      const mockDeleteSpy = jest.spyOn(AvatarService, 'deleteAvatar').mockResolvedValue(true);

      const result = await AvatarService.updateAvatar(mockImageUri, mockUserId, mockAvatarUrl);

      expect(result.success).toBe(true);
      expect(mockDeleteSpy).not.toHaveBeenCalled();

      mockDeleteSpy.mockRestore();
    });

    it('should continue even if old avatar deletion fails', async () => {
      const mockDeleteSpy = jest.spyOn(AvatarService, 'deleteAvatar').mockResolvedValue(false);

      const result = await AvatarService.updateAvatar(mockImageUri, mockUserId, oldAvatarUrl);

      expect(result.success).toBe(true);
      expect(result.avatarUrl).toBe(mockAvatarUrl);
      expect(mockDeleteSpy).toHaveBeenCalledWith(oldAvatarUrl);

      mockDeleteSpy.mockRestore();
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty user ID', async () => {
      const result = await AvatarService.uploadAvatar(mockImageUri, '');

      expect(result.success).toBe(true); // Should still work, just with empty prefix
    });

    it('should handle empty image URI', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: false,
        isDirectory: false,
        size: 0,
        modificationTime: 0,
        uri: '',
      });

      const result = await AvatarService.uploadAvatar('', mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Selected image file does not exist');
    });

    it('should handle file at exactly the size limit', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 5 * 1024 * 1024, // Exactly 5MB
        modificationTime: Date.now(),
        uri: mockImageUri,
      });

      const result = await AvatarService.uploadAvatar(mockImageUri, mockUserId);

      expect(result.success).toBe(true); // Should work at exactly the limit
    });

    it('should handle file just over the size limit', async () => {
      mockFileSystem.getInfoAsync.mockResolvedValue({
        exists: true,
        isDirectory: false,
        size: 5 * 1024 * 1024 + 1, // 1 byte over 5MB
        modificationTime: Date.now(),
        uri: mockImageUri,
      });

      const result = await AvatarService.uploadAvatar(mockImageUri, mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image file is too large. Please select an image under 5MB.');
    });

    it('should handle malformed URLs in deletion', async () => {
      const malformedUrls = ['', 'not-a-url', 'http://example.com', 'ftp://invalid.com'];

      for (const url of malformedUrls) {
        const result = await AvatarService.deleteAvatar(url);
        expect(result).toBe(false);
      }
    });

    it('should generate unique filenames for concurrent uploads', async () => {
      const uploadCalls: Promise<AvatarUploadResult>[] = [];
      
      // Simulate multiple concurrent uploads
      for (let i = 0; i < 5; i++) {
        uploadCalls.push(AvatarService.uploadAvatar(mockImageUri, mockUserId));
      }

      const results = await Promise.all(uploadCalls);
      
      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Filenames should be unique (due to timestamp)
      const uploadMock = mockSupabase.storage.from('avatars').upload as jest.Mock;
      const filenames = uploadMock.mock.calls.map(call => call[0]);
      const uniqueFilenames = new Set(filenames);
      expect(uniqueFilenames.size).toBe(filenames.length);
    });
  });

  describe('content type detection', () => {
    it('should set correct content types for different extensions', async () => {
      const testCases = [
        { uri: 'file:///image.png', expectedType: 'image/png' },
        { uri: 'file:///image.jpg', expectedType: 'image/jpeg' },
        { uri: 'file:///image.jpeg', expectedType: 'image/jpeg' },
        { uri: 'file:///image.webp', expectedType: 'image/webp' },
      ];

      for (const { uri, expectedType } of testCases) {
        await AvatarService.uploadAvatar(uri, mockUserId);
        
        const uploadCall = (mockSupabase.storage.from('avatars').upload as jest.Mock).mock.calls.slice(-1)[0];
        const options = uploadCall[2];
        expect(options.contentType).toBe(expectedType);
      }
    });
  });
});