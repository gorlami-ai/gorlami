use crate::simple_audio::get_audio_devices;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::WebviewWindowBuilder,
    Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let quit_item = MenuItem::with_id(app, "quit", "Quit Gorlami", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let dashboard_item = MenuItem::with_id(app, "dashboard", "Dashboard", true, None::<&str>)?;

    // Create microphone submenu with real devices
    let devices = get_audio_devices().unwrap_or_default();
    let mut mic_items = Vec::new();

    for device in devices {
        let item = MenuItem::with_id(
            app,
            format!("mic_{}", device.name),
            format!(
                "{}{}",
                device.name,
                if device.is_default { " (Default)" } else { "" }
            ),
            true,
            None::<&str>,
        )?;
        mic_items.push(item);
    }

    if mic_items.is_empty() {
        let default_item = MenuItem::with_id(
            app,
            "mic_default",
            "No microphones found",
            false,
            None::<&str>,
        )?;
        mic_items.push(default_item);
    }

    let mic_refs: Vec<&dyn tauri::menu::IsMenuItem<R>> = mic_items
        .iter()
        .map(|item| item as &dyn tauri::menu::IsMenuItem<R>)
        .collect();
    let microphone_menu = Submenu::with_items(app, "Microphone", true, &mic_refs)?;

    // Status item with actual username
    let username = whoami::username();
    let status_text = format!("Hello, {username} • Offline");
    let status_item = MenuItem::with_id(app, "status", &status_text, false, None::<&str>)?;

    let separator = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &status_item,
            &separator,
            &dashboard_item,
            &microphone_menu,
            &settings_item,
            &separator,
            &quit_item,
        ],
    )?;

    let _tray = TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "quit" => {
                app.exit(0);
            }
            "dashboard" => {
                open_main_window(app, None);
            }
            "settings" => {
                open_main_window(app, Some("settings"));
            }
            id if id.starts_with("mic_") => {
                // Handle microphone selection
                let device_name = id.strip_prefix("mic_").unwrap_or("Default");
                if let Some(audio_recorder) =
                    app.try_state::<std::sync::Arc<crate::simple_audio::SimpleAudioRecorder>>()
                {
                    if let Err(e) = audio_recorder.select_device(device_name) {
                        log::error!("Failed to select audio device: {e}");
                    }
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|_tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // Menu will show automatically due to show_menu_on_left_click(true)
            }
        })
        .build(app)?;

    Ok(())
}

fn open_main_window<R: Runtime>(app: &tauri::AppHandle<R>, tab: Option<&str>) {
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
    let window_result =
        WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App(url.into()))
            .title("Gorlami")
            .inner_size(1200.0, 800.0)
            .min_inner_size(800.0, 600.0)
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

pub fn update_tray_status<R: Runtime>(
    _app: &tauri::AppHandle<R>,
    username: &str,
    is_online: bool,
) -> tauri::Result<()> {
    let status = if is_online { "Online" } else { "Offline" };
    let _status_text = format!("Hello, {username} • {status}");

    // For now, we'll update this when we have access to the menu item
    // This will be improved in the next iteration

    Ok(())
}
