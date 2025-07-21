import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
import { logger } from '../utils/logger';

// Extremely simplified recording service - no state, no complex error handling
export function setupSimpleRecording() {
  logger.info('Setting up simple recording listener');
  
  listen('recording_stopped', async () => {
    logger.info('=== RECORDING STOPPED EVENT RECEIVED ===');
    
    try {
      // Step 1: Get audio data
      logger.info('Step 1: Getting audio PCM data...');
      const [pcmBytes, sampleRate] = await invoke<[number[], number]>('get_audio_pcm');
      logger.info(`Step 1 complete: Got ${pcmBytes.length} bytes at ${sampleRate} Hz`);
      
      // Step 2: Convert to Uint8Array
      logger.info('Step 2: Converting to Uint8Array...');
      const audioBuffer = new Uint8Array(pcmBytes);
      logger.info(`Step 2 complete: ${audioBuffer.length} bytes`);
      
      // Step 3: Emit a simple success event for now (skip backend)
      logger.info('Step 3: Emitting success (skipping backend for now)...');
      await emit('recording_success', { 
        message: `Recorded ${audioBuffer.length} bytes`,
        timestamp: new Date().toISOString() 
      });
      logger.info('Step 3 complete: Success event emitted');
      
    } catch (error) {
      // Super simple error handling - just log it
      logger.error('=== ERROR IN RECORDING HANDLER ===', error);
      logger.error('Error type:', typeof error);
      logger.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Emit simple error event
      await emit('recording_error', 'Recording failed - check logs');
    }
    
    logger.info('=== RECORDING HANDLER COMPLETE ===');
  });
}