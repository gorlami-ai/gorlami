mod audio_recorder;
mod clipboard;
mod error_handler;
mod settings;
mod shortcuts;
mod tray;
mod updater;

use clipboard::{copy_to_clipboard, get_clipboard_text, get_selected_text, paste_at_cursor};
use error_handler::{clear_error_logs, get_error_logs, report_error, ErrorHandler};
use settings::{get_app_settings, reset_app_settings, save_app_settings};
use audio_recorder::{
    get_audio_pcm, is_recording, start_recording, stop_recording, AudioRecorder,
};
use shortcuts::{
    disable_shortcuts, enable_shortcuts, get_shortcut_config, update_shortcut_config,
    validate_shortcut, ShortcutManager, ShortcutManagerState,
};
use std::sync::{Arc, Mutex};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use updater::{
    check_for_updates, download_and_install_update, get_update_info, check_and_prompt_for_update,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[tauri::command]
fn show_processing_overlay(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("show_processing_overlay called");
    
    // Check if overlay window already exists
    if let Some(window) = app.get_webview_window("processing_overlay") {
        log::info!("Found existing overlay window, showing it");
        // Make sure window is visible and on top
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_always_on_top(true);
        // Don't set focus to avoid stealing from user's current app
        return Ok(());
    }
    
    log::info!("Creating new overlay window");

    // Get the primary monitor to calculate position
    let monitor = app.primary_monitor().map_err(|e| format!("Failed to get primary monitor: {e}"))?;
    let monitor = monitor.ok_or("No primary monitor found")?;
    let screen_size = monitor.size();
    
    // Calculate position for top-right corner (20px margin from right, 60px from top)
    let window_width = 140.0;
    let x_position = (screen_size.width as f64) - window_width - 20.0;
    let y_position = 60.0;
    
    log::info!("Window position: x={x_position}, y={y_position}");
    
    let _window = WebviewWindowBuilder::new(
        &app,
        "processing_overlay",
        WebviewUrl::App("index.html".into()),
    )
    .title("Processing")
    .inner_size(window_width, 120.0)
    .position(x_position, y_position) // Top-right corner, below menu bar
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .initialization_script("window.__TAURI_WINDOW_LABEL__ = 'processing_overlay';")
    .build()
    .map_err(|e| {
        log::error!("Failed to create overlay window: {e}");
        format!("Failed to create processing overlay: {e}")
    })?;
    
    log::info!("Overlay window created successfully");

    // Don't set focus - let the overlay stay in background
    // This prevents stealing focus from user's current app
    Ok(())
}

#[tauri::command]
fn hide_processing_overlay(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("processing_overlay") {
        let _ = window.hide();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger with environment-based configuration
    let log_level = if cfg!(debug_assertions) {
        "debug"
    } else {
        "info"
    };
    
    std::env::set_var("RUST_LOG", 
        std::env::var("RUST_LOG")
            .unwrap_or_else(|_| format!("gorlami={log_level},tauri={log_level}"))
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
            greet,
            get_shortcut_config,
            update_shortcut_config,
            validate_shortcut,
            disable_shortcuts,
            enable_shortcuts,
            start_recording,
            stop_recording,
            is_recording,
            get_audio_pcm,
            show_processing_overlay,
            hide_processing_overlay,
            get_app_settings,
            save_app_settings,
            reset_app_settings,
            copy_to_clipboard,
            paste_at_cursor,
            get_clipboard_text,
            get_selected_text,
            get_error_logs,
            clear_error_logs,
            report_error,
            check_for_updates,
            download_and_install_update,
            get_update_info,
            check_and_prompt_for_update
        ])
        .setup(|app| {
            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Load saved settings
            let saved_settings = settings::load_settings(app.handle());
            log::info!("Loaded settings");

            // Initialize error handler
            let _error_handler = ErrorHandler::new(app.handle().clone());

            // Create system tray
            tray::create_tray(app.handle())?;

            // Initialize shortcuts manager with saved settings
            let shortcut_manager = ShortcutManager::new(app.handle().clone());
            shortcut_manager.init_with_config(saved_settings.shortcuts.clone())?;

            // Store shortcut manager in app state
            let shortcut_manager_state: ShortcutManagerState =
                Arc::new(Mutex::new(shortcut_manager));
            app.manage(shortcut_manager_state);

            // Initialize audio recorder
            let audio_recorder = Arc::new(AudioRecorder::new(app.handle().clone()));
            app.manage(audio_recorder);

            // Removed overlay window handling - keeping it simple

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
