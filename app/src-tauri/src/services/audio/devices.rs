use crate::error::AppResult;
use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
}

/// Get available audio input devices
pub fn get_audio_devices() -> AppResult<Vec<AudioDevice>> {
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