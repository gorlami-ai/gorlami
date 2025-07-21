use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::StreamConfig;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct AudioRecorder {
    app: AppHandle<tauri::Wry>,
    recording_state: Arc<Mutex<RecordingState>>,
}

struct RecordingState {
    is_recording: bool,
    audio_buffer: Vec<f32>,
    sample_rate: u32,
    channels: u16,
}


impl AudioRecorder {
    pub fn new(app: AppHandle<tauri::Wry>) -> Self {
        Self {
            app,
            recording_state: Arc::new(Mutex::new(RecordingState {
                is_recording: false,
                audio_buffer: Vec::new(),
                sample_rate: 48000,
                channels: 1,
            })),
        }
    }

    pub fn start_recording(&self) -> Result<(), String> {
        let mut state = self.recording_state.lock().unwrap();
        if state.is_recording {
            return Err("Already recording".to_string());
        }

        log::info!("Starting audio recording...");

        // Clear the buffer
        state.audio_buffer.clear();
        state.is_recording = true;

        // Get audio device
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or("No default input device found")?;

        let config = device
            .default_input_config()
            .map_err(|e| format!("Failed to get input config: {e}"))?;

        state.sample_rate = config.sample_rate().0;
        state.channels = config.channels();

        let stream_config: StreamConfig = config.clone().into();

        log::info!(
            "Recording config: {} Hz, {} channels, format: {:?}",
            state.sample_rate,
            state.channels,
            config.sample_format()
        );

        // Create audio processing thread
        let recording_state = self.recording_state.clone();
        let app = self.app.clone();

        thread::spawn(move || {
            match config.sample_format() {
                cpal::SampleFormat::F32 => {
                    run_recording::<f32>(device, stream_config, recording_state, app, |s| s)
                }
                cpal::SampleFormat::I16 => {
                    run_recording::<i16>(device, stream_config, recording_state, app, |s| {
                        s as f32 / i16::MAX as f32
                    })
                }
                cpal::SampleFormat::U16 => {
                    run_recording::<u16>(device, stream_config, recording_state, app, |s| {
                        (s as f32 / u16::MAX as f32) * 2.0 - 1.0
                    })
                }
                _ => {
                    log::error!("Unsupported sample format");
                }
            }
        });

        // Emit recording started event
        let _ = self.app.emit("recording_started", ());
        Ok(())
    }

    pub fn stop_recording(&self) -> Result<(), String> {
        let mut state = self.recording_state.lock().unwrap();
        if !state.is_recording {
            return Ok(());
        }

        log::info!("Stopping recording...");
        state.is_recording = false;

        // Wait a bit for the recording thread to finish processing
        drop(state);
        thread::sleep(Duration::from_millis(100));

        // Emit stopped event
        let _ = self.app.emit("recording_stopped", ());

        let state = self.recording_state.lock().unwrap();
        log::info!("Recording stopped, {} samples captured", state.audio_buffer.len());

        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        self.recording_state.lock().unwrap().is_recording
    }

    pub fn get_audio_pcm(&self) -> Result<(Vec<u8>, u32), String> {
        let mut state = self.recording_state.lock().unwrap();
        
        if state.audio_buffer.is_empty() {
            return Err("No audio data recorded".to_string());
        }

        log::info!(
            "Processing {} samples at {} Hz",
            state.audio_buffer.len(),
            state.sample_rate
        );

        // Take the audio data
        let audio_data: Vec<f32> = state.audio_buffer.drain(..).collect();
        let original_sample_rate = state.sample_rate;
        let original_channels = state.channels as usize;

        // Convert to mono if needed
        let mono_samples = if original_channels > 1 {
            audio_data
                .chunks(original_channels)
                .map(|chunk| chunk.iter().sum::<f32>() / original_channels as f32)
                .collect()
        } else {
            audio_data
        };

        // Resample to 16kHz if needed
        const TARGET_SAMPLE_RATE: u32 = 16000;
        let resampled = if original_sample_rate != TARGET_SAMPLE_RATE {
            resample_audio(&mono_samples, original_sample_rate, TARGET_SAMPLE_RATE)
        } else {
            mono_samples
        };

        // Convert to 16-bit PCM
        let pcm_bytes: Vec<u8> = resampled
            .iter()
            .flat_map(|&sample| {
                let clamped = sample.clamp(-1.0, 1.0);
                let i16_sample = (clamped * 32767.0) as i16;
                i16_sample.to_le_bytes().to_vec()
            })
            .collect();

        log::info!("Converted to {} bytes of PCM data", pcm_bytes.len());

        Ok((pcm_bytes, TARGET_SAMPLE_RATE))
    }
}

