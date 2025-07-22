use crate::error::AppError;
use crate::ui::window_utils;
use tauri::AppHandle;

// Tauri commands
#[tauri::command]
pub fn show_processing_overlay(app: AppHandle) -> Result<(), AppError> {
    window_utils::show_processing_overlay(&app)
}

#[tauri::command]
pub fn hide_processing_overlay(app: AppHandle) -> Result<(), AppError> {
    window_utils::hide_processing_overlay(&app)
}