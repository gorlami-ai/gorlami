# Tauri Tray Icon Dynamic Update Issue

## Summary
We're experiencing a critical issue with Tauri's tray icon API when attempting to dynamically update menu text. The issue manifests as either losing menu event handlers or creating duplicate tray icons.

## Environment
- **Tauri Version**: 2.6.2
- **Platform**: macOS (exclusively)
- **tray-icon crate**: 0.21.0

## The Core Problem
We need to update the tray menu's status text when users authenticate (from system username to OAuth display name). However, Tauri's tray API has two critical limitations:

1. **`tray.set_menu()` loses event handlers**: Updates the visual menu but all click handlers (`on_menu_event`) are lost
2. **No proper tray destruction**: Hidden trays remain in system memory, causing duplicates when recreating

## Reproduction Steps
1. Create tray with `TrayIconBuilder::with_id("main").on_menu_event(...)`
2. Later, update menu with `tray.set_menu(new_menu)`
3. Result: Menu text updates but clicking items (Quit, Settings, etc.) does nothing

OR

1. Create tray with ID "main"
2. Hide tray with `tray.set_visible(false)` and `tray.set_menu(None)`
3. Create new tray with same ID "main"
4. Result: Two tray icons appear in menu bar

## Root Cause Analysis
The issue stems from Tauri's architecture:
- Event handlers are attached to the `TrayIcon` instance during building, not to the menu
- `set_menu()` only updates the visual menu structure
- No API exists to update event handlers post-creation
- No API exists to truly destroy a tray icon (only hide it)
- macOS keeps hidden tray icons in memory

## Attempted Solutions

### 1. Simple Menu Update
```rust
tray.set_menu(Some(updated_menu))?;
```
**Result**: Text updates but all menu items become non-functional

### 2. Hide and Recreate
```rust
tray.set_visible(false)?;
tray.set_menu(None)?;
// Create new tray with same ID
```
**Result**: Creates duplicate icons because old tray isn't destroyed

### 3. Unique IDs
```rust
let tray_id = format!("main_{}", counter);
```
**Result**: Would accumulate infinite hidden trays

### 4. Rate Limiting & State Management
- Added delays between operations
- Prevented rapid updates
- Tracked tray state
**Result**: Reduces frequency but doesn't solve core issue

## Code Structure
```rust
// Initial creation works perfectly
TrayIconBuilder::with_id("main")
    .menu(&menu)
    .on_menu_event(|app, event| { /* handlers */ })
    .build()?;

// Later update breaks functionality
pub fn update_tray_status(app: &AppHandle, username: &str) {
    // Option A: tray.set_menu() → Loses handlers
    // Option B: Recreate tray → Duplicate icons
}
```

## Impact
Users must choose between:
- Seeing updated username but having non-functional menu items
- Having functional menu items but seeing duplicate tray icons
- Not updating the tray dynamically at all

## Requested Solution
We need one of:
1. **API to update menu while preserving event handlers**
2. **API to properly destroy tray icons** (not just hide)
3. **API to update specific menu items** without replacing entire menu
4. **Documentation on proper pattern** for dynamic tray updates

## Minimal Reproduction
```rust
// This works
let tray = TrayIconBuilder::with_id("main")
    .menu(&menu)
    .on_menu_event(|_, event| println!("Clicked: {}", event.id))
    .build()?;

// This breaks event handlers
let new_menu = Menu::new(app)?;
tray.set_menu(Some(new_menu))?;
// Clicking menu items now does nothing
```

## Workaround Status
Currently forced to accept broken functionality after updates, warning users that menu items may not work until app restart.