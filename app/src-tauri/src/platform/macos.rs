use crate::error::{AppError, AppResult};
use std::process::Command;

/// Execute an AppleScript and return the output
pub fn execute_applescript(script: &str) -> AppResult<String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| AppError::System(format!("Failed to execute AppleScript: {}", e)))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::System(format!("AppleScript failed: {}", error)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Simulate a keyboard shortcut using AppleScript
pub fn simulate_keystroke(key: &str, modifiers: &[&str]) -> AppResult<()> {
    let modifier_str = if modifiers.is_empty() {
        String::new()
    } else {
        format!(" using {{{}}}", modifiers.join(", "))
    };
    
    let script = format!(
        r#"tell application "System Events"
            keystroke "{}"{}
        end tell"#,
        key, modifier_str
    );
    
    execute_applescript(&script)?;
    Ok(())
}

/// Get the currently selected text
pub fn get_selected_text_with_clipboard_restore() -> AppResult<String> {
    use arboard::Clipboard;
    
    // Save current clipboard content
    let mut clipboard = Clipboard::new()?;
    let original_content = clipboard.get_text().unwrap_or_default();
    
    // Copy selection to clipboard
    let script = r#"
        tell application "System Events"
            keystroke "c" using command down
        end tell
        delay 0.1
        get the clipboard
    "#;
    
    let selected_text = execute_applescript(script)?;
    
    // Restore original clipboard content
    if !original_content.is_empty() {
        let _ = clipboard.set_text(&original_content);
    }
    
    Ok(selected_text)
}