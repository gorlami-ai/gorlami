use serde::{Deserialize, Serialize};
use std::fmt;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorType {
    Audio,
    WebSocket,
    Settings,
    Clipboard,
    Shortcuts,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    pub error_type: ErrorType,
    pub title: String,
    pub message: String,
    pub details: Option<String>,
    pub timestamp: u64,
    pub recoverable: bool,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "[{:?}] {}: {}",
            self.error_type, self.title, self.message
        )
    }
}

impl AppError {
    pub fn new(error_type: ErrorType, title: &str, message: &str) -> Self {
        Self {
            error_type,
            title: title.to_string(),
            message: message.to_string(),
            details: None,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            recoverable: true,
        }
    }

    pub fn with_details(mut self, details: &str) -> Self {
        self.details = Some(details.to_string());
        self
    }

    #[allow(dead_code)]
    pub fn unrecoverable(mut self) -> Self {
        self.recoverable = false;
        self
    }
}

pub struct ErrorHandler {
    app: AppHandle<tauri::Wry>,
}

impl ErrorHandler {
    pub fn new(app: AppHandle<tauri::Wry>) -> Self {
        Self { app }
    }

    pub fn handle_error(&self, error: AppError) {
        // Log the error
        log::error!("Error: {error}");

        // Emit error event for UI to handle
        let _ = self.app.emit("app_error", &error);

        // Show system notification for critical errors
        if !error.recoverable {
            self.show_critical_error_notification(&error);
        }
    }

    pub fn handle_websocket_error(&self, message: &str, details: Option<&str>) {
        let mut error = AppError::new(ErrorType::WebSocket, "Connection Error", message);

        if let Some(details) = details {
            error = error.with_details(details);
        }

        self.handle_error(error);
    }

    pub fn handle_clipboard_error(&self, message: &str, details: Option<&str>) {
        let mut error = AppError::new(ErrorType::Clipboard, "Clipboard Error", message);

        if let Some(details) = details {
            error = error.with_details(details);
        }

        self.handle_error(error);
    }

    fn show_critical_error_notification(&self, error: &AppError) {
        // For now, just emit a critical error event
        // In a full implementation, this could show a native notification
        let _ = self.app.emit("critical_error", error);
    }
}


// Tauri commands for error handling
#[tauri::command]
pub fn get_error_logs() -> Result<Vec<AppError>, String> {
    // For now, return empty vector
    // In a full implementation, this would return stored error logs
    Ok(vec![])
}

#[tauri::command]
pub fn clear_error_logs() -> Result<(), String> {
    // For now, just return success
    // In a full implementation, this would clear the error log storage
    Ok(())
}

#[tauri::command]
pub fn report_error(error: AppError, app: AppHandle<tauri::Wry>) -> Result<(), String> {
    let error_handler = ErrorHandler::new(app);
    error_handler.handle_error(error);
    Ok(())
}
