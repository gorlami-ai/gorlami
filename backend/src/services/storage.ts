import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export class StorageService {
  private supabase;
  private bucketName: string;

  constructor() {
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
    this.bucketName = env.SUPABASE_STORAGE_BUCKET;

    logger.info({ bucketName: this.bucketName }, 'StorageService initialized with bucket');

    // Check bucket availability on initialization
    this.checkBucketExists().catch((err) => {
      logger.error(
        { error: err, bucketName: this.bucketName },
        'Failed to verify storage bucket exists'
      );
    });
  }

  private async checkBucketExists(): Promise<void> {
    try {
      const { data, error } = await this.supabase.storage.getBucket(this.bucketName);

      if (error) {
        logger.error(
          {
            bucketName: this.bucketName,
            error: error.message,
            hint: 'Please ensure the bucket exists in your Supabase project',
          },
          'Storage bucket not found or inaccessible'
        );
        throw new Error(`Storage bucket '${this.bucketName}' not found: ${error.message}`);
      }

      logger.info(
        {
          bucketName: data.name,
          public: data.public,
          createdAt: data.created_at,
        },
        'Storage bucket verified'
      );
    } catch (err) {
      logger.error({ error: err }, 'Error checking bucket existence');
      throw err;
    }
  }

  async uploadFile(
    path: string,
    file: Buffer,
    contentType?: string
  ): Promise<{ path: string; error?: Error }> {
    logger.debug(
      {
        bucketName: this.bucketName,
        path,
        fileSize: file.length,
        contentType,
        supabaseUrl: env.SUPABASE_URL,
      },
      'Starting Supabase storage upload'
    );

    try {
      const { data, error } = await this.supabase.storage.from(this.bucketName).upload(path, file, {
        contentType,
        upsert: false,
      });

      if (error) {
        logger.error(
          {
            supabaseError: error,
            errorMessage: error.message,
            errorName: error.name,
            bucketName: this.bucketName,
            path,
          },
          'Supabase storage upload failed'
        );
        return { path: '', error: new Error(error.message) };
      }

      logger.info({ uploadedPath: data.path }, 'File uploaded to Supabase successfully');
      return { path: data.path };
    } catch (err) {
      logger.error(
        { error: err, path, bucketName: this.bucketName },
        'Unexpected error during upload'
      );
      return { path: '', error: err instanceof Error ? err : new Error('Unknown upload error') };
    }
  }


  async deleteFile(path: string): Promise<{ error?: Error }> {
    const { error } = await this.supabase.storage.from(this.bucketName).remove([path]);

    if (error) {
      return { error: new Error(error.message) };
    }

    return {};
  }

  async createSignedUrl(
    path: string,
    expiresIn: number = 3600
  ): Promise<{ url: string; error?: Error }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(path, expiresIn);

      if (error) {
        logger.error(
          {
            error: error.message,
            path,
            bucketName: this.bucketName,
          },
          'Failed to create signed URL'
        );
        return { url: '', error: new Error(error.message) };
      }

      logger.debug(
        {
          path,
          expiresIn,
          urlLength: data.signedUrl.length,
        },
        'Created signed URL successfully'
      );

      return { url: data.signedUrl };
    } catch (err) {
      logger.error(
        { error: err, path, bucketName: this.bucketName },
        'Unexpected error creating signed URL'
      );
      return { url: '', error: err instanceof Error ? err : new Error('Unknown error') };
    }
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from(this.bucketName).getPublicUrl(path);

    return data.publicUrl;
  }
}

export const storageService = new StorageService();
