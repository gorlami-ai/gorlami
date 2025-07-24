use crate::error::AppError;
use crate::platform::{accessibility, macos};
use arboard::Clipboard;
use std::thread;
use std::time::Duration;
use tauri::Emitter;

// Tauri commands
#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), AppError> {
    let mut clipboard = Clipboard::new()?;
    clipboard.set_text(&text)?;
    log::debug!("Copied {} characters to clipboard", text.len());
    Ok(())
}

#[tauri::command]
pub fn paste_at_cursor(text: String, app: tauri::AppHandle) -> Result<(), AppError> {
    // Try native accessibility API first
    match accessibility::insert_text_at_cursor(&text) {
        Ok(()) => {
            log::debug!("Pasted text using Accessibility API: {} chars", text.len());
            let _ = app.emit("text_pasted", &text);
            Ok(())
        }
        Err(e) => {
            log::warn!("Accessibility API failed: {}, falling back to clipboard method", e);
            
            // Fallback to clipboard + AppleScript method
            let mut clipboard = Clipboard::new()?;
            clipboard.set_text(&text)?;
            
            // Small delay to ensure clipboard is updated
            thread::sleep(Duration::from_millis(50));
            
            // Simulate Cmd+V to paste at cursor
            macos::simulate_keystroke("v", &["command down"])?;
            
            // Emit event to notify that paste was attempted
            let _ = app.emit("text_pasted", &text);
            
            log::debug!("Pasted text at cursor using fallback: {} chars", text.len());
            Ok(())
        }
    }
}

#[tauri::command]
pub fn get_clipboard_text() -> Result<String, AppError> {
    let mut clipboard = Clipboard::new()?;
    Ok(clipboard.get_text()?)
}

#[tauri::command]
pub fn get_selected_text() -> Result<String, AppError> {
    // Try native accessibility API first
    match accessibility::get_selected_text() {
        Ok(text) => {
            log::debug!("Got selected text using Accessibility API: {} chars", text.len());
            Ok(text)
        }
        Err(e) => {
            log::warn!("Accessibility API failed: {}, falling back to clipboard method", e);
            // Fallback to clipboard method
            macos::get_selected_text_with_clipboard_restore()
        }
    }
}

#[tauri::command]
pub fn check_accessibility_permission() -> Result<bool, AppError> {
    Ok(accessibility::check_accessibility_permission())
}

#[tauri::command]
pub fn request_accessibility_permission() -> Result<bool, AppError> {
    Ok(accessibility::request_accessibility_permission())
}

#[tauri::command]
pub fn open_accessibility_preferences() -> Result<(), AppError> {
    accessibility::open_accessibility_preferences()
}