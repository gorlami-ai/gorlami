use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::StreamConfig;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
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
    audio_buffer: Arc<Mutex<VecDeque<f32>>>,
    // Remove the stream storage since it's not Send/Sync safe
    stream_config: Arc<Mutex<Option<StreamConfig>>>,
}

impl SimpleAudioRecorder {
    pub fn new(app: AppHandle<tauri::Wry>) -> Self {
        Self {
            app,
            is_recording: Arc::new(Mutex::new(false)),
            selected_device: Arc::new(Mutex::new(None)),
            audio_buffer: Arc::new(Mutex::new(VecDeque::new())),
            stream_config: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start_recording(&self) -> Result<(), String> {
        let mut recording = self.is_recording.lock().unwrap();
        if *recording {
            return Err("Already recording".to_string());
        }

        // Clear the audio buffer
        {
            let mut buffer = self.audio_buffer.lock().unwrap();
            buffer.clear();
        }

        // Get the default audio host
        let host = cpal::default_host();

        // Get the default input device
        let device = host
            .default_input_device()
            .ok_or("No default input device found")?;

        // Get the default input configuration
        let config = device
            .default_input_config()
            .map_err(|e| format!("Failed to get default input config: {e}"))?;

        let sample_rate = config.sample_rate().0;
        let channels = config.channels();
        let sample_format = config.sample_format();
        let stream_config: StreamConfig = config.into();

        log::info!(
            "Recording with sample rate: {sample_rate}, channels: {channels}"
        );

        // Store config for later use
        {
            let mut stored_config = self.stream_config.lock().unwrap();
            *stored_config = Some(stream_config.clone());
        }

        // Create a buffer to hold the audio data
        let buffer = self.audio_buffer.clone();
        let app = self.app.clone();
        let is_recording = self.is_recording.clone();

        // Build the stream
        let stream = match sample_format {
            cpal::SampleFormat::F32 => {
                let app_data = app.clone();
                let app_error = app.clone();

                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        // Only process audio if we're recording
                        if !*is_recording.lock().unwrap() {
                            return;
                        }

                        let mut buffer = buffer.lock().unwrap();
                        for &sample in data {
                            buffer.push_back(sample);
                        }

                        // Keep buffer size reasonable (about 5 seconds of audio)
                        let max_buffer_size = sample_rate as usize * channels as usize * 5;
                        while buffer.len() > max_buffer_size {
                            buffer.pop_front();
                        }

                        // Stream audio data if buffer has enough samples (about 100ms worth)
                        let chunk_size = sample_rate as usize * channels as usize / 10; // 100ms
                        if buffer.len() >= chunk_size {
                            // Extract a chunk of audio
                            let mut chunk: Vec<f32> = Vec::with_capacity(chunk_size);
                            for _ in 0..chunk_size.min(buffer.len()) {
                                if let Some(sample) = buffer.pop_front() {
                                    chunk.push(sample);
                                }
                            }

                            // Convert to bytes and send to WebSocket
                            let audio_bytes: Vec<u8> = chunk
                                .iter()
                                .flat_map(|&f| f.to_le_bytes().to_vec())
                                .collect();

                            // Emit audio chunk for streaming
                            let _ = app_data.emit("audio_chunk", &audio_bytes);
                        }
                    },
                    move |err| {
                        log::error!("Audio input error: {err}");
                        let _ = app_error.emit("audio_error", err.to_string());
                    },
                    None,
                )
            }
            cpal::SampleFormat::I16 => {
                let buffer = self.audio_buffer.clone();
                let app = self.app.clone();
                let is_recording = self.is_recording.clone();
                let app_data = app.clone();
                let app_error = app.clone();

                device.build_input_stream(
                    &stream_config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        // Only process audio if we're recording
                        if !*is_recording.lock().unwrap() {
                            return;
                        }

                        let mut buffer = buffer.lock().unwrap();
                        for &sample in data {
                            buffer.push_back(sample as f32 / i16::MAX as f32);
                        }

                        // Keep buffer size reasonable
                        let max_buffer_size = sample_rate as usize * channels as usize * 5;
                        while buffer.len() > max_buffer_size {
                            buffer.pop_front();
                        }

                        // Stream audio data if buffer has enough samples (about 100ms worth)
                        let chunk_size = sample_rate as usize * channels as usize / 10; // 100ms
                        if buffer.len() >= chunk_size {
                            // Extract a chunk of audio
                            let mut chunk: Vec<f32> = Vec::with_capacity(chunk_size);
                            for _ in 0..chunk_size.min(buffer.len()) {
                                if let Some(sample) = buffer.pop_front() {
                                    chunk.push(sample);
                                }
                            }

                            // Convert to bytes and send to WebSocket
                            let audio_bytes: Vec<u8> = chunk
                                .iter()
                                .flat_map(|&f| f.to_le_bytes().to_vec())
                                .collect();

                            // Emit audio chunk for streaming
                            let _ = app_data.emit("audio_chunk", &audio_bytes);
                        }
                    },
                    move |err| {
                        log::error!("Audio input error: {err}");
                        let _ = app_error.emit("audio_error", err.to_string());
                    },
                    None,
                )
            }
            cpal::SampleFormat::U16 => {
                let buffer = self.audio_buffer.clone();
                let app = self.app.clone();
                let is_recording = self.is_recording.clone();
                let app_data = app.clone();
                let app_error = app.clone();

                device.build_input_stream(
                    &stream_config,
                    move |data: &[u16], _: &cpal::InputCallbackInfo| {
                        // Only process audio if we're recording
                        if !*is_recording.lock().unwrap() {
                            return;
                        }

                        let mut buffer = buffer.lock().unwrap();
                        for &sample in data {
                            buffer.push_back((sample as f32 / u16::MAX as f32) - 0.5);
                        }

                        // Keep buffer size reasonable
                        let max_buffer_size = sample_rate as usize * channels as usize * 5;
                        while buffer.len() > max_buffer_size {
                            buffer.pop_front();
                        }

                        // Stream audio data if buffer has enough samples (about 100ms worth)
                        let chunk_size = sample_rate as usize * channels as usize / 10; // 100ms
                        if buffer.len() >= chunk_size {
                            // Extract a chunk of audio
                            let mut chunk: Vec<f32> = Vec::with_capacity(chunk_size);
                            for _ in 0..chunk_size.min(buffer.len()) {
                                if let Some(sample) = buffer.pop_front() {
                                    chunk.push(sample);
                                }
                            }

                            // Convert to bytes and send to WebSocket
                            let audio_bytes: Vec<u8> = chunk
                                .iter()
                                .flat_map(|&f| f.to_le_bytes().to_vec())
                                .collect();

                            // Emit audio chunk for streaming
                            let _ = app_data.emit("audio_chunk", &audio_bytes);
                        }
                    },
                    move |err| {
                        log::error!("Audio input error: {err}");
                        let _ = app_error.emit("audio_error", err.to_string());
                    },
                    None,
                )
            }
            _ => {
                return Err("Unsupported sample format".to_string());
            }
        }
        .map_err(|e| format!("Failed to build input stream: {e}"))?;

