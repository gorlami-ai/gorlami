use crate::error::{AppError, AppResult};
use crate::services::shortcuts_manager::ShortcutConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub shortcuts: ShortcutConfig,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_microphone: Option<String>,
}

impl std::fmt::Debug for AppSettings {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AppSettings")
            .field("shortcuts", &self.shortcuts)
            .field("selected_microphone", &self.selected_microphone)
            .finish()
    }
}

pub fn get_settings_path(app: &AppHandle) -> PathBuf {
    let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join(".gorlami")
    });

    // Create directory if it doesn't exist
    if !app_data_dir.exists() {
        let _ = fs::create_dir_all(&app_data_dir);
    }

    app_data_dir.join("settings.json")
}

pub fn load_settings(app: &AppHandle) -> AppSettings {
    let settings_path = get_settings_path(app);

    if let Ok(content) = fs::read_to_string(&settings_path) {
        if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
            return settings;
        }
    }

    // Return default settings if file doesn't exist or is corrupted
    AppSettings::default()
}

pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> AppResult<()> {
    let settings_path = get_settings_path(app);

    let content = serde_json::to_string_pretty(settings)?;
    fs::write(&settings_path, content)?;

    Ok(())
}

// Tauri commands for settings management
#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    Ok(load_settings(&app))
}

#[tauri::command]
pub fn save_app_settings(
    app: AppHandle,
    settings: AppSettings,
    shortcut_state: tauri::State<crate::services::shortcuts_manager::ShortcutManagerState>,
    audio_state: tauri::State<std::sync::Arc<crate::services::audio::AudioRecorder>>,
) -> Result<(), AppError> {
    // Save settings to file
    save_settings(&app, &settings)?;

    // Apply shortcuts settings
    {
        let manager = shortcut_state.lock();
        if let Err(e) = manager.update_shortcuts(settings.shortcuts.clone()) {
            log::error!("Failed to update shortcuts: {e}");
            return Err(AppError::Shortcut(format!("Failed to update shortcuts: {}", e)));
        }
    }

    // Apply selected microphone
    if let Some(device_name) = &settings.selected_microphone {
        if let Err(e) = audio_state.select_device(device_name) {
            log::error!("Failed to select audio device: {e}");
            // Don't fail the whole save operation for this
        }
    }

    log::info!("Settings saved and applied successfully");
    Ok(())
}

#[tauri::command]
pub fn reset_app_settings(app: AppHandle) -> Result<(), AppError> {
    let default_settings = AppSettings::default();
    save_settings(&app, &default_settings)
}