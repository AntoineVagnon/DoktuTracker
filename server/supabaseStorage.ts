import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/**
 * Supabase Storage Service for GDPR-compliant document storage
 *
 * Features:
 * - EU data residency (if Supabase project is in EU region)
 * - Encryption at rest and in transit
 * - Access control via RLS policies
 * - Audit logging
 * - Right to be forgotten support
 */
export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private bucketName: string = 'patient-documents';

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Supabase configuration missing. Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase Storage Service initialized');
  }

  /**
   * Upload a file to Supabase Storage
   * @param buffer File buffer
   * @param fileName Original file name
   * @param mimeType File MIME type
   * @param userId User ID for organizing files
   * @returns Object with file path and public URL
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    userId: number
  ): Promise<{ path: string; url: string }> {
    // Generate unique file path: userId/uuid-originalname
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${randomUUID()}.${fileExt}`;
    const filePath = `${userId}/${uniqueFileName}`;

    console.log('📤 Uploading to Supabase Storage:', {
      bucket: this.bucketName,
      path: filePath,
      size: buffer.length,
      mimeType
    });

    // Upload file
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: false,
        cacheControl: '3600'
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    console.log('✅ File uploaded successfully:', data.path);

    // Get the full path (without public URL since bucket is private)
    const path = data.path;

    return { path, url: path };
  }

  /**
   * Get a signed URL for secure file download
   * @param filePath Path to the file in storage
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('❌ Error creating signed URL:', error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Download a file from Supabase Storage
   * @param filePath Path to the file in storage
   * @returns File buffer
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(filePath);

    if (error) {
      console.error('❌ Error downloading file:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Delete a file from Supabase Storage (GDPR right to be forgotten)
   * @param filePath Path to the file in storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
      console.error('❌ Error deleting file:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log('🗑️ File deleted (GDPR compliance):', filePath);
  }

  /**
   * Delete all files for a user (GDPR right to be forgotten)
   * @param userId User ID
   */
  async deleteAllUserFiles(userId: number): Promise<void> {
    const prefix = `${userId}/`;

    const { data: files, error: listError } = await this.supabase.storage
      .from(this.bucketName)
      .list(prefix);

    if (listError) {
      throw new Error(`Failed to list user files: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      console.log('ℹ️ No files to delete for user:', userId);
      return;
    }

    const filePaths = files.map(file => `${prefix}${file.name}`);

    const { error: deleteError } = await this.supabase.storage
      .from(this.bucketName)
      .remove(filePaths);

    if (deleteError) {
      throw new Error(`Failed to delete user files: ${deleteError.message}`);
    }

    console.log(`🗑️ Deleted ${files.length} files for user ${userId} (GDPR compliance)`);
  }

  /**
   * Check if storage bucket exists and is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });

      if (error) {
        console.error('❌ Storage health check failed:', error);
        return false;
      }

      console.log('✅ Storage health check passed');
      return true;
    } catch (error) {
      console.error('❌ Storage health check error:', error);
      return false;
    }
  }
}

// Export singleton instance
let storageServiceInstance: SupabaseStorageService | null = null;

export function getSupabaseStorageService(): SupabaseStorageService {
  if (!storageServiceInstance) {
    storageServiceInstance = new SupabaseStorageService();
  }
  return storageServiceInstance;
}
