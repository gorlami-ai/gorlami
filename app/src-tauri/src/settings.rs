use crate::shortcuts::ShortcutConfig;
use crate::websocket::WebSocketConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    pub shortcuts: ShortcutConfig,
    pub websocket: WebSocketConfig,
    pub selected_microphone: Option<String>,
}

impl std::fmt::Debug for AppSettings {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AppSettings")
            .field("shortcuts", &self.shortcuts)
            .field(
                "websocket",
                &format!(
                    "WebSocketConfig {{ url: '{}', auto_reconnect: {}, reconnect_interval: {} }}",
                    self.websocket.url,
                    self.websocket.auto_reconnect,
                    self.websocket.reconnect_interval
                ),
            )
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

pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let settings_path = get_settings_path(app);

    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {e}"))?;

    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings file: {e}"))?;

    Ok(())
}

// Tauri commands for settings management
#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    Ok(load_settings(&app))
}

#[tauri::command]
pub fn save_app_settings(
    app: AppHandle,
    settings: AppSettings,
    shortcut_state: tauri::State<crate::shortcuts::ShortcutManagerState>,
    websocket_state: tauri::State<crate::websocket::WebSocketClientState>,
    audio_state: tauri::State<std::sync::Arc<crate::simple_audio::SimpleAudioRecorder>>,
) -> Result<(), String> {
    // Save settings to file
    save_settings(&app, &settings)?;

    // Apply shortcuts settings
    {
        let manager = shortcut_state.lock().unwrap();
        if let Err(e) = manager.update_shortcuts(settings.shortcuts.clone()) {
            eprintln!("Failed to update shortcuts: {e}");
        }
    }

    // Apply websocket settings
    {
        let client = websocket_state.lock().unwrap();
        client.update_config(settings.websocket.clone());
    }

    // Apply audio settings
    if let Some(ref mic_name) = settings.selected_microphone {
        if let Err(e) = audio_state.inner().select_device(mic_name) {
            eprintln!("Failed to select microphone '{mic_name}': {e}");
        }
    }

    println!("Settings saved and applied successfully");
    Ok(())
}

#[tauri::command]
pub fn reset_app_settings(app: AppHandle) -> Result<(), String> {
    let default_settings = AppSettings::default();
    save_settings(&app, &default_settings)
}
