use crate::error::AppError;
use crate::platform::macos;
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
    // First, copy the text to clipboard
    let mut clipboard = Clipboard::new()?;
    clipboard.set_text(&text)?;
    
    // Small delay to ensure clipboard is updated
    thread::sleep(Duration::from_millis(50));
    
    // Simulate Cmd+V to paste at cursor
    macos::simulate_keystroke("v", &["command down"])?;
    
    // Emit event to notify that paste was attempted
    let _ = app.emit("text_pasted", &text);
    
    log::debug!("Pasted text at cursor: {} chars", text.len());
    Ok(())
}

#[tauri::command]
pub fn get_clipboard_text() -> Result<String, AppError> {
    let mut clipboard = Clipboard::new()?;
    Ok(clipboard.get_text()?)
}

#[tauri::command]
pub fn get_selected_text() -> Result<String, AppError> {
    macos::get_selected_text_with_clipboard_restore()
}