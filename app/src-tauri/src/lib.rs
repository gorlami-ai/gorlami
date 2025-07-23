#![allow(clippy::uninlined_format_args)]

mod commands;
mod error;
mod platform;
mod services;
mod ui;

use parking_lot::Mutex;
use services::audio::AudioRecorder;
use services::error_handler::init_error_storage;
use services::shortcuts_manager::{ShortcutManager, ShortcutManagerState};
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger with environment-based configuration
    let log_level = if cfg!(debug_assertions) {
        "debug"
    } else {
        "info"
    };

    std::env::set_var(
        "RUST_LOG",
        std::env::var("RUST_LOG")
            .unwrap_or_else(|_| format!("gorlami={log_level},tauri={log_level}")),
    );

    env_logger::init();
    log::info!("Starting Gorlami application");
    log::debug!("Debug logging enabled");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            // Audio commands
            commands::audio::start_recording,
            commands::audio::stop_recording,
            commands::audio::is_recording,
            commands::audio::get_audio_pcm,
            commands::audio::get_audio_devices,
            commands::audio::select_audio_device,
            // Shortcut commands
            commands::shortcuts::get_shortcut_config,
            commands::shortcuts::update_shortcut_config,
            commands::shortcuts::validate_shortcut,
            commands::shortcuts::disable_shortcuts,
            commands::shortcuts::enable_shortcuts,
            // Window commands
            commands::window::show_processing_overlay,
            commands::window::hide_processing_overlay,
            // Settings commands
            commands::settings::get_app_settings,
            commands::settings::save_app_settings,
            commands::settings::reset_app_settings,
            // Clipboard commands
            commands::clipboard::copy_to_clipboard,
            commands::clipboard::paste_at_cursor,
            commands::clipboard::get_clipboard_text,
            commands::clipboard::get_selected_text,
            // Error logging commands
            services::error_handler::get_error_logs,
            services::error_handler::clear_error_logs,
            services::error_handler::report_error,
            // Update commands
            commands::updater::check_for_updates,
            commands::updater::download_and_install_update,
            commands::updater::get_update_info,
            commands::updater::check_and_prompt_for_update
        ])
        .setup(|app| {
            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Load saved settings
            let saved_settings = commands::settings::load_settings(app.handle());
            log::info!("Loaded settings");

            // Initialize error log storage
            init_error_storage(app.handle());

            // Create system tray
            ui::tray::create_tray(app.handle())?;

            // Initialize shortcuts manager with saved settings
            let shortcut_manager = ShortcutManager::new(app.handle().clone());
            shortcut_manager
                .init_with_config(saved_settings.shortcuts.clone())
                .map_err(|e| tauri::Error::Anyhow(anyhow::anyhow!("{}", e)))?;

            // Store shortcut manager in app state
            let shortcut_manager_state: ShortcutManagerState = Arc::new(Mutex::new(shortcut_manager));
            app.manage(shortcut_manager_state);

            // Initialize audio recorder
            let audio_recorder = Arc::new(AudioRecorder::new(app.handle().clone()));
            
            // Apply saved microphone selection
            if let Some(device_name) = saved_settings.selected_microphone {
                if let Err(e) = audio_recorder.select_device(&device_name) {
                    log::warn!("Failed to select saved audio device '{}': {}", device_name, e);
                }
            }
            
            app.manage(audio_recorder);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}