        // Start the stream
        stream
            .play()
            .map_err(|e| format!("Failed to start stream: {e}"))?;

        // Set recording flag
        *recording = true;

        // Emit recording started event
        let _ = self.app.emit("recording_started", ());

        log::info!("Recording started");

        // Keep the stream alive by forgetting it (for now)
        // This is a simplified approach - in production, we'd need better stream management
        std::mem::forget(stream);

        Ok(())
    }

    pub fn stop_recording(&self) -> Result<(), String> {
        let mut recording = self.is_recording.lock().unwrap();
        if !*recording {
            return Ok(());
        }

        // Set recording flag to false
        *recording = false;

        // Get the recorded audio data
        let audio_data = self.get_audio_data();

        // Convert f32 to bytes for WebSocket transmission
        let audio_bytes: Vec<u8> = audio_data
            .iter()
            .flat_map(|&f| f.to_le_bytes().to_vec())
            .collect();

        // Emit recording stopped event with audio data
        let _ = self.app.emit("recording_stopped", &audio_bytes);

        // Send audio data to WebSocket if available
        if !audio_bytes.is_empty() {
            let _ = self.app.emit("send_audio_to_websocket", &audio_bytes);
        }

        log::info!("Recording stopped, {} bytes captured", audio_bytes.len());

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

    pub fn get_audio_data(&self) -> Vec<f32> {
        let mut buffer = self.audio_buffer.lock().unwrap();
        let data: Vec<f32> = buffer.drain(..).collect();
        data
    }
}

// Tauri commands
#[tauri::command]
pub fn get_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();
    let mut devices = Vec::new();

    // Get default input device
    let default_device = host.default_input_device();
    let default_name = default_device
        .as_ref()
        .and_then(|d| d.name().ok())
        .unwrap_or_else(|| "Default".to_string());

    // Enumerate input devices
    let input_devices = host
        .input_devices()
        .map_err(|e| format!("Failed to enumerate input devices: {e}"))?;

    for device in input_devices {
        if let Ok(name) = device.name() {
            let is_default = name == default_name;
            devices.push(AudioDevice { name, is_default });
        }
    }

    // If no devices found, add a default one
    if devices.is_empty() {
        devices.push(AudioDevice {
            name: "Default Microphone".to_string(),
            is_default: true,
        });
    }

    Ok(devices)
}

#[tauri::command]
pub fn select_audio_device(
    device_name: String,
    state: tauri::State<Arc<SimpleAudioRecorder>>,
) -> Result<(), String> {
    state.inner().select_device(&device_name)
}

#[tauri::command]
pub fn start_recording(state: tauri::State<Arc<SimpleAudioRecorder>>) -> Result<(), String> {
    state.inner().start_recording()
}

#[tauri::command]
pub fn stop_recording(state: tauri::State<Arc<SimpleAudioRecorder>>) -> Result<(), String> {
    state.inner().stop_recording()
}

#[tauri::command]
pub fn is_recording(state: tauri::State<Arc<SimpleAudioRecorder>>) -> bool {
    state.inner().is_recording()
}

#[tauri::command]
pub fn get_audio_data(state: tauri::State<Arc<SimpleAudioRecorder>>) -> Vec<f32> {
    state.inner().get_audio_data()
}
