mod clipboard;
mod error_handler;
mod settings;
mod shortcuts;
mod simple_audio;
mod tray;
mod websocket;

use clipboard::{copy_to_clipboard, get_clipboard_text, paste_at_cursor};
use error_handler::{clear_error_logs, get_error_logs, report_error, ErrorHandler};
use settings::{get_app_settings, reset_app_settings, save_app_settings};
use shortcuts::{
    disable_shortcuts, enable_shortcuts, get_shortcut_config, update_shortcut_config,
    validate_shortcut, ShortcutManager, ShortcutManagerState,
};
use simple_audio::{
    get_audio_data, get_audio_devices, is_recording, select_audio_device, start_recording,
    stop_recording, SimpleAudioRecorder,
};
use std::sync::{Arc, Mutex};
use tauri::{Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use websocket::{
    connect_websocket, disconnect_websocket, get_websocket_config, get_websocket_status,
    send_audio_data, update_websocket_config, WebSocketClient,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}

#[tauri::command]
fn show_processing_overlay(app: tauri::AppHandle) -> Result<(), String> {
    // Check if overlay window already exists
    if let Some(window) = app.get_webview_window("processing_overlay") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    // Get screen dimensions to position the overlay correctly
    let physical_size = WebviewWindowBuilder::new(
        &app,
        "processing_overlay",
        WebviewUrl::App("index.html".into()),
    )
    .title("Processing")
    .inner_size(280.0, 80.0)
    .position(20.0, 60.0) // Top-right corner, below menu bar
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .initialization_script("window.__TAURI_WINDOW_LABEL__ = 'processing_overlay';")
    .build()
    .map_err(|e| format!("Failed to create processing overlay: {e}"))?;

    let _ = physical_size.set_focus();
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
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_shortcut_config,
            update_shortcut_config,
            validate_shortcut,
            disable_shortcuts,
            enable_shortcuts,
            get_audio_devices,
            select_audio_device,
            start_recording,
            stop_recording,
            is_recording,
            get_audio_data,
            connect_websocket,
            disconnect_websocket,
            get_websocket_status,
            update_websocket_config,
            get_websocket_config,
            send_audio_data,
            show_processing_overlay,
            hide_processing_overlay,
            get_app_settings,
            save_app_settings,
            reset_app_settings,
            copy_to_clipboard,
            paste_at_cursor,
            get_clipboard_text,
            get_error_logs,
            clear_error_logs,
            report_error
        ])
        .setup(|app| {
            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            // Load saved settings
            let saved_settings = settings::load_settings(app.handle());
            println!("Loaded settings: {saved_settings:?}");

            // Initialize error handler
            let _error_handler = ErrorHandler::new(app.handle().clone());

            // Create system tray
            tray::create_tray(app.handle())?;

            // Get username for the menu
            let username = whoami::username();
            tray::update_tray_status(app.handle(), &username, false)?;

            // Initialize shortcuts manager with saved settings
            let shortcut_manager = ShortcutManager::new(app.handle().clone());
            shortcut_manager.init_with_config(saved_settings.shortcuts.clone())?;

            // Store shortcut manager in app state
            let shortcut_manager_state: ShortcutManagerState =
                Arc::new(Mutex::new(shortcut_manager));
            app.manage(shortcut_manager_state);

            // Initialize audio recorder
            let audio_recorder = Arc::new(SimpleAudioRecorder::new(app.handle().clone()));

            // Set selected microphone if available
            if let Some(ref mic_name) = saved_settings.selected_microphone {
                if let Err(e) = audio_recorder.select_device(mic_name) {
                    eprintln!("Failed to select saved microphone '{mic_name}': {e}");
                }
            }

            app.manage(audio_recorder);

            // Initialize WebSocket client with saved settings
            let websocket_client = Arc::new(Mutex::new(WebSocketClient::new(app.handle().clone())));
            {
                let client = websocket_client.lock().unwrap();
                client.update_config(saved_settings.websocket.clone());
            }
            app.manage(websocket_client);

            // Listen for show processing overlay events
            let app_handle = app.handle().clone();
            app.listen("show_processing_overlay", move |_event| {
                if let Err(e) = show_processing_overlay(app_handle.clone()) {
                    eprintln!("Failed to show processing overlay: {e}");
                }
            });

            // Listen for audio streaming events
            let app_handle_audio = app.handle().clone();
            app.listen("send_audio_to_websocket", move |event| {
                if let Ok(audio_data) = serde_json::from_str::<Vec<u8>>(event.payload()) {
                    if let Some(ws_client) =
                        app_handle_audio.try_state::<websocket::WebSocketClientState>()
                    {
                        let client = ws_client.lock().unwrap();
                        if let Err(e) = client.send_audio_data(audio_data) {
                            let error_handler = ErrorHandler::new(app_handle_audio.clone());
                            error_handler.handle_websocket_error(
                                "Failed to send audio data to backend",
                                Some(&e)
                            );
                        }
                    }
                }
            });

            // Listen for real-time audio chunks
            let app_handle_chunk = app.handle().clone();
            app.listen("audio_chunk", move |event| {
                if let Ok(audio_data) = serde_json::from_str::<Vec<u8>>(event.payload()) {
                    if let Some(ws_client) =
                        app_handle_chunk.try_state::<websocket::WebSocketClientState>()
                    {
                        let client = ws_client.lock().unwrap();
                        if let Err(e) = client.send_audio_data(audio_data) {
                            let error_handler = ErrorHandler::new(app_handle_chunk.clone());
                            error_handler.handle_websocket_error(
                                "Failed to stream audio chunk to backend",
                                Some(&e)
                            );
                        }
                    }
                }
            });
            
            // Listen for WebSocket reconnection events
            let app_handle_reconnect = app.handle().clone();
            app.listen("websocket_reconnect", move |_event| {
                let app_clone = app_handle_reconnect.clone();
                tokio::spawn(async move {
                    if let Some(ws_client) = app_clone.try_state::<websocket::WebSocketClientState>() {
                        if let Err(e) = websocket::reconnect_websocket(&ws_client).await {
                            let error_handler = ErrorHandler::new(app_clone.clone());
                            error_handler.handle_websocket_error(
                                "Automatic reconnection failed",
                                Some(&e)
                            );
                        }
                    }
                });
            });

            // Listen for transcription responses and handle clipboard integration
            let app_handle_transcription = app.handle().clone();
            app.listen("transcription_response", move |event| {
                if let Ok(response) = serde_json::from_str::<websocket::TranscriptionResponse>(event.payload()) {
                    // Only handle final transcriptions with enhanced text
                    if response.is_final {
                        let text_to_paste = response.enhanced_text.unwrap_or(response.transcript);
                        let error_handler = ErrorHandler::new(app_handle_transcription.clone());
                        
                        // Paste the enhanced text at cursor position
                        if let Err(e) = paste_at_cursor(text_to_paste.clone(), app_handle_transcription.clone()) {
                            error_handler.handle_clipboard_error(
                                "Failed to paste enhanced text at cursor",
                                Some(&e)
                            );
                            
                            // Fallback: just copy to clipboard
                            if let Err(e2) = copy_to_clipboard(text_to_paste) {
                                error_handler.handle_clipboard_error(
                                    "Failed to copy enhanced text to clipboard",
                                    Some(&e2)
                                );
                            }
                        } else {
                            println!("Successfully pasted enhanced text at cursor");
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
