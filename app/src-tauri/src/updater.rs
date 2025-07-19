use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

#[derive(Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub version: String,
    pub date: Option<String>,
    pub body: Option<String>,
    pub download_size: Option<u64>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub available: bool,
    pub update_info: Option<UpdateInfo>,
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<UpdateCheckResult, String> {
    let updater = app.updater_builder().build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            let info = UpdateInfo {
                version: update.version.clone(),
                date: update.date.map(|d| d.to_string()),
                body: update.body.clone(),
                download_size: None, // Will be populated when downloading
            };
            
            Ok(UpdateCheckResult {
                available: true,
                update_info: Some(info),
            })
        }
        Ok(None) => Ok(UpdateCheckResult {
            available: false,
            update_info: None,
        }),
        Err(e) => Err(format!("Failed to check for updates: {e}")),
    }
}

#[tauri::command]
pub async fn download_and_install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater_builder().build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            // Emit download started event
            app.emit("update-download-started", ()).map_err(|e| e.to_string())?;
            
            // Download and install the update
            let mut downloaded = 0;
            
            update
                .download_and_install(
                    |chunk_len, content_len| {
                        downloaded += chunk_len;
                        let progress = if let Some(total) = content_len {
                            (downloaded as f64 / total as f64 * 100.0) as u32
                        } else {
                            0
                        };
                        
                        // Emit progress event
                        let _ = app.emit("update-download-progress", progress);
                    },
                    || {
                        // Emit download finished event
                        let _ = app.emit("update-download-finished", ());
                    },
                )
                .await
                .map_err(|e| e.to_string())?;
            
            Ok(())
        }
        Ok(None) => Err("No update available".to_string()),
        Err(e) => Err(format!("Failed to download update: {e}")),
    }
}

#[tauri::command]
pub async fn get_update_info(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater_builder().build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            let info = UpdateInfo {
                version: update.version.clone(),
                date: update.date.map(|d| d.to_string()),
                body: update.body.clone(),
                download_size: None,
            };
            Ok(Some(info))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get update info: {e}")),
    }
}

#[tauri::command]
pub async fn check_and_prompt_for_update(app: AppHandle) -> Result<bool, String> {
    let updater = app.updater_builder().build().map_err(|e| e.to_string())?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            let version = update.version.clone();
            let body = update.body.clone().unwrap_or_else(|| "".to_string());
            
            // Use dialog plugin to show a native dialog
            let dialog_result = app
                .dialog()
                .message(format!("Version {version} is now available.\n\n{body}\n\nWould you like to install it now?"))
                .title("Software Update")
                .kind(MessageDialogKind::Info)
                .buttons(MessageDialogButtons::YesNo)
                .blocking_show();
            
            if dialog_result {
                // User clicked Yes, proceed with download
                app.emit("update-download-started", ()).map_err(|e| e.to_string())?;
                
                let mut downloaded = 0;
                
                update
                    .download_and_install(
                        |chunk_len, content_len| {
                            downloaded += chunk_len;
                            let progress = if let Some(total) = content_len {
                                (downloaded as f64 / total as f64 * 100.0) as u32
                            } else {
                                0
                            };
                            
                            let _ = app.emit("update-download-progress", progress);
                        },
                        || {
                            let _ = app.emit("update-download-finished", ());
                        },
                    )
                    .await
                    .map_err(|e| e.to_string())?;
                
                Ok(true)
            } else {
                // User clicked No
                Ok(false)
            }
        }
        Ok(None) => Ok(false),
        Err(e) => Err(format!("Failed to check for updates: {e}")),
    }
}