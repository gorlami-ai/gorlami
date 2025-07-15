use arboard::Clipboard;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct ClipboardManager {
    app: AppHandle<tauri::Wry>,
    clipboard: Clipboard,
}

impl ClipboardManager {
    pub fn new(app: AppHandle<tauri::Wry>) -> Result<Self, String> {
        let clipboard =
            Clipboard::new().map_err(|e| format!("Failed to initialize clipboard: {}", e))?;

        Ok(Self { app, clipboard })
    }

    pub fn copy_text(&mut self, text: &str) -> Result<(), String> {
        self.clipboard
            .set_text(text)
            .map_err(|e| format!("Failed to copy text to clipboard: {}", e))?;

        println!("Copied text to clipboard: {} chars", text.len());
        Ok(())
    }

    pub fn get_text(&mut self) -> Result<String, String> {
        self.clipboard
            .get_text()
            .map_err(|e| format!("Failed to get text from clipboard: {}", e))
    }

    pub fn paste_at_cursor(&mut self, text: &str) -> Result<(), String> {
        // First, copy the text to clipboard
        self.copy_text(text)?;

        // Small delay to ensure clipboard is updated
        thread::sleep(Duration::from_millis(50));

        // On macOS, simulate Cmd+V to paste at cursor
        self.simulate_paste_keypress()?;

        // Emit event to notify that paste was attempted
        let _ = self.app.emit("text_pasted", text);

        Ok(())
    }

    #[cfg(target_os = "macos")]
    fn simulate_paste_keypress(&self) -> Result<(), String> {
        use std::process::Command;

        // Use AppleScript to simulate Cmd+V key press
        let script = r#"
            tell application "System Events"
                keystroke "v" using command down
            end tell
        "#;

        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| format!("Failed to execute AppleScript: {}", e))?;

        if !output.status.success() {
            let error = String::from_utf8_lossy(&output.stderr);
            return Err(format!("AppleScript failed: {}", error));
        }

        println!("Simulated paste keypress");
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    fn simulate_paste_keypress(&self) -> Result<(), String> {
        // For non-macOS systems, we'd need different implementation
        // For now, just copy to clipboard
        println!("Paste keypress simulation not implemented for this platform");
        Ok(())
    }
}

// Tauri commands
#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    let mut clipboard =
        Clipboard::new().map_err(|e| format!("Failed to initialize clipboard: {}", e))?;
    clipboard
        .set_text(&text)
        .map_err(|e| format!("Failed to copy text to clipboard: {}", e))?;

    println!("Copied {} characters to clipboard", text.len());
    Ok(())
}

#[tauri::command]
pub fn paste_at_cursor(text: String, app: AppHandle<tauri::Wry>) -> Result<(), String> {
    let mut clipboard_manager = ClipboardManager::new(app)?;
    clipboard_manager.paste_at_cursor(&text)
}

#[tauri::command]
pub fn get_clipboard_text() -> Result<String, String> {
    let mut clipboard =
        Clipboard::new().map_err(|e| format!("Failed to initialize clipboard: {}", e))?;
    clipboard
        .get_text()
        .map_err(|e| format!("Failed to get text from clipboard: {}", e))
}
