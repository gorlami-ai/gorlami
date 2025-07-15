mod shortcuts;
mod simple_audio;
mod tray;

use shortcuts::{get_shortcut_config, update_shortcut_config, ShortcutManager};
use simple_audio::{
    get_audio_devices, is_recording, select_audio_device, start_recording, stop_recording,
    SimpleAudioRecorder,
};
use std::sync::Arc;
use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
            get_audio_devices,
            select_audio_device,
            start_recording,
            stop_recording,
            is_recording
        ])
        .setup(|app| {
            // Hide dock icon on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
            
            // Create system tray
            tray::create_tray(app.handle())?;
            
            // Get username for the menu
            let username = whoami::username();
            tray::update_tray_status(app.handle(), &username, false)?;
            
            // Initialize shortcuts
            let shortcut_manager = ShortcutManager::new(app.handle().clone());
            shortcut_manager.init()?;
            
            // Initialize audio recorder
            let audio_recorder = Arc::new(SimpleAudioRecorder::new(app.handle().clone()));
            app.manage(audio_recorder);
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}