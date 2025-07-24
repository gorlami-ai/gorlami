use crate::error::AppError;
use crate::platform::audio_permissions;
use crate::services::audio::{AudioRecorder, devices};
use std::sync::Arc;

#[tauri::command]
pub fn start_recording(state: tauri::State<Arc<AudioRecorder>>) -> Result<(), AppError> {
    state.inner().start_recording()
}

#[tauri::command]
pub fn stop_recording(state: tauri::State<Arc<AudioRecorder>>) -> Result<(), AppError> {
    state.inner().stop_recording()
}

#[tauri::command]
pub fn is_recording(state: tauri::State<Arc<AudioRecorder>>) -> bool {
    state.inner().is_recording()
}

#[tauri::command]
pub fn get_audio_pcm(state: tauri::State<Arc<AudioRecorder>>) -> Result<(Vec<u8>, u32), AppError> {
    state.inner().get_audio_pcm()
}

#[tauri::command]
pub fn get_audio_devices() -> Result<Vec<devices::AudioDevice>, AppError> {
    devices::get_audio_devices()
}

#[tauri::command]
pub fn select_audio_device(
    state: tauri::State<Arc<AudioRecorder>>,
    device_name: String,
) -> Result<(), AppError> {
    state.inner().select_device(&device_name)
}

#[tauri::command]
pub fn check_microphone_permission() -> Result<String, AppError> {
    let status = audio_permissions::check_microphone_permission();
    Ok(format!("{:?}", status))
}

#[tauri::command]
pub fn request_microphone_permission() -> Result<bool, AppError> {
    audio_permissions::request_microphone_permission()
}

#[tauri::command]
pub fn open_microphone_preferences() -> Result<(), AppError> {
    audio_permissions::open_microphone_preferences()
}