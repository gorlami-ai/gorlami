use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Runtime,
};

pub fn create_tray<R: Runtime>(app: &tauri::AppHandle<R>) -> tauri::Result<()> {
    let quit_item = MenuItem::with_id(app, "quit", "Quit Gorlami", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let shortcuts_item = MenuItem::with_id(app, "shortcuts", "Shortcuts...", true, None::<&str>)?;
    
    // Create microphone submenu
    let mic_default = MenuItem::with_id(app, "mic_default", "Default", true, None::<&str>)?;
    let microphone_menu = Submenu::with_items(
        app,
        "Microphone",
        true,
        &[&mic_default],
    )?;
    
    // Status item (will be updated dynamically)
    let status_item = MenuItem::with_id(app, "status", "Hello, User • Offline", false, None::<&str>)?;
    
    let separator = PredefinedMenuItem::separator(app)?;
    
    let menu = Menu::with_items(
        app,
        &[
            &status_item,
            &separator,
            &microphone_menu,
            &shortcuts_item,
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
            "settings" => {
                // Will implement settings window later
                println!("Settings clicked");
            }
            "shortcuts" => {
                // Will implement shortcuts window later
                println!("Shortcuts clicked");
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

pub fn update_tray_status<R: Runtime>(
    _app: &tauri::AppHandle<R>,
    username: &str,
    is_online: bool,
) -> tauri::Result<()> {
    let status = if is_online { "Online" } else { "Offline" };
    let _status_text = format!("Hello, {} • {}", username, status);
    
    // For now, we'll update this when we have access to the menu item
    // This will be improved in the next iteration
    
    Ok(())
}