fn run_recording<T>(
    device: cpal::Device,
    config: StreamConfig,
    recording_state: Arc<Mutex<RecordingState>>,
    app: AppHandle<tauri::Wry>,
    convert: impl Fn(T) -> f32 + Send + 'static,
) where
    T: cpal::Sample + cpal::SizedSample + Send + 'static,
{
    let (tx, rx): (Sender<Vec<f32>>, Receiver<Vec<f32>>) = channel();
    
    let err_fn = {
        let app = app.clone();
        move |err| {
            log::error!("Audio stream error: {err}");
            let _ = app.emit("recording_error", format!("Audio error: {err}"));
        }
    };

    let stream = device
        .build_input_stream(
            &config,
            move |data: &[T], _: &cpal::InputCallbackInfo| {
                let samples: Vec<f32> = data.iter().map(|&s| convert(s)).collect();
                let _ = tx.send(samples);
            },
            err_fn,
            None,
        )
        .unwrap();

    stream.play().unwrap();

    // Process audio in chunks
    while recording_state.lock().unwrap().is_recording {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(samples) => {
                let mut state = recording_state.lock().unwrap();
                state.audio_buffer.extend(samples);

                // Emit audio level for UI feedback
                if state.audio_buffer.len() > 1024 {
                    let recent_samples: Vec<f32> = state.audio_buffer
                        .iter()
                        .rev()
                        .take(1024)
                        .cloned()
                        .collect();
                    let rms = calculate_rms(&recent_samples);
                    let _ = app.emit("audio_level", rms);
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                // Continue waiting
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                log::error!("Audio channel disconnected");
                break;
            }
        }
    }

    // Properly stop and drop the stream
    drop(stream);
    log::info!("Audio stream properly closed");
}

fn resample_audio(input: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    let ratio = from_rate as f32 / to_rate as f32;
    let new_length = (input.len() as f32 / ratio) as usize;
    let mut output = Vec::with_capacity(new_length);

    for i in 0..new_length {
        let src_index = i as f32 * ratio;
        let index = src_index as usize;
        let fraction = src_index - index as f32;

        if index + 1 < input.len() {
            let sample = input[index] * (1.0 - fraction) + input[index + 1] * fraction;
            output.push(sample);
        } else if index < input.len() {
            output.push(input[index]);
        }
    }

    output
}

fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum_of_squares: f32 = samples.iter().map(|&s| s * s).sum();
    (sum_of_squares / samples.len() as f32).sqrt()
}

// Tauri commands
#[tauri::command]
pub fn start_recording(state: tauri::State<Arc<AudioRecorder>>) -> Result<(), String> {
    state.inner().start_recording()
}

#[tauri::command]
pub fn stop_recording(state: tauri::State<Arc<AudioRecorder>>) -> Result<(), String> {
    state.inner().stop_recording()
}

#[tauri::command]
pub fn is_recording(state: tauri::State<Arc<AudioRecorder>>) -> bool {
    state.inner().is_recording()
}

#[tauri::command]
pub fn get_audio_pcm(state: tauri::State<Arc<AudioRecorder>>) -> Result<(Vec<u8>, u32), String> {
    state.inner().get_audio_pcm()
}

// Simple struct for audio devices
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
}

// Get available audio devices
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
    if let Ok(input_devices) = host.input_devices() {
        for device in input_devices {
            if let Ok(name) = device.name() {
                let is_default = name == default_name;
                devices.push(AudioDevice { name, is_default });
            }
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