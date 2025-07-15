use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
}

pub struct SimpleAudioRecorder {
    app: AppHandle<tauri::Wry>,
    is_recording: Arc<Mutex<bool>>,
    selected_device: Arc<Mutex<Option<String>>>,
}

impl SimpleAudioRecorder {
    pub fn new(app: AppHandle<tauri::Wry>) -> Self {
        Self {
            app,
            is_recording: Arc::new(Mutex::new(false)),
            selected_device: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start_recording(&self) -> Result<(), String> {
        let mut recording = self.is_recording.lock().unwrap();
        if *recording {
            return Err("Already recording".to_string());
        }
        
        *recording = true;
        
        // Emit recording started event
        let _ = self.app.emit("recording_started", ());
        
        // TODO: Implement actual audio recording
        println!("Recording started");
        
        Ok(())
    }

    pub fn stop_recording(&self) -> Result<(), String> {
        let mut recording = self.is_recording.lock().unwrap();
        if !*recording {
            return Ok(());
        }
        
        *recording = false;
        
        // Emit recording stopped event
        let _ = self.app.emit("recording_stopped", ());
        
        // TODO: Stop actual audio recording
        println!("Recording stopped");
        
        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }

    pub fn select_device(&self, device_name: &str) -> Result<(), String> {
        let mut selected = self.selected_device.lock().unwrap();
        *selected = Some(device_name.to_string());
        Ok(())
    }
}

// Tauri commands
#[tauri::command]
pub fn get_audio_devices() -> Result<Vec<AudioDevice>, String> {
    // For now, return mock devices
    Ok(vec![
        AudioDevice {
            name: "Default Microphone".to_string(),
            is_default: true,
        },
        AudioDevice {
            name: "Built-in Microphone".to_string(),
            is_default: false,
        },
    ])
}

#[tauri::command]
pub fn select_audio_device(
    device_name: String,
    state: tauri::State<Arc<SimpleAudioRecorder>>,
) -> Result<(), String> {
    state.select_device(&device_name)
}

#[tauri::command]
pub fn start_recording(
    state: tauri::State<Arc<SimpleAudioRecorder>>,
) -> Result<(), String> {
    state.start_recording()
}

#[tauri::command]
pub fn stop_recording(
    state: tauri::State<Arc<SimpleAudioRecorder>>,
) -> Result<(), String> {
    state.stop_recording()
}

#[tauri::command]
pub fn is_recording(
    state: tauri::State<Arc<SimpleAudioRecorder>>,
) -> bool {
    state.is_recording()
}