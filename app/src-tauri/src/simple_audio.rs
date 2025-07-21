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
            log::warn!("Attempted to start recording while already recording");
            return Err("Already recording".to_string());
        }
        
        log::info!("Starting audio recording...");

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

                            // Convert to bytes
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

                            // Convert to bytes
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

                            // Convert to bytes
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

        // Mark as recording in our global state
        crate::stream_manager::set_recording(true);
        
        // Keep the stream alive by forgetting it
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
        
        // Mark as not recording
        crate::stream_manager::set_recording(false);

        // Don't drain the buffer here - let get_audio_pcm handle it
        // Just check the buffer size for logging
        let buffer_size = {
            let buffer = self.audio_buffer.lock().unwrap();
            buffer.len()
        };

        // Emit recording stopped event
        let _ = self.app.emit("recording_stopped", ());

        log::info!("Recording stopped, {buffer_size} samples in buffer");

        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        let is_recording = *self.is_recording.lock().unwrap();
        log::debug!("is_recording() called, returning: {is_recording}");
        is_recording
    }

    pub fn select_device(&self, device_name: &str) -> Result<(), String> {
        let mut selected = self.selected_device.lock().unwrap();
        *selected = Some(device_name.to_string());
        Ok(())
    }

    pub fn get_audio_data(&self) -> Vec<f32> {
        let buffer = self.audio_buffer.lock().unwrap();
        // Return a clone of the data without draining
        buffer.iter().cloned().collect()
    }

    pub fn get_audio_pcm(&self) -> Result<(Vec<u8>, u32), String> {
        // Drain the buffer when getting PCM data
        let mut buffer = self.audio_buffer.lock().unwrap();
        let audio_data: Vec<f32> = buffer.drain(..).collect();
        
        if audio_data.is_empty() {
            return Err("No audio data recorded".to_string());
        }
        
        log::info!("Converting {} samples to PCM", audio_data.len());

        // Store original length for logging
        let original_length = audio_data.len();

        // Get the original config
        let config = self.stream_config.lock().unwrap();
        let config = config.as_ref().ok_or("No stream config available")?;
        
        let original_sample_rate = config.sample_rate.0;
        let original_channels = config.channels as usize;
        
        // Target format: 16kHz, mono, 16-bit PCM
        const TARGET_SAMPLE_RATE: u32 = 16000;
        
        // Convert to mono if stereo
        let mono_samples = if original_channels > 1 {
            // Mix down to mono by averaging channels
            audio_data
                .chunks(original_channels)
                .map(|chunk| chunk.iter().sum::<f32>() / original_channels as f32)
                .collect::<Vec<f32>>()
        } else {
            audio_data
        };
        
        // Downsample if needed
        let resampled = if original_sample_rate != TARGET_SAMPLE_RATE {
            // Simple linear interpolation resampling
            let ratio = original_sample_rate as f32 / TARGET_SAMPLE_RATE as f32;
            let new_length = (mono_samples.len() as f32 / ratio) as usize;
            let mut resampled = Vec::with_capacity(new_length);
            
            for i in 0..new_length {
                let src_index = i as f32 * ratio;
                let index = src_index as usize;
                let fraction = src_index - index as f32;
                
                if index + 1 < mono_samples.len() {
                    // Linear interpolation
                    let sample = mono_samples[index] * (1.0 - fraction) 
                        + mono_samples[index + 1] * fraction;
                    resampled.push(sample);
                } else if index < mono_samples.len() {
                    resampled.push(mono_samples[index]);
                }
            }
            resampled
        } else {
            mono_samples
        };
        
        // Convert f32 samples to 16-bit PCM
        let pcm_bytes: Vec<u8> = resampled
            .iter()
            .flat_map(|&sample| {
                // Clamp to [-1, 1] range
                let clamped = sample.clamp(-1.0, 1.0);
                // Convert to i16
                let i16_sample = (clamped * 32767.0) as i16;
                // Convert to little-endian bytes
                i16_sample.to_le_bytes().to_vec()
            })
            .collect();
        
        log::info!(
            "Converted audio: {} Hz {} ch → {} Hz mono, {} samples → {} bytes",
            original_sample_rate,
            original_channels,
            TARGET_SAMPLE_RATE,
            original_length,
            pcm_bytes.len()
        );
        
        Ok((pcm_bytes, TARGET_SAMPLE_RATE))
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

#[tauri::command]
pub fn get_audio_pcm(state: tauri::State<Arc<SimpleAudioRecorder>>) -> Result<(Vec<u8>, u32), String> {
    state.inner().get_audio_pcm()
}
