use crate::error::{AppError, AppResult};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

// Window dimension constants
pub const OVERLAY_WIDTH: f64 = 140.0;
pub const OVERLAY_HEIGHT: f64 = 120.0;
pub const OVERLAY_MARGIN_RIGHT: f64 = 20.0;
pub const OVERLAY_MARGIN_TOP: f64 = 60.0;

pub const MAIN_WIDTH: f64 = 1200.0;
pub const MAIN_HEIGHT: f64 = 800.0;
pub const MAIN_MIN_WIDTH: f64 = 800.0;
pub const MAIN_MIN_HEIGHT: f64 = 600.0;

/// Show the processing overlay window in the top-right corner
pub fn show_processing_overlay(app: &AppHandle) -> AppResult<()> {
    log::info!("show_processing_overlay called");
    
    // Check if overlay window already exists
    if let Some(window) = app.get_webview_window("processing_overlay") {
        log::info!("Found existing overlay window, showing it");
        window.show().map_err(|e| AppError::Window(format!("Failed to show window: {}", e)))?;
        window.unminimize().map_err(|e| AppError::Window(format!("Failed to unminimize window: {}", e)))?;
        window.set_always_on_top(true).map_err(|e| AppError::Window(format!("Failed to set always on top: {}", e)))?;
        return Ok(());
    }
    
    log::info!("Creating new overlay window");

    // Get the primary monitor to calculate position
    let monitor = app.primary_monitor()
        .map_err(|e| AppError::Window(format!("Failed to get primary monitor: {}", e)))?;
    
    let monitor = monitor.ok_or_else(|| AppError::Window("No primary monitor found".to_string()))?;
    let screen_size = monitor.size();
    
    // Calculate position for top-right corner
    let x_position = (screen_size.width as f64) - OVERLAY_WIDTH - OVERLAY_MARGIN_RIGHT;
    let y_position = OVERLAY_MARGIN_TOP;
    
    log::info!("Window position: x={}, y={}", x_position, y_position);
    
    WebviewWindowBuilder::new(
        app,
        "processing_overlay",
        WebviewUrl::App("index.html".into()),
    )
    .title("Processing")
    .inner_size(OVERLAY_WIDTH, OVERLAY_HEIGHT)
    .position(x_position, y_position)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .initialization_script("window.__TAURI_WINDOW_LABEL__ = 'processing_overlay';")
    .build()
    .map_err(|e| {
        log::error!("Failed to create overlay window: {}", e);
        AppError::Window(format!("Failed to create processing overlay: {}", e))
    })?;
    
    log::info!("Overlay window created successfully");
    Ok(())
}

/// Hide the processing overlay window
pub fn hide_processing_overlay(app: &AppHandle) -> AppResult<()> {
    if let Some(window) = app.get_webview_window("processing_overlay") {
        window.hide().map_err(|e| AppError::Window(format!("Failed to hide window: {}", e)))?;
    }
    Ok(())
}

/// Open or focus the main application window
pub fn open_main_window<R: tauri::Runtime>(app: &AppHandle<R>, tab: Option<&str>) {
    // Check if main window already exists
    if let Some(window) = app.get_webview_window("main") {
        // If tab is specified, navigate to it
        if let Some(tab_name) = tab {
            let _ = window.eval(format!("window.location.hash = '#{tab_name}'").as_str());
        }
        let _ = window.set_focus();
        let _ = window.show();
        return;
    }

    // Create URL with optional hash for tab
    let url = match tab {
        Some(tab_name) => format!("index.html#{tab_name}"),
        None => "index.html".to_string(),
    };

    // Create new main window
    let window_result = WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::App(url.into()),
    )
    .title("Gorlami")
    .inner_size(MAIN_WIDTH, MAIN_HEIGHT)
    .min_inner_size(MAIN_MIN_WIDTH, MAIN_MIN_HEIGHT)
    .resizable(true)
    .center()
    .initialization_script("window.__TAURI_WINDOW_LABEL__ = 'main';")
    .build();

    match window_result {
        Ok(window) => {
            // Handle window close event to prevent app shutdown
            let window_handle = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Hide window instead of closing the app
                    api.prevent_close();
                    let _ = window_handle.hide();
                }
            });
            
            let _ = window.set_focus();
        }
        Err(e) => {
            log::error!("Failed to create main window: {e}");
        }
    }
}