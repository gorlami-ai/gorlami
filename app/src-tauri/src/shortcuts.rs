use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_global_shortcut::{
    GlobalShortcutExt, Shortcut, ShortcutState,
};
use crate::simple_audio::SimpleAudioRecorder;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutConfig {
    pub transcription: String,
    pub edit: String,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            transcription: "CommandOrControl+Ctrl+Space".to_string(),
            edit: "CommandOrControl+Ctrl+E".to_string(),
        }
    }
}

pub struct ShortcutManager<R: Runtime> {
    app: AppHandle<R>,
    config: ShortcutConfig,
}

impl<R: Runtime> ShortcutManager<R> {
    pub fn new(app: AppHandle<R>) -> Self {
        Self {
            app,
            config: ShortcutConfig::default(),
        }
    }

    pub fn init(&self) -> tauri::Result<()> {
        let app = self.app.clone();
        let transcription_shortcut = self.config.transcription.clone();
        let edit_shortcut = self.config.edit.clone();

        // Register transcription shortcut
        if let Ok(shortcut) = transcription_shortcut.parse::<Shortcut>() {
            let app_clone = app.clone();
            self.app
                .global_shortcut()
                .on_shortcut(shortcut, move |_app_handle, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        println!("Transcription shortcut triggered");
                        // Emit event to frontend
                        let _ = app_clone.emit("shortcut_triggered", "transcription");
                        
                        // Toggle recording
                        if let Some(recorder) = app_clone.try_state::<Arc<SimpleAudioRecorder>>() {
                            if recorder.is_recording() {
                                let _ = recorder.stop_recording();
                            } else {
                                let _ = recorder.start_recording();
                            }
                        }
                    }
                })
                .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Failed to register transcription shortcut: {}", e)))?;
        }

        // Register edit shortcut
        if let Ok(shortcut) = edit_shortcut.parse::<Shortcut>() {
            let app_clone = app.clone();
            self.app
                .global_shortcut()
                .on_shortcut(shortcut, move |_app_handle, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        println!("Edit shortcut triggered");
                        // Emit event to frontend
                        let _ = app_clone.emit("shortcut_triggered", "edit");
                    }
                })
                .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Failed to register edit shortcut: {}", e)))?;
        }

        Ok(())
    }

    pub fn update_shortcuts(&mut self, config: ShortcutConfig) -> tauri::Result<()> {
        // Unregister all shortcuts
        self.app.global_shortcut().unregister_all()
            .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("Failed to unregister shortcuts: {}", e)))?;
        
        // Update config
        self.config = config;
        
        // Re-register with new config
        self.init()
    }
}

#[tauri::command]
pub fn get_shortcut_config<R: Runtime>(
    _app: AppHandle<R>,
) -> Result<ShortcutConfig, String> {
    // For now, return default config
    // Later we'll load from persistent storage
    Ok(ShortcutConfig::default())
}

#[tauri::command]
pub fn update_shortcut_config<R: Runtime>(
    _app: AppHandle<R>,
    config: ShortcutConfig,
) -> Result<(), String> {
    // Later we'll save to persistent storage
    println!("Updating shortcuts: {:?}", config);
    Ok(())
}