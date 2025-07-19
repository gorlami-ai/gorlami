use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, Stream, StreamConfig};
use serde::{Deserialize, Serialize};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
}

pub struct AudioRecorder {
    app: AppHandle<tauri::Wry>,
    current_device: Option<Device>,
    stream: Option<Stream>,
    is_recording: Arc<Mutex<bool>>,
    audio_sender: Option<Sender<Vec<f32>>>,
}

impl AudioRecorder {
    pub fn new(app: AppHandle<tauri::Wry>) -> Self {
        Self {
            app,
            current_device: None,
            stream: None,
            is_recording: Arc::new(Mutex::new(false)),
            audio_sender: None,
        }
    }

    pub fn get_input_devices() -> Result<Vec<AudioDevice>, String> {
        let host = cpal::default_host();
        let default_device = host
            .default_input_device()
            .ok_or_else(|| "No default input device found".to_string())?;
        let default_name = default_device
            .name()
            .unwrap_or_else(|_| "Unknown".to_string());

        let mut devices = vec![];
        
        // Get all input devices
        match host.input_devices() {
            Ok(input_devices) => {
                for device in input_devices {
                    if let Ok(name) = device.name() {
                        devices.push(AudioDevice {
                            name: name.clone(),
                            is_default: name == default_name,
                        });
                    }
                }
            }
            Err(e) => return Err(format!("Failed to get input devices: {}", e)),
        }

        Ok(devices)
    }

    pub fn select_device(&mut self, device_name: &str) -> Result<(), String> {
        let host = cpal::default_host();
        
        // Find the device by name
        match host.input_devices() {
            Ok(mut devices) => {
                self.current_device = devices.find(|d| {
                    d.name().map(|n| n == device_name).unwrap_or(false)
                });
                
                if self.current_device.is_none() {
                    return Err(format!("Device '{}' not found", device_name));
                }
                
                Ok(())
            }
            Err(e) => Err(format!("Failed to enumerate devices: {}", e)),
        }
    }

    pub fn start_recording(&mut self) -> Result<Receiver<Vec<f32>>, String> {
        if *self.is_recording.lock().unwrap() {
            return Err("Already recording".to_string());
        }

        let device = if let Some(ref device) = self.current_device {
            device
        } else {
            // Use default device if none selected
            let host = cpal::default_host();
            self.current_device = host.default_input_device();
            self.current_device
                .as_ref()
                .ok_or_else(|| "No input device available".to_string())?
        };

        let config = device
            .default_input_config()
            .map_err(|e| format!("Failed to get default config: {}", e))?;

        let (sender, receiver) = channel::<Vec<f32>>();
        self.audio_sender = Some(sender.clone());

        let is_recording = self.is_recording.clone();
        let app = self.app.clone();

        let stream = match config.sample_format() {
            SampleFormat::F32 => self.build_input_stream::<f32>(device, &config.into(), sender)?,
            SampleFormat::I16 => self.build_input_stream::<i16>(device, &config.into(), sender)?,
            SampleFormat::U16 => self.build_input_stream::<u16>(device, &config.into(), sender)?,
            _ => return Err("Unsupported sample format".to_string()),
        };

        stream
            .play()
            .map_err(|e| format!("Failed to start stream: {}", e))?;

        self.stream = Some(stream);
        *is_recording.lock().unwrap() = true;

        // Emit recording started event
        let _ = app.emit("recording_started", ());

        Ok(receiver)
    }

    pub fn stop_recording(&mut self) -> Result<(), String> {
        if !*self.is_recording.lock().unwrap() {
            return Ok(());
        }

        if let Some(stream) = self.stream.take() {
            stream
                .pause()
                .map_err(|e| format!("Failed to stop stream: {}", e))?;
        }

        *self.is_recording.lock().unwrap() = false;
        self.audio_sender = None;

        // Emit recording stopped event
        let _ = self.app.emit("recording_stopped", ());

        Ok(())
    }

    pub fn is_recording(&self) -> bool {
        *self.is_recording.lock().unwrap()
    }

    fn build_input_stream<T>(
        &self,
        device: &Device,
        config: &StreamConfig,
        sender: Sender<Vec<f32>>,
    ) -> Result<Stream, String>
    where
        T: cpal::Sample + cpal::SizedSample + Send + 'static,
    {
        let err_fn = |err| log::error!("Stream error: {}", err);

        let stream = device
            .build_input_stream(
                config,
                move |data: &[T], _: &cpal::InputCallbackInfo| {
                    let samples: Vec<f32> = data
                        .iter()
                        .map(|s| cpal::Sample::to_sample::<f32>(*s))
                        .collect();
                    
                    // Send audio data through channel
                    let _ = sender.send(samples);
                },
                err_fn,
                None,
            )
            .map_err(|e| format!("Failed to build input stream: {}", e))?;

        Ok(stream)
    }
}

// Tauri commands
#[tauri::command]
pub fn get_audio_devices() -> Result<Vec<AudioDevice>, String> {
    AudioRecorder::get_input_devices()
}

#[tauri::command]
pub fn select_audio_device(
    device_name: String,
    state: tauri::State<Arc<Mutex<AudioRecorder>>>,
) -> Result<(), String> {
    let mut recorder = state.lock().unwrap();
    recorder.select_device(&device_name)
}

#[tauri::command]
pub fn start_recording(
    state: tauri::State<Arc<Mutex<AudioRecorder>>>,
) -> Result<(), String> {
    let mut recorder = state.lock().unwrap();
    let receiver = recorder.start_recording()?;
    
    // TODO: Handle audio data from receiver
    // For now, we'll just consume it to prevent blocking
    std::thread::spawn(move || {
        while let Ok(samples) = receiver.recv() {
            // Audio data received, will be sent to WebSocket later
            log::debug!("Received {} audio samples", samples.len());
        }
    });
    
    Ok(())
}

#[tauri::command]
pub fn stop_recording(
    state: tauri::State<Arc<Mutex<AudioRecorder>>>,
) -> Result<(), String> {
    let mut recorder = state.lock().unwrap();
    recorder.stop_recording()
}

#[tauri::command]
pub fn is_recording(
    state: tauri::State<Arc<Mutex<AudioRecorder>>>,
) -> bool {
    let recorder = state.lock().unwrap();
    recorder.is_recording()
}