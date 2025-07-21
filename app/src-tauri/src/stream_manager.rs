use std::sync::Mutex;
use once_cell::sync::Lazy;

// Simple flag to track recording state since we can't store the stream itself
static IS_RECORDING: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

pub fn set_recording(recording: bool) {
    let mut guard = IS_RECORDING.lock().unwrap();
    *guard = recording;
}