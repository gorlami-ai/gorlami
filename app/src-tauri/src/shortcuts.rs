use crate::simple_audio::SimpleAudioRecorder;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

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
    config: Arc<Mutex<ShortcutConfig>>,
}

impl<R: Runtime> ShortcutManager<R> {
    pub fn new(app: AppHandle<R>) -> Self {
        Self {
            app,
            config: Arc::new(Mutex::new(ShortcutConfig::default())),
        }
    }


    pub fn init_with_config(&self, config: ShortcutConfig) -> tauri::Result<()> {
        // Update stored config
        {
            let mut stored_config = self.config.lock().unwrap();
            *stored_config = config.clone();
        }

        // Register shortcuts with the provided config
        self.register_shortcuts(&config)
    }

    fn register_shortcuts(&self, config: &ShortcutConfig) -> tauri::Result<()> {
        let app = self.app.clone();
        let transcription_shortcut = config.transcription.clone();
        let edit_shortcut = config.edit.clone();

        // Register transcription shortcut
        match transcription_shortcut.parse::<Shortcut>() {
            Ok(shortcut) => {
                let app_clone = app.clone();
                match self.app.global_shortcut().on_shortcut(
                    shortcut,
                    move |_app_handle, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            println!("Transcription shortcut triggered");
                            // Emit event to frontend
                            let _ = app_clone.emit("shortcut_triggered", "transcription");

                            // Show processing overlay
                            if let Err(e) = app_clone.emit("show_processing_overlay", ()) {
                                eprintln!("Failed to show processing overlay: {}", e);
                            }

                            // Toggle recording
                            if let Some(recorder) =
                                app_clone.try_state::<Arc<SimpleAudioRecorder>>()
                            {
                                if recorder.is_recording() {
                                    if let Err(e) = recorder.stop_recording() {
                                        eprintln!("Failed to stop recording: {}", e);
                                        let _ = app_clone.emit(
                                            "recording_error",
                                            format!("Failed to stop recording: {}", e),
                                        );
                                    }
                                } else {
                                    if let Err(e) = recorder.start_recording() {
                                        eprintln!("Failed to start recording: {}", e);
                                        let _ = app_clone.emit(
                                            "recording_error",
                                            format!("Failed to start recording: {}", e),
                                        );
                                    }
                                }
                            } else {
                                eprintln!("Audio recorder not available");
                                let _ = app_clone
                                    .emit("recording_error", "Audio recorder not available");
                            }
                        }
                    },
                ) {
                    Ok(_) => {
                        println!(
                            "Transcription shortcut '{}' registered successfully",
                            transcription_shortcut
                        );
                    }
                    Err(e) => {
                        eprintln!(
                            "Failed to register transcription shortcut '{}': {}",
                            transcription_shortcut, e
                        );
                        return Err(tauri::Error::Anyhow(anyhow::anyhow!(
                            "Failed to register transcription shortcut '{}': {}",
                            transcription_shortcut,
                            e
                        )));
                    }
                }
            }
            Err(e) => {
                eprintln!(
                    "Invalid transcription shortcut format '{}': {}",
                    transcription_shortcut, e
                );
                return Err(tauri::Error::Anyhow(anyhow::anyhow!(
                    "Invalid transcription shortcut format '{}': {}",
                    transcription_shortcut,
                    e
                )));
            }
        }

        // Register edit shortcut
        match edit_shortcut.parse::<Shortcut>() {
            Ok(shortcut) => {
                let app_clone = app.clone();
                match self.app.global_shortcut().on_shortcut(
                    shortcut,
                    move |_app_handle, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            println!("Edit shortcut triggered");
                            // Emit event to frontend
                            let _ = app_clone.emit("shortcut_triggered", "edit");

                            // TODO: Implement edit functionality
                            // For now, just show a notification
                            let _ = app_clone
                                .emit("edit_triggered", "Edit functionality not yet implemented");
                        }
                    },
                ) {
                    Ok(_) => {
                        println!("Edit shortcut '{}' registered successfully", edit_shortcut);
                    }
                    Err(e) => {
                        eprintln!(
                            "Failed to register edit shortcut '{}': {}",
                            edit_shortcut, e
                        );
                        return Err(tauri::Error::Anyhow(anyhow::anyhow!(
                            "Failed to register edit shortcut '{}': {}",
                            edit_shortcut,
                            e
                        )));
                    }
                }
            }
            Err(e) => {
                eprintln!("Invalid edit shortcut format '{}': {}", edit_shortcut, e);
                return Err(tauri::Error::Anyhow(anyhow::anyhow!(
                    "Invalid edit shortcut format '{}': {}",
                    edit_shortcut,
                    e
                )));
            }
        }

        Ok(())
    }

    pub fn update_shortcuts(&self, new_config: ShortcutConfig) -> tauri::Result<()> {
        println!(
            "Updating shortcuts from {:?} to {:?}",
            self.get_config(),
            new_config
        );

        // Unregister all shortcuts
        match self.app.global_shortcut().unregister_all() {
            Ok(_) => {
                println!("Successfully unregistered all shortcuts");
            }
            Err(e) => {
                eprintln!("Failed to unregister shortcuts: {}", e);
                return Err(tauri::Error::Anyhow(anyhow::anyhow!(
                    "Failed to unregister shortcuts: {}",
                    e
                )));
            }
        }

        // Update config
        {
            let mut config = self.config.lock().unwrap();
            *config = new_config.clone();
        }

        // Re-register with new config
        match self.register_shortcuts(&new_config) {
            Ok(_) => {
                println!("Shortcuts updated successfully: {:?}", new_config);
                // Emit success event
                let _ = self.app.emit("shortcuts_updated", &new_config);
                Ok(())
            }
            Err(e) => {
                eprintln!("Failed to register new shortcuts: {}", e);
                // Emit error event
                let _ = self.app.emit(
                    "shortcuts_error",
                    format!("Failed to register shortcuts: {}", e),
                );
                Err(e)
            }
        }
    }

    pub fn get_config(&self) -> ShortcutConfig {
        self.config.lock().unwrap().clone()
    }
}

// Global shortcut manager state
pub type ShortcutManagerState = Arc<Mutex<ShortcutManager<tauri::Wry>>>;

#[tauri::command]
pub fn get_shortcut_config(state: State<ShortcutManagerState>) -> Result<ShortcutConfig, String> {
    let manager = state.lock().unwrap();
    Ok(manager.get_config())
}

#[tauri::command]
pub fn update_shortcut_config(
    config: ShortcutConfig,
    state: State<ShortcutManagerState>,
) -> Result<(), String> {
    let manager = state.lock().unwrap();
    manager
        .update_shortcuts(config)
        .map_err(|e| format!("Failed to update shortcuts: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn validate_shortcut(shortcut: String) -> Result<bool, String> {
    match shortcut.parse::<Shortcut>() {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Invalid shortcut format: {}", e)),
    }
}
