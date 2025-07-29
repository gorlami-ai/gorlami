use crate::error::AppError;
use crate::platform::accessibility;
use tauri::Emitter;
use tauri_plugin_clipboard_manager::ClipboardExt;

// Tauri commands
#[tauri::command]
pub fn copy_to_clipboard(text: String, app: tauri::AppHandle) -> Result<(), AppError> {
    app.clipboard()
        .write_text(&text)
        .map_err(|e| AppError::System(format!("Failed to copy to clipboard: {}", e)))?;
    log::debug!("Copied {} characters to clipboard", text.len());
    Ok(())
}

#[tauri::command]
pub fn paste_at_cursor(text: String, app: tauri::AppHandle) -> Result<(), AppError> {
    // Only use accessibility API - no fallback
    match accessibility::insert_text_at_cursor(&text) {
        Ok(()) => {
            log::debug!("Pasted text using Accessibility API: {} chars", text.len());
            let _ = app.emit("text_pasted", &text);
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to paste text: {}", e);
            // Emit specific event for permission errors
            if matches!(&e, AppError::Permission(_)) {
                let _ = app.emit("accessibility_permission_needed", "paste");
            }
            Err(e)
        }
    }
}

#[tauri::command]
pub fn get_clipboard_text(app: tauri::AppHandle) -> Result<String, AppError> {
    app.clipboard()
        .read_text()
        .map_err(|e| AppError::System(format!("Failed to read clipboard: {}", e)))
}

#[tauri::command]
pub fn get_selected_text(app: tauri::AppHandle) -> Result<String, AppError> {
    // Only use accessibility API - no fallback
    match accessibility::get_selected_text() {
        Ok(text) => {
            log::debug!("Got selected text using Accessibility API: {} chars", text.len());
            Ok(text)
        }
        Err(e) => {
            log::error!("Failed to get selected text: {}", e);
            // Emit specific event for permission errors
            if matches!(&e, AppError::Permission(_)) {
                let _ = app.emit("accessibility_permission_needed", "selection");
            }
            Err(e)
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