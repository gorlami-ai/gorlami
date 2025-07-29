import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
import { backendService } from './backend';
import { logger } from '../utils/logger';

interface EditModeHandlers {
  onEditComplete?: (editedText: string) => void;
  onError?: (error: string) => void;
}

class EditModeService {
  private handlers: EditModeHandlers = {};
  private isProcessing = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for edit shortcut trigger
    listen('edit_triggered', async () => {
      if (this.isProcessing) {
        logger.warn('Already processing an edit');
        return;
      }

      try {
        this.isProcessing = true;
        logger.info('Edit mode triggered');

        // Show processing overlay
        await invoke('show_processing_overlay');
        
        // Emit event to show editing state
        await emit('editing_started', {});

        // Get the selected text
        const selectedText = await invoke<string>('get_selected_text');
        
        if (!selectedText || selectedText.trim().length === 0) {
          throw new Error('No text selected');
        }

        logger.info(`Got selected text: ${selectedText.length} characters`);

        // Send to backend for processing
        const response = await backendService.processText(
          selectedText,
          'Fix grammar, spelling, and improve clarity while maintaining the original meaning and tone'
        );

        logger.info('Text processing complete', { activityId: response.activityId });

        const editedText = response.outputText;

        // Replace the selected text with the edited version using accessibility API
        try {
          await invoke('paste_at_cursor', { text: editedText });
          
          // Emit completion event
          await emit('editing_complete', { 
            originalText: selectedText,
            editedText: editedText 
          });

          // Call handler if provided
          if (this.handlers.onEditComplete) {
            this.handlers.onEditComplete(editedText);
          }
        } catch (pasteError) {
          // If paste fails due to permission, the backend will emit accessibility_permission_needed
          logger.error('Failed to paste edited text', pasteError);
          throw new Error('Failed to paste edited text. Please grant accessibility permission.');
        }

      } catch (error) {
        logger.error('Error in edit mode', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to process text';
        
        // Emit error event
        await emit('editing_error', errorMessage);
        
        if (this.handlers.onError) {
          this.handlers.onError(errorMessage);
        }
      } finally {
        this.isProcessing = false;
        
        // Hide the processing overlay after a delay
        setTimeout(async () => {
          await invoke('hide_processing_overlay');
        }, 1500);
      }
    });

    // Also listen for shortcut_triggered event
    listen<string>('shortcut_triggered', async (event) => {
      if (event.payload === 'edit') {
        // The edit_triggered event will be emitted by the shortcut handler
        logger.debug('Edit shortcut detected via shortcut_triggered event');
      }
    });
  }

  setHandlers(handlers: EditModeHandlers) {
    this.handlers = handlers;
  }

  isCurrentlyProcessing() {
    return this.isProcessing;
  }
}

export const editModeService = new EditModeService();