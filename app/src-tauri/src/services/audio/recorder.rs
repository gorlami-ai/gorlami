use crate::error::{AppError, AppResult};
use crate::platform::audio_permissions;
use crate::services::audio::ogg_opus_encoder::encode_to_ogg_opus;
use crate::services::audio::processing::{calculate_rms, convert_to_mono, resample_to_16khz};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::StreamConfig;
use parking_lot::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// Constants
const AUDIO_LEVEL_BUFFER_SIZE: usize = 1024;
const THREAD_SLEEP_MS: u64 = 100;
// Maximum recording duration: 5 minutes at 48kHz stereo
const MAX_BUFFER_SIZE: usize = 48000 * 2 * 60 * 5;

pub struct AudioRecorder {
    app: AppHandle<tauri::Wry>,
    is_recording: Arc<AtomicBool>,
    audio_state: Arc<Mutex<AudioState>>,
}

struct AudioState {
    audio_buffer: Vec<f32>,
    sample_rate: u32,
    channels: u16,
    selected_device: Option<String>,
}

impl AudioRecorder {
    pub fn new(app: AppHandle<tauri::Wry>) -> Self {
        Self {
            app,
            is_recording: Arc::new(AtomicBool::new(false)),
            audio_state: Arc::new(Mutex::new(AudioState {
                audio_buffer: Vec::new(),
                sample_rate: 48000,
                channels: 1,
                selected_device: None,
            })),
        }
    }

    pub fn start_recording(&self) -> AppResult<()> {
        // Check microphone permission first
        let permission_status = audio_permissions::check_microphone_permission();
        match permission_status {
            audio_permissions::AVAuthorizationStatus::Authorized => {
                // Permission granted, continue
            }
            audio_permissions::AVAuthorizationStatus::NotDetermined => {
                return Err(AppError::Permission(
                    "Microphone permission not yet requested. Please grant permission first.".to_string()
                ));
            }
        }
        
        // Check if already recording
        if self.is_recording.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err() {
            return Err(AppError::Recording("Already recording".to_string()));
        }

        log::info!("Starting audio recording...");

        // Clear the buffer
        let mut state = self.audio_state.lock();
        state.audio_buffer.clear();

        // Get audio device
        let host = cpal::default_host();
        let device = if let Some(device_name) = &state.selected_device {
            // Try to find the selected device
            host.input_devices()
                .ok()
                .and_then(|devices| {
                    devices
                        .filter_map(|d| d.name().ok().map(|name| (name, d)))
                        .find(|(name, _)| name == device_name)
                        .map(|(_, d)| d)
                })
                .or_else(|| host.default_input_device())
                .ok_or_else(|| AppError::Audio("Selected audio device not found".to_string()))?
        } else {
            host.default_input_device()
                .ok_or_else(|| {
                    // Check if it's a permission issue
                    let permission_status = audio_permissions::check_microphone_permission();
                    if permission_status != audio_permissions::AVAuthorizationStatus::Authorized {
                        AppError::Permission("No microphone access. Please grant permission in System Preferences.".to_string())
                    } else {
                        AppError::Audio("No default input device found. Please check your microphone connection.".to_string())
                    }
                })?
        };

        let config = device.default_input_config()?;

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
        let is_recording = self.is_recording.clone();
        let audio_state = self.audio_state.clone();
        let app = self.app.clone();

        thread::spawn(move || {
            match config.sample_format() {
                cpal::SampleFormat::F32 => {
                    run_recording::<f32>(device, stream_config, is_recording, audio_state, app, |s| s)
                }
                cpal::SampleFormat::I16 => {
                    run_recording::<i16>(device, stream_config, is_recording, audio_state, app, |s| {
                        s as f32 / i16::MAX as f32
                    })
                }
                cpal::SampleFormat::U16 => {
                    run_recording::<u16>(device, stream_config, is_recording, audio_state, app, |s| {
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

    pub fn stop_recording(&self) -> AppResult<()> {
        // Check if recording
        if self.is_recording.compare_exchange(true, false, Ordering::SeqCst, Ordering::SeqCst).is_err() {
            return Ok(());
        }

        // Wait a bit for the recording thread to finish processing
        thread::sleep(Duration::from_millis(THREAD_SLEEP_MS));

        // Emit stopped event
        let _ = self.app.emit("recording_stopped", ());

        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::SeqCst)
    }

    pub fn get_audio_opus(&self) -> AppResult<Vec<u8>> {
        let mut state = self.audio_state.lock();
        
        if state.audio_buffer.is_empty() {
            return Err(AppError::Audio("No audio data recorded".to_string()));
        }


        // Take the audio data
        let audio_data: Vec<f32> = state.audio_buffer.drain(..).collect();
        let original_sample_rate = state.sample_rate;
        let original_channels = state.channels as usize;

        // Convert to mono if needed
        let mono_samples = if original_channels > 1 {
            convert_to_mono(&audio_data, original_channels)
        } else {
            audio_data
        };

        // Resample to 16kHz for optimal speech recognition
        let resampled_samples = resample_to_16khz(&mono_samples, original_sample_rate)?;
        
        // Check if audio is too quiet
        let rms = calculate_rms(&resampled_samples);
        if rms < 0.02 {
            log::warn!("Audio level is very low (RMS: {}), transcription may fail", rms);
        }

        // Encode to Ogg Opus
        let ogg_opus_data = encode_to_ogg_opus(&resampled_samples)?;

        Ok(ogg_opus_data)
    }

    pub fn select_device(&self, device_name: &str) -> AppResult<()> {
        if self.is_recording() {
            return Err(AppError::Recording("Cannot change device while recording".to_string()));
        }

        let mut state = self.audio_state.lock();
        state.selected_device = Some(device_name.to_string());
        log::info!("Selected audio device: {}", device_name);
        Ok(())
    }
}


fn run_recording<T>(
    device: cpal::Device,
    config: StreamConfig,
    is_recording: Arc<AtomicBool>,
    audio_state: Arc<Mutex<AudioState>>,
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

    let stream = match device.build_input_stream(
        &config,
        move |data: &[T], _: &cpal::InputCallbackInfo| {
            let samples: Vec<f32> = data.iter().map(|&s| convert(s)).collect();
            let _ = tx.send(samples);
        },
        err_fn,
        None,
    ) {
        Ok(stream) => stream,
        Err(e) => {
            log::error!("Failed to build audio stream: {}", e);
            let _ = app.emit("recording_error", format!("Failed to start recording: {}", e));
            return;
        }
    };

    if let Err(e) = stream.play() {
        log::error!("Failed to start audio stream: {}", e);
        let _ = app.emit("recording_error", format!("Failed to start recording: {}", e));
        return;
    }

    // Process audio in chunks
    while is_recording.load(Ordering::SeqCst) {
        match rx.recv_timeout(Duration::from_millis(THREAD_SLEEP_MS)) {
            Ok(samples) => {
                let mut state = audio_state.lock();
                
                // Check buffer size limit
                if state.audio_buffer.len() + samples.len() > MAX_BUFFER_SIZE {
                    log::warn!("Audio buffer full, stopping recording");
                    is_recording.store(false, Ordering::SeqCst);
                    let _ = app.emit("recording_error", "Recording stopped: Maximum duration reached");
                    break;
                }
                
                state.audio_buffer.extend(samples);

                // Emit audio level for UI feedback
                if state.audio_buffer.len() > AUDIO_LEVEL_BUFFER_SIZE {
                    let recent_samples: Vec<f32> = state.audio_buffer
                        .iter()
                        .rev()
                        .take(AUDIO_LEVEL_BUFFER_SIZE)
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