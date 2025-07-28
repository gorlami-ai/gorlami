import { logger } from '../utils/logger';

interface CachedAudio {
  audio: HTMLAudioElement;
  blobUrl: string;
  loadedAt: Date;
}

interface CachedUrl {
  url: string;
  expiresAt: Date;
}

class AudioPlayerService {
  private currentAudio: HTMLAudioElement | null = null;
  private currentId: string | null = null;
  private isLoading = false;
  private onEndedCallback: (() => void) | null = null;
  
  // Cache for loaded audio elements
  private audioCache = new Map<string, CachedAudio>();
  
  // Cache for signed URLs
  private urlCache = new Map<string, CachedUrl>();

  /**
   * Cache a signed URL with expiration
   */
  cacheUrl(id: string, url: string, expiresIn: number): void {
    const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000); // Subtract 60s for safety
    this.urlCache.set(id, { url, expiresAt });
  }

  /**
   * Get cached URL if still valid
   */
  getCachedUrl(id: string): string | null {
    const cached = this.urlCache.get(id);
    if (!cached) return null;
    
    if (new Date() > cached.expiresAt) {
      this.urlCache.delete(id);
      return null;
    }
    
    return cached.url;
  }

  /**
   * Check if audio is already loaded for an ID
   */
  isAudioLoaded(id: string): boolean {
    return this.audioCache.has(id);
  }

  /**
   * Play audio from a URL
   * @param url The URL to fetch audio from
   * @param id Optional ID to track which audio is playing
   * @param onEnded Optional callback when audio ends naturally
   */
  async play(url: string, id?: string, onEnded?: () => void): Promise<void> {
    try {
      // If same audio is playing, toggle pause/play
      if (id && id === this.currentId && this.currentAudio && !this.currentAudio.paused) {
        this.pause();
        return;
      }
      
      // If same audio is paused, just resume
      if (id && id === this.currentId && this.currentAudio && this.currentAudio.paused) {
        await this.resume();
        return;
      }

      // Store the callback
      this.onEndedCallback = onEnded || null;

      // Check if we have this audio cached
      if (id && this.audioCache.has(id)) {
        const cached = this.audioCache.get(id)!;
        
        // Stop any current audio
        if (this.currentAudio && this.currentAudio !== cached.audio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        }
        
        // Use cached audio
        this.currentAudio = cached.audio;
        this.currentId = id;
        
        await this.currentAudio.play();
        logger.info('Playing cached audio', { id });
        return;
      }

      // Stop any current audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }
      
      this.isLoading = true;
      this.currentId = id || null;
      
      logger.info('Fetching audio from URL', { url, id });
      
      // Fetch the Opus audio data
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      }
      
      const opusData = await response.arrayBuffer();
      logger.info('Audio data fetched', { size: opusData.byteLength });
      
      // Create blob URL for Opus data
      const opusBlob = new Blob([opusData], { type: 'audio/opus' });
      const blobUrl = URL.createObjectURL(opusBlob);
      
      // Create audio element
      const audio = new Audio(blobUrl);
      audio.volume = 1.0;
      
      // Set up event handlers
      audio.addEventListener('ended', () => {
        logger.info('Audio playback ended');
        if (this.currentAudio === audio) {
          this.currentAudio.currentTime = 0;
          // Call the onEnded callback if provided
          if (this.onEndedCallback) {
            this.onEndedCallback();
            this.onEndedCallback = null;
          }
        }
      });
      
      audio.addEventListener('error', (error) => {
        logger.error('Audio playback error', error);
        this.stop();
      });
      
      // Cache the audio if ID provided
      if (id) {
        this.audioCache.set(id, {
          audio,
          blobUrl,
          loadedAt: new Date()
        });
      }
      
      // Set as current and play
      this.currentAudio = audio;
      
      await audio.play();
      this.isLoading = false;
      
      logger.info('Audio playback started', { id });
    } catch (error) {
      logger.error('Failed to play audio', error);
      this.isLoading = false;
      this.stop();
      throw error;
    }
  }

  /**
   * Pause current audio
   */
  pause(): void {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
      logger.info('Audio paused');
    }
  }

  /**
   * Resume current audio
   */
  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(error => {
        logger.error('Failed to resume audio', error);
      });
    }
  }

  /**
   * Stop current audio playback (but keep cache)
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    
    this.currentAudio = null;
    this.currentId = null;
    this.isLoading = false;
    this.onEndedCallback = null;
    logger.info('Audio stopped');
  }

  /**
   * Clear all cached audio and URLs
   */
  clearCache(): void {
    // Clean up all cached blob URLs
    this.audioCache.forEach(cached => {
      URL.revokeObjectURL(cached.blobUrl);
    });
    
    this.audioCache.clear();
    this.urlCache.clear();
    
    logger.info('Audio cache cleared');
  }

  /**
   * Check if audio is currently playing
   * @param id Optional ID to check if specific audio is playing
   */
  isPlaying(id?: string): boolean {
    if (!this.currentAudio) return false;
    
    if (id) {
      return this.currentId === id && !this.currentAudio.paused;
    }
    
    return !this.currentAudio.paused;
  }

  /**
   * Check if audio is currently loading
   */
  isAudioLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Get current playing audio ID
   */
  getCurrentId(): string | null {
    return this.currentId;
  }
}

// Export singleton instance
export const audioPlayer = new AudioPlayerService();