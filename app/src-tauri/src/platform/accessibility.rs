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

/// RAII wrapper for AXUIElement that ensures proper cleanup
struct AXUIElement {
    element: AXUIElementRef,
}

impl AXUIElement {
    fn new(element: AXUIElementRef) -> Option<Self> {
        if element.is_null() {
            None
        } else {
            Some(Self { element })
        }
    }
}

impl Drop for AXUIElement {
    fn drop(&mut self) {
        unsafe {
            CFRelease(self.element as CFTypeRef);
        }
    }
}

/// Safe wrapper for getting attribute values
fn copy_attribute_value(
    element: AXUIElementRef,
    attribute: &str,
) -> Result<CFTypeRef, AXError> {
    unsafe {
        let mut value: CFTypeRef = ptr::null_mut();
        let attr_string = CFString::new(attribute);
        let result = AXUIElementCopyAttributeValue(
            element,
            attr_string.as_concrete_TypeRef(),
            &mut value,
        );
        
        if result == AX_ERROR_SUCCESS && !value.is_null() {
            Ok(value)
        } else {
            Err(result)
        }
    }
}

/// Safe wrapper for setting attribute values
fn set_attribute_value(
    element: AXUIElementRef,
    attribute: &str,
    value: CFTypeRef,
) -> Result<(), AXError> {
    unsafe {
        let attr_string = CFString::new(attribute);
        let result = AXUIElementSetAttributeValue(
            element,
            attr_string.as_concrete_TypeRef(),
            value,
        );
        
        if result == AX_ERROR_SUCCESS {
            Ok(())
        } else {
            Err(result)
        }
    }
}

/// Check if the app has accessibility permissions
pub fn check_accessibility_permission() -> bool {
    unsafe { AXIsProcessTrustedWithOptions(ptr::null()) }
}

/// Request accessibility permissions with a prompt
pub fn request_accessibility_permission() -> bool {
    let prompt_key = CFString::new("AXTrustedCheckOptionPrompt");
    let prompt_value = CFBoolean::true_value();
    let dict = CFDictionary::from_CFType_pairs(&[(prompt_key.as_CFType(), prompt_value.as_CFType())]);
    
    unsafe {
        AXIsProcessTrustedWithOptions(dict.as_concrete_TypeRef() as CFTypeRef)
    }
}

/// Get the focused UI element (text field, text area, etc.)
fn get_focused_element() -> AppResult<AXUIElement> {
    unsafe {
        let system_wide = AXUIElementCreateSystemWide();
        let system_element = AXUIElement::new(system_wide)
            .ok_or_else(|| AppError::System("Failed to create system-wide element".to_string()))?;

        match copy_attribute_value(system_element.element, AX_FOCUSED_UI_ELEMENT) {
            Ok(focused_element) => {
                // Transfer ownership of focused_element to AXUIElement
                // system_element will be dropped automatically
                AXUIElement::new(focused_element as AXUIElementRef)
                    .ok_or_else(|| AppError::System("No focused element found".to_string()))
            }
            Err(AX_ERROR_API_DISABLED) => {
                Err(AppError::Permission("Accessibility API is disabled. Please grant permission in System Preferences.".to_string()))
            }
            Err(error_code) => {
                Err(AppError::System(format!("Failed to get focused element: error {}", error_code)))
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

    let focused_element = get_focused_element()?;
    let text_string = CFString::new(text);
    
    // Try to set selected text first (this inserts at cursor if no selection)
    match set_attribute_value(focused_element.element, AX_SELECTED_TEXT, text_string.as_CFTypeRef()) {
        Ok(()) => Ok(()),
        Err(AX_ERROR_ATTRIBUTE_UNSUPPORTED) => {
            // Try setting the value attribute instead (for some text fields)
            match set_attribute_value(focused_element.element, AX_VALUE, text_string.as_CFTypeRef()) {
                Ok(()) => Ok(()),
                Err(_) => Err(AppError::System("Text field does not support text insertion".to_string()))
            }
        }
        Err(AX_ERROR_INVALID_UI_ELEMENT) => {
            Err(AppError::System("Invalid UI element - cursor may not be in a text field".to_string()))
        }
        Err(error_code) => {
            Err(AppError::System(format!("Failed to insert text: error code {}", error_code)))
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

    let focused_element = get_focused_element()?;
    
    match copy_attribute_value(focused_element.element, AX_SELECTED_TEXT) {
        Ok(selected_text) => {
            // Convert CFString to Rust String
            let cf_string = unsafe { CFString::wrap_under_create_rule(selected_text as CFStringRef) };
            let rust_string = cf_string.to_string();
            Ok(rust_string)
        }
        Err(AX_ERROR_NO_VALUE | AX_ERROR_ATTRIBUTE_UNSUPPORTED) => {
            // No text selected or attribute not supported
            Ok(String::new())
        }
        Err(error_code) => {
            Err(AppError::System(format!("Failed to get selected text: error code {}", error_code)))
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