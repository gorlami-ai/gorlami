use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tokio::sync::broadcast;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketConfig {
    pub url: String,
    pub auto_reconnect: bool,
    pub reconnect_interval: u64, // seconds
}

impl Default for WebSocketConfig {
    fn default() -> Self {
        Self {
            url: "ws://localhost:8000/ws/transcribe".to_string(),
            auto_reconnect: true,
            reconnect_interval: 5,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionMessage {
    pub id: String,
    pub audio_data: Vec<u8>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub id: String,
    pub transcript: String,
    pub is_final: bool,
    pub enhanced_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WebSocketStatus {
    Disconnected,
    Connecting,
    Connected,
    Error(String),
}

pub struct WebSocketClient {
    app: AppHandle<tauri::Wry>,
    config: Arc<Mutex<WebSocketConfig>>,
    status: Arc<Mutex<WebSocketStatus>>,
    tx: Arc<Mutex<Option<broadcast::Sender<Message>>>>,
    connection_handle: Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>,
}

impl WebSocketClient {
    pub fn new(app: AppHandle<tauri::Wry>) -> Self {
        Self {
            app,
            config: Arc::new(Mutex::new(WebSocketConfig::default())),
            status: Arc::new(Mutex::new(WebSocketStatus::Disconnected)),
            tx: Arc::new(Mutex::new(None)),
            connection_handle: Arc::new(Mutex::new(None)),
        }
    }


    pub fn send_audio_data(&self, audio_data: Vec<u8>) -> Result<(), String> {
        let message = TranscriptionMessage {
            id: Uuid::new_v4().to_string(),
            audio_data,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        let json = serde_json::to_string(&message)
            .map_err(|e| format!("Failed to serialize message: {e}"))?;

        let tx_guard = self.tx.lock().unwrap();
        if let Some(tx) = tx_guard.as_ref() {
            tx.send(Message::Text(json))
                .map_err(|e| format!("Failed to send message: {e}"))?;
        } else {
            return Err("WebSocket not connected".to_string());
        }

        Ok(())
    }

    pub fn get_status(&self) -> WebSocketStatus {
        self.status.lock().unwrap().clone()
    }

    pub fn update_config(&self, config: WebSocketConfig) {
        let mut current_config = self.config.lock().unwrap();
        *current_config = config;
    }

    pub fn get_config(&self) -> WebSocketConfig {
        self.config.lock().unwrap().clone()
    }

}

// Global WebSocket client state
pub type WebSocketClientState = Arc<Mutex<WebSocketClient>>;

// Tauri commands
#[tauri::command]
pub async fn connect_websocket(
    state: tauri::State<'_, WebSocketClientState>,
) -> Result<(), String> {
    // Get the config and app handle without holding the lock
    let (config, app) = {
        let client = state.lock().unwrap();
        (client.get_config(), client.app.clone())
    };
    
    // Update status to connecting
    {
        let client = state.lock().unwrap();
        let mut status = client.status.lock().unwrap();
        *status = WebSocketStatus::Connecting;
        let _ = app.emit("websocket_status", &WebSocketStatus::Connecting);
    }
    
    // Try to connect without holding the main lock with timeout
    let connect_future = connect_async(&config.url);
    let timeout_duration = tokio::time::Duration::from_secs(10); // 10 second timeout
    
    match tokio::time::timeout(timeout_duration, connect_future).await {
        Ok(Ok((ws_stream, _))) => {
            // Connection successful
            {
                let client = state.lock().unwrap();
                let mut status = client.status.lock().unwrap();
                *status = WebSocketStatus::Connected;
                let _ = app.emit("websocket_status", &WebSocketStatus::Connected);
            }
            
            // Keep connection open and start message handling
            use futures_util::{SinkExt, StreamExt};
            use tokio::sync::broadcast;
            
            let (mut write, mut read) = ws_stream.split();
            let (tx, mut rx) = broadcast::channel::<Message>(32);
            
            // Store the sender for sending messages
            {
                let client = state.lock().unwrap();
                let mut sender = client.tx.lock().unwrap();
                *sender = Some(tx);
            }
            
            let app_clone = app.clone();
            let state_clone = state.inner().clone();
            
            // Start the main connection handler task
            let handle = tokio::spawn(async move {
                // Handle incoming messages
                let app_for_read = app_clone.clone();
                let state_for_read = state_clone.clone();
                let read_task = tokio::spawn(async move {
                    while let Some(msg) = read.next().await {
                        match msg {
                            Ok(Message::Text(text)) => {
                                if let Ok(response) = serde_json::from_str::<TranscriptionResponse>(&text) {
                                    let _ = app_for_read.emit("transcription_response", &response);
                                }
                            }
                            Ok(Message::Close(_)) => {
                                {
                                    let client = state_for_read.lock().unwrap();
                                    let mut status = client.status.lock().unwrap();
                                    *status = WebSocketStatus::Disconnected;
                                }
                                let _ = app_for_read.emit("websocket_status", &WebSocketStatus::Disconnected);
                                break;
                            }
                            Err(e) => {
                                let error_msg = format!("WebSocket error: {e}");
                                {
                                    let client = state_for_read.lock().unwrap();
                                    let mut status = client.status.lock().unwrap();
                                    *status = WebSocketStatus::Error(error_msg.clone());
                                }
                                let _ = app_for_read.emit("websocket_status", &WebSocketStatus::Error(error_msg));
                                break;
                            }
                            _ => {}
                        }
                    }
                    // Clean up sender on disconnect
                    {
                        let client = state_for_read.lock().unwrap();
                        let mut sender = client.tx.lock().unwrap();
                        *sender = None;
                    }
                });

                // Handle outgoing messages
                let write_task = tokio::spawn(async move {
                    while let Ok(msg) = rx.recv().await {
                        if let Err(e) = write.send(msg).await {
                            eprintln!("Failed to send WebSocket message: {e}");
                            break;
                        }
                    }
                });

                // Wait for either task to complete
                tokio::select! {
                    _ = read_task => {
                        println!("WebSocket read task completed");
                    },
                    _ = write_task => {
                        println!("WebSocket write task completed");
                    },
                }
            });
            
            // Store the connection handle
            {
                let client = state.lock().unwrap();
                let mut connection_handle = client.connection_handle.lock().unwrap();
                *connection_handle = Some(handle);
            }
            
            println!("WebSocket connected successfully to: {}", config.url);
            Ok(())
        }
        Ok(Err(e)) => {
            // Connection failed
            let error_msg = format!("Failed to connect to WebSocket: {e}");
            println!("Connection error: {error_msg}");
            
            // Update status to error
            {
                let client = state.lock().unwrap();
                let mut status = client.status.lock().unwrap();
                *status = WebSocketStatus::Error(error_msg.clone());
                let _ = app.emit("websocket_status", &WebSocketStatus::Error(error_msg.clone()));
            }
            
                         // Check if auto-reconnect is enabled
             if config.auto_reconnect {
                 println!("Auto-reconnect is enabled, scheduling reconnection in {} seconds", config.reconnect_interval);
                 
                 // Schedule reconnection by emitting a delayed event
                 let app_clone = app.clone();
                 let interval = config.reconnect_interval;
                 
                 tokio::spawn(async move {
                     tokio::time::sleep(tokio::time::Duration::from_secs(interval)).await;
                     println!("Attempting to reconnect...");
                     
                     // Emit reconnection event
                     let _ = app_clone.emit("websocket_reconnect", ());
                 });
             }
            
            Err(error_msg)
        }
        Err(_) => {
            // Timeout occurred
            let error_msg = format!("Connection timeout after 10 seconds to: {}", config.url);
            println!("Connection timeout: {error_msg}");
            
            // Update status to error
            {
                let client = state.lock().unwrap();
                let mut status = client.status.lock().unwrap();
                *status = WebSocketStatus::Error(error_msg.clone());
                let _ = app.emit("websocket_status", &WebSocketStatus::Error(error_msg.clone()));
            }
            
                         // Check if auto-reconnect is enabled
             if config.auto_reconnect {
                 println!("Auto-reconnect is enabled, scheduling reconnection in {} seconds", config.reconnect_interval);
                 
                 // Schedule reconnection by emitting a delayed event
                 let app_clone = app.clone();
                 let interval = config.reconnect_interval;
                 
                 tokio::spawn(async move {
                     tokio::time::sleep(tokio::time::Duration::from_secs(interval)).await;
                     println!("Attempting to reconnect...");
                     
                     // Emit reconnection event
                     let _ = app_clone.emit("websocket_reconnect", ());
                 });
             }
            
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn disconnect_websocket(
    state: tauri::State<'_, WebSocketClientState>,
) -> Result<(), String> {
    // Get the app handle without holding the lock
    let app = {
        let client = state.lock().unwrap();
        client.app.clone()
    };
    
    // Update status to disconnected
    {
        let client = state.lock().unwrap();
        let mut status = client.status.lock().unwrap();
        *status = WebSocketStatus::Disconnected;
        let _ = app.emit("websocket_status", &WebSocketStatus::Disconnected);
    }
    
    Ok(())
}

// Manual reconnection function for event-based reconnection
pub async fn reconnect_websocket(ws_client: &WebSocketClientState) -> Result<(), String> {
    // Get the config and app handle without holding the lock
    let (config, app) = {
        let client = ws_client.lock().unwrap();
        (client.get_config(), client.app.clone())
    };
    
    // Update status to connecting
    {
        let client = ws_client.lock().unwrap();
        let mut status = client.status.lock().unwrap();
        *status = WebSocketStatus::Connecting;
        let _ = app.emit("websocket_status", &WebSocketStatus::Connecting);
    }
    
    // Try to connect without holding the main lock with timeout
    let connect_future = connect_async(&config.url);
    let timeout_duration = tokio::time::Duration::from_secs(10); // 10 second timeout
    
    match tokio::time::timeout(timeout_duration, connect_future).await {
        Ok(Ok((ws_stream, _))) => {
            // Connection successful
            {
                let client = ws_client.lock().unwrap();
                let mut status = client.status.lock().unwrap();
                *status = WebSocketStatus::Connected;
                let _ = app.emit("websocket_status", &WebSocketStatus::Connected);
            }
            
            // For now, just close the connection immediately
            // In a real implementation, we'd keep it open and handle messages
            drop(ws_stream);
            
            println!("WebSocket reconnected successfully to: {}", config.url);
            Ok(())
        }
        Ok(Err(e)) => {
            // Connection failed
            let error_msg = format!("Failed to reconnect to WebSocket: {e}");
            println!("Reconnection error: {error_msg}");
            
            // Update status to error
            {
                let client = ws_client.lock().unwrap();
                let mut status = client.status.lock().unwrap();
                *status = WebSocketStatus::Error(error_msg.clone());
                let _ = app.emit("websocket_status", &WebSocketStatus::Error(error_msg.clone()));
            }
            
            Err(error_msg)
        }
        Err(_) => {
            // Timeout occurred
            let error_msg = format!("Reconnection timeout after 10 seconds to: {}", config.url);
            println!("Reconnection timeout: {error_msg}");
            
            // Update status to error
            {
                let client = ws_client.lock().unwrap();
                let mut status = client.status.lock().unwrap();
                *status = WebSocketStatus::Error(error_msg.clone());
                let _ = app.emit("websocket_status", &WebSocketStatus::Error(error_msg.clone()));
            }
            
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub fn get_websocket_status(
    state: tauri::State<'_, WebSocketClientState>,
) -> Result<WebSocketStatus, String> {
    let client = state.lock().unwrap();
    Ok(client.get_status())
}

#[tauri::command]
pub fn update_websocket_config(
    config: WebSocketConfig,
    state: tauri::State<'_, WebSocketClientState>,
) -> Result<(), String> {
    let client = state.lock().unwrap();
    client.update_config(config);
    Ok(())
}

#[tauri::command]
pub fn get_websocket_config(
    state: tauri::State<'_, WebSocketClientState>,
) -> Result<WebSocketConfig, String> {
    let client = state.lock().unwrap();
    Ok(client.get_config())
}

#[tauri::command]
pub fn send_audio_data(
    audio_data: Vec<u8>,
    state: tauri::State<'_, WebSocketClientState>,
) -> Result<(), String> {
    let client = state.lock().unwrap();
    client.send_audio_data(audio_data)
}