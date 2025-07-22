use crate::services::audio::AudioRecorder;
use crate::error::{AppError, AppResult};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutConfig {
    pub transcription: String,
    #[serde(default = "default_true")]
    pub transcription_enabled: bool,
}

fn default_true() -> bool {
    true
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        Self {
            transcription: "CommandOrControl+Ctrl+Space".to_string(),
            transcription_enabled: true,
        }
    }
}

pub struct ShortcutManager<R: Runtime> {
    app: AppHandle<R>,
    config: Arc<Mutex<ShortcutConfig>>,
    enabled: Arc<Mutex<bool>>,
}

impl<R: Runtime> ShortcutManager<R> {
    pub fn new(app: AppHandle<R>) -> Self {
        Self {
            app,
            config: Arc::new(Mutex::new(ShortcutConfig::default())),
            enabled: Arc::new(Mutex::new(true)),
        }
    }

    pub fn init_with_config(&self, config: ShortcutConfig) -> AppResult<()> {
        // Update stored config
        {
            let mut stored_config = self.config.lock();
            *stored_config = config.clone();
        }

        // Register shortcuts with the provided config
        self.register_shortcuts(&config)
    }

    fn register_shortcuts(&self, config: &ShortcutConfig) -> AppResult<()> {
        // Register transcription shortcut if enabled
        if config.transcription_enabled {
            self.register_transcription_shortcut(&config.transcription)?;
        } else {
            log::info!("Transcription shortcut is disabled, skipping registration");
        }


        Ok(())
    }

    fn register_transcription_shortcut(&self, shortcut_str: &str) -> AppResult<()> {
        let shortcut = shortcut_str.parse::<Shortcut>()
            .map_err(|e| AppError::Shortcut(format!("Invalid transcription shortcut format '{}': {}", shortcut_str, e)))?;

        let app = self.app.clone();
        self.app.global_shortcut().on_shortcut(
            shortcut,
            move |_app_handle, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    handle_transcription_shortcut(&app);
                }
            },
        ).map_err(|e| AppError::Shortcut(format!("Failed to register transcription shortcut '{}': {}", shortcut_str, e)))?;

        log::info!("Transcription shortcut '{}' registered successfully", shortcut_str);
        Ok(())
    }

    pub fn update_shortcuts(&self, new_config: ShortcutConfig) -> AppResult<()> {
        log::info!("Updating shortcuts from {:?} to {:?}", self.get_config(), new_config);

        // Unregister all shortcuts
        self.app.global_shortcut().unregister_all()
            .map_err(|e| AppError::Shortcut(format!("Failed to unregister shortcuts: {}", e)))?;

        // Update config
        {
            let mut config = self.config.lock();
            *config = new_config.clone();
        }

        // Re-register with new config
        match self.register_shortcuts(&new_config) {
            Ok(_) => {
                log::info!("Shortcuts updated successfully: {:?}", new_config);
                // Emit success event
                let _ = self.app.emit("shortcuts_updated", &new_config);
                Ok(())
            }
            Err(e) => {
                log::error!("Failed to register new shortcuts: {}", e);
                // Emit error event
                let _ = self.app.emit("shortcuts_error", format!("Failed to register shortcuts: {}", e));
                Err(e)
            }
        }
    }

    pub fn get_config(&self) -> ShortcutConfig {
        self.config.lock().clone()
    }

    pub fn disable_shortcuts(&self) -> AppResult<()> {
        log::info!("Disabling shortcuts temporarily");
        *self.enabled.lock() = false;
        self.app.global_shortcut().unregister_all()
            .map_err(|e| AppError::Shortcut(format!("Failed to disable shortcuts: {}", e)))
    }

    pub fn enable_shortcuts(&self) -> AppResult<()> {
        log::info!("Enabling shortcuts");
        *self.enabled.lock() = true;
        let config = self.get_config();
        self.register_shortcuts(&config)
    }
}

// Shortcut handlers extracted to reduce nesting
fn handle_transcription_shortcut<R: Runtime>(app: &AppHandle<R>) {
    log::debug!("Transcription shortcut triggered");
    
    // Emit event to frontend
    let _ = app.emit("shortcut_triggered", "transcription");

    log::info!("=== SHORTCUT: Toggle recording attempt ===");
    
    if let Some(recorder) = app.try_state::<Arc<AudioRecorder>>() {
        let is_recording = recorder.is_recording();
        log::info!("Current recording state: {}", is_recording);
        
        let result = if is_recording {
            log::info!("Attempting to STOP recording...");
            recorder.stop_recording()
        } else {
            log::info!("Attempting to START recording...");
            recorder.start_recording()
        };

        match result {
            Ok(()) => {
                log::info!("Successfully {} recording", if is_recording { "stopped" } else { "started" });
            }
            Err(e) => {
                log::error!("Failed to {} recording: {}", if is_recording { "stop" } else { "start" }, e);
                let _ = app.emit("recording_error", format!("{} failed: {}", if is_recording { "Stop" } else { "Start" }, e));
            }
        }
    } else {
        log::error!("Audio recorder not found in app state!");
    }
}

// Global shortcut manager state
pub type ShortcutManagerState = Arc<Mutex<ShortcutManager<tauri::Wry>>>;