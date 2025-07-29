use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Audio error: {0}")]
    Audio(String),
    
    #[error("Recording error: {0}")]
    Recording(String),
    
    
    #[error("Shortcut error: {0}")]
    Shortcut(String),
    
    
    #[error("Window error: {0}")]
    Window(String),
    
    #[error("System error: {0}")]
    System(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),
    
    #[error("CPAL error: {0}")]
    Cpal(#[from] cpal::BuildStreamError),
    
    #[error("Device error: {0}")]
    Device(#[from] cpal::DeviceNameError),
    
    #[error("Stream error: {0}")]
    Stream(#[from] cpal::PlayStreamError),
    
    #[error("Config error: {0}")]
    Config(#[from] cpal::DefaultStreamConfigError),
    
    #[error("Permission error: {0}")]
    Permission(String),
}


// Implement serialization for frontend communication
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("error", &self.to_string())?;
        state.serialize_field("type", &self.error_type())?;
        state.end()
    }
}

impl AppError {
    fn error_type(&self) -> &'static str {
        match self {
            AppError::Audio(_) => "audio",
            AppError::Recording(_) => "recording",
            AppError::Shortcut(_) => "shortcut",
            AppError::Window(_) => "window",
            AppError::System(_) => "system",
            AppError::Io(_) => "io",
            AppError::Json(_) => "json",
            AppError::Tauri(_) => "tauri",
            AppError::Cpal(_) => "audio_device",
            AppError::Device(_) => "audio_device",
            AppError::Stream(_) => "audio_stream",
            AppError::Config(_) => "audio_config",
            AppError::Permission(_) => "permission",
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;