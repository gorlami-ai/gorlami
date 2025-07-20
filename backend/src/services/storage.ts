import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export class StorageService {
  private supabase;
  private bucketName = 'activity-files';

  constructor() {
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
  }

  async uploadFile(
    path: string,
    file: Buffer,
    contentType?: string
  ): Promise<{ path: string; error?: Error }> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      return { path: '', error: new Error(error.message) };
    }

    return { path: data.path };
  }

  async downloadFile(path: string): Promise<{ data: Blob | null; error?: Error }> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(path);

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data };
  }

  async deleteFile(path: string): Promise<{ error?: Error }> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([path]);

    if (error) {
      return { error: new Error(error.message) };
    }

    return {};
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}

export const storageService = new StorageService();