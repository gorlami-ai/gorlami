use crate::error::AppError;
use crate::services::shortcuts_manager::{ShortcutConfig, ShortcutManagerState};
use tauri::State;
use tauri_plugin_global_shortcut::Shortcut;

#[tauri::command]
pub fn get_shortcut_config(state: State<ShortcutManagerState>) -> Result<ShortcutConfig, AppError> {
    let manager = state.lock();
    Ok(manager.get_config())
}

#[tauri::command]
pub fn update_shortcut_config(
    config: ShortcutConfig,
    state: State<ShortcutManagerState>,
) -> Result<(), AppError> {
    let manager = state.lock();
    manager.update_shortcuts(config)
}

#[tauri::command]
pub fn validate_shortcut(shortcut: String) -> Result<bool, AppError> {
    match shortcut.parse::<Shortcut>() {
        Ok(_) => Ok(true),
        Err(e) => Err(AppError::Shortcut(format!("Invalid shortcut format: {}", e))),
    }
}

#[tauri::command]
pub fn disable_shortcuts(state: State<ShortcutManagerState>) -> Result<(), AppError> {
    let manager = state.lock();
    manager.disable_shortcuts()
}

#[tauri::command]
pub fn enable_shortcuts(state: State<ShortcutManagerState>) -> Result<(), AppError> {
    let manager = state.lock();
    manager.enable_shortcuts()
}