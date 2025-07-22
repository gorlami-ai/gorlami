use crate::error::AppError;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

const MAX_ERROR_LOGS: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorType {
    Audio,
    Settings,
    Clipboard,
    Shortcuts,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorLog {
    pub error_type: ErrorType,
    pub title: String,
    pub message: String,
    pub details: Option<String>,
    pub timestamp: u64,
    pub recoverable: bool,
}

// Global error log storage
pub struct ErrorLogStorage {
    logs: VecDeque<ErrorLog>,
}

impl ErrorLogStorage {
    pub fn new() -> Self {
        Self {
            logs: VecDeque::with_capacity(MAX_ERROR_LOGS),
        }
    }

    pub fn add_log(&mut self, log: ErrorLog) {
        // Remove oldest log if at capacity
        if self.logs.len() >= MAX_ERROR_LOGS {
            self.logs.pop_front();
        }
        self.logs.push_back(log);
    }

    pub fn get_logs(&self) -> Vec<ErrorLog> {
        self.logs.iter().cloned().collect()
    }

    pub fn clear_logs(&mut self) {
        self.logs.clear();
    }
}

pub type ErrorLogState = Arc<Mutex<ErrorLogStorage>>;

// Initialize error log storage in app state
pub fn init_error_storage(app: &AppHandle) {
    let storage = Arc::new(Mutex::new(ErrorLogStorage::new()));
    app.manage(storage);
}

// Tauri commands for error handling
#[tauri::command]
pub fn get_error_logs(state: tauri::State<ErrorLogState>) -> Result<Vec<ErrorLog>, AppError> {
    Ok(state.lock().get_logs())
}

#[tauri::command]
pub fn clear_error_logs(state: tauri::State<ErrorLogState>) -> Result<(), AppError> {
    state.lock().clear_logs();
    Ok(())
}

#[tauri::command]
pub fn report_error(
    error: ErrorLog, 
    app: AppHandle<tauri::Wry>,
    state: tauri::State<ErrorLogState>
) -> Result<(), AppError> {
    // Log the error
    log::error!("Error reported: {:?}", error);
    
    // Store in error log
    state.lock().add_log(error.clone());
    
    // Emit error event for UI to handle
    let _ = app.emit("app_error", &error);
    
    // Show system notification for critical errors
    if !error.recoverable {
        let _ = app.emit("critical_error", &error);
    }
    
    Ok(())
}