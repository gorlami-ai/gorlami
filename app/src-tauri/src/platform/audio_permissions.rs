use crate::error::{AppError, AppResult};
use cpal::traits::HostTrait;
use std::process::Command;

// For now, we'll use a simplified approach that checks if the app has microphone access
// by attempting to list audio devices. This avoids the complexity of Objective-C runtime.

#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum AVAuthorizationStatus {
    NotDetermined = 0,
    Authorized = 3,
}

/// Check the current microphone permission status
/// This is a simplified check that works by seeing if we can access audio devices
pub fn check_microphone_permission() -> AVAuthorizationStatus {
    // Try to get the default input device
    match cpal::default_host().default_input_device() {
        Some(_) => AVAuthorizationStatus::Authorized,
        None => {
            // If we can't get any device, assume permission is not granted
            // Note: This is a simplification - in reality, there might be no microphone
            AVAuthorizationStatus::NotDetermined
        }
    }
}

/// Request microphone permission
/// On macOS, this will trigger the system permission dialog automatically
/// when the app tries to access the microphone for the first time
pub fn request_microphone_permission() -> AppResult<bool> {
    // The actual permission request happens when we try to use the microphone
    // For now, we'll just check the current status
    let status = check_microphone_permission();
    
    match status {
        AVAuthorizationStatus::Authorized => Ok(true),
        _ => {
            // The permission dialog will be shown automatically when recording starts
            // We can't force it to show programmatically
            Ok(false)
        }
    }
}

/// Open System Preferences to the microphone privacy pane
pub fn open_microphone_preferences() -> AppResult<()> {
    Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
        .spawn()
        .map_err(|e| AppError::System(format!("Failed to open System Preferences: {}", e)))?;
    
    Ok(())
}