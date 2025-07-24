use crate::error::{AppError, AppResult};
use core_foundation::base::{CFRelease, TCFType};
use core_foundation::boolean::CFBoolean;
use core_foundation::dictionary::CFDictionary;
use core_foundation::string::{CFString, CFStringRef};
use core_foundation_sys::base::CFTypeRef;
use std::os::raw::c_void;
use std::ptr;

// External functions from ApplicationServices framework
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrustedWithOptions(options: CFTypeRef) -> bool;
    fn AXUIElementCreateSystemWide() -> AXUIElementRef;
    fn AXUIElementCopyAttributeValue(
        element: AXUIElementRef,
        attribute: CFStringRef,
        value: *mut CFTypeRef,
    ) -> AXError;
    fn AXUIElementSetAttributeValue(
        element: AXUIElementRef,
        attribute: CFStringRef,
        value: CFTypeRef,
    ) -> AXError;
}

type AXUIElementRef = *mut c_void;
type AXError = i32;

const AX_ERROR_SUCCESS: AXError = 0;
const AX_ERROR_API_DISABLED: AXError = -25211;
const AX_ERROR_INVALID_UI_ELEMENT: AXError = -25202;
const AX_ERROR_ATTRIBUTE_UNSUPPORTED: AXError = -25205;
const AX_ERROR_NO_VALUE: AXError = -25212;

// Attribute name constants
const AX_FOCUSED_UI_ELEMENT: &str = "AXFocusedUIElement";
const AX_SELECTED_TEXT: &str = "AXSelectedText";
const AX_VALUE: &str = "AXValue";

/// Check if the app has accessibility permissions
pub fn check_accessibility_permission() -> bool {
    unsafe { AXIsProcessTrustedWithOptions(ptr::null()) }
}

/// Request accessibility permissions with a prompt
pub fn request_accessibility_permission() -> bool {
    unsafe {
        let prompt_key = CFString::new("AXTrustedCheckOptionPrompt");
        let prompt_value = CFBoolean::true_value();
        let dict = CFDictionary::from_CFType_pairs(&[(prompt_key.as_CFType(), prompt_value.as_CFType())]);
        
        AXIsProcessTrustedWithOptions(dict.as_concrete_TypeRef() as CFTypeRef)
    }
}

/// Get the focused UI element (text field, text area, etc.)
fn get_focused_element() -> AppResult<AXUIElementRef> {
    unsafe {
        let system_wide = AXUIElementCreateSystemWide();
        if system_wide.is_null() {
            return Err(AppError::System("Failed to create system-wide element".to_string()));
        }

        let mut focused_element: CFTypeRef = ptr::null_mut();
        let focused_attr = CFString::new(AX_FOCUSED_UI_ELEMENT);
        
        let result = AXUIElementCopyAttributeValue(
            system_wide,
            focused_attr.as_concrete_TypeRef(),
            &mut focused_element,
        );

        // Release system-wide element
        CFRelease(system_wide as CFTypeRef);

        match result {
            AX_ERROR_SUCCESS => {
                if focused_element.is_null() {
                    Err(AppError::System("No focused element found".to_string()))
                } else {
                    Ok(focused_element as AXUIElementRef)
                }
            }
            AX_ERROR_API_DISABLED => {
                Err(AppError::Permission("Accessibility API is disabled. Please grant permission in System Preferences.".to_string()))
            }
            _ => {
                Err(AppError::System(format!("Failed to get focused element: error {}", result)))
            }
        }
    }
}

/// Insert text at the current cursor position
pub fn insert_text_at_cursor(text: &str) -> AppResult<()> {
    if !check_accessibility_permission() {
        return Err(AppError::Permission(
            "Accessibility permission not granted. Please enable it in System Preferences > Security & Privacy > Privacy > Accessibility.".to_string()
        ));
    }

    unsafe {
        let focused_element = get_focused_element()?;
        
        // Convert text to CFString
        let text_string = CFString::new(text);
        let selected_text_attr = CFString::new(AX_SELECTED_TEXT);
        
        // Set the selected text (this inserts at cursor if no selection)
        let result = AXUIElementSetAttributeValue(
            focused_element,
            selected_text_attr.as_concrete_TypeRef(),
            text_string.as_CFTypeRef(),
        );

        // Release the focused element
        CFRelease(focused_element as CFTypeRef);

        match result {
            AX_ERROR_SUCCESS => Ok(()),
            AX_ERROR_ATTRIBUTE_UNSUPPORTED => {
                // Try setting the value attribute instead (for some text fields)
                let value_attr = CFString::new(AX_VALUE);
                let result = AXUIElementSetAttributeValue(
                    focused_element,
                    value_attr.as_concrete_TypeRef(),
                    text_string.as_CFTypeRef(),
                );
                
                if result == AX_ERROR_SUCCESS {
                    Ok(())
                } else {
                    Err(AppError::System("Text field does not support text insertion".to_string()))
                }
            }
            AX_ERROR_INVALID_UI_ELEMENT => {
                Err(AppError::System("Invalid UI element - cursor may not be in a text field".to_string()))
            }
            _ => {
                Err(AppError::System(format!("Failed to insert text: error code {}", result)))
            }
        }
    }
}

/// Get the currently selected text
pub fn get_selected_text() -> AppResult<String> {
    if !check_accessibility_permission() {
        return Err(AppError::Permission(
            "Accessibility permission not granted. Please enable it in System Preferences > Security & Privacy > Privacy > Accessibility.".to_string()
        ));
    }

    unsafe {
        let focused_element = get_focused_element()?;
        
        let mut selected_text: CFTypeRef = ptr::null_mut();
        let selected_text_attr = CFString::new(AX_SELECTED_TEXT);
        
        let result = AXUIElementCopyAttributeValue(
            focused_element,
            selected_text_attr.as_concrete_TypeRef(),
            &mut selected_text,
        );

        // Release the focused element
        CFRelease(focused_element as CFTypeRef);

        match result {
            AX_ERROR_SUCCESS => {
                if selected_text.is_null() {
                    Ok(String::new())
                } else {
                    // Convert CFString to Rust String
                    let cf_string = CFString::wrap_under_get_rule(selected_text as CFStringRef);
                    let rust_string = cf_string.to_string();
                    CFRelease(selected_text);
                    Ok(rust_string)
                }
            }
            AX_ERROR_NO_VALUE | AX_ERROR_ATTRIBUTE_UNSUPPORTED => {
                // No text selected or attribute not supported
                Ok(String::new())
            }
            _ => {
                Err(AppError::System(format!("Failed to get selected text: error code {}", result)))
            }
        }
    }
}

/// Open System Preferences to the Accessibility pane
pub fn open_accessibility_preferences() -> AppResult<()> {
    use std::process::Command;
    
    Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
        .spawn()
        .map_err(|e| AppError::System(format!("Failed to open System Preferences: {}", e)))?;
    
    Ok(())
}