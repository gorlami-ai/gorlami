import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { createLogger } from '../../utils/logger';
import { handleError } from './errorHandler';

const logger = createLogger('Clipboard');

export interface ClipboardOptions {
  paste?: boolean;
  emitEvent?: boolean;
}

export async function copyToClipboard(
  text: string,
  options: ClipboardOptions = {}
): Promise<boolean> {
  const { 
    paste = false, 
    emitEvent = false
  } = options;

  try {
    await invoke('copy_to_clipboard', { text });
    logger.debug('Copied to clipboard', { textLength: text.length });

    if (paste) {
      await pasteAtCursor(text);
    }

    if (emitEvent) {
      await emit('clipboard_copied', { text });
    }

    return true;
  } catch (error) {
    await handleError(error, {
      context: 'Clipboard',
      fallbackMessage: 'Failed to copy to clipboard'
    });
    return false;
  }
}

export async function pasteAtCursor(text: string): Promise<boolean> {
  try {
    await invoke('paste_at_cursor', { text });
    logger.debug('Pasted at cursor position');
    return true;
  } catch (error) {
    await handleError(error, {
      context: 'Clipboard',
      fallbackMessage: 'Failed to paste at cursor'
    });
    return false;
  }
}

export async function copyAndPaste(
  text: string,
  options: Omit<ClipboardOptions, 'paste'> = {}
): Promise<boolean> {
  return copyToClipboard(text, { ...options, paste: true });
}

export async function getClipboardText(): Promise<string | null> {
  try {
    const text = await invoke<string>('get_clipboard_text');
    return text;
  } catch (error) {
    await handleError(error, {
      context: 'Clipboard',
      fallbackMessage: 'Failed to read from clipboard',
      showToast: false
    });
    return null;
  }
}

export async function getSelectedText(): Promise<string | null> {
  try {
    const text = await invoke<string>('get_selected_text');
    logger.debug('Got selected text', { textLength: text.length });
    return text;
  } catch (error) {
    await handleError(error, {
      context: 'Clipboard',
      fallbackMessage: 'Failed to get selected text',
      showToast: false
    });
    return null;
  }
}