#!/usr/bin/env python3
"""
Generate simple microphone tray icons for Gorlami
"""
from PIL import Image, ImageDraw
import os

def create_microphone_icon(size, color=(255, 255, 255), bg_color=(0, 0, 0, 0)):
    """Create a simple microphone icon"""
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Scale factor
    scale = size / 32
    
    # Microphone body (rounded rectangle)
    mic_width = int(8 * scale)
    mic_height = int(12 * scale)
    mic_x = (size - mic_width) // 2
    mic_y = int(6 * scale)
    
    # Draw microphone body
    draw.rounded_rectangle(
        [(mic_x, mic_y), (mic_x + mic_width, mic_y + mic_height)],
        radius=int(4 * scale),
        fill=color
    )
    
    # Draw microphone stand
    stand_width = int(2 * scale)
    stand_height = int(6 * scale)
    stand_x = (size - stand_width) // 2
    stand_y = mic_y + mic_height
    
    draw.rectangle(
        [(stand_x, stand_y), (stand_x + stand_width, stand_y + stand_height)],
        fill=color
    )
    
    # Draw base
    base_width = int(10 * scale)
    base_height = int(2 * scale)
    base_x = (size - base_width) // 2
    base_y = stand_y + stand_height
    
    draw.rectangle(
        [(base_x, base_y), (base_x + base_width, base_y + base_height)],
        fill=color
    )
    
    return img

# Create directory if it doesn't exist
os.makedirs('tray', exist_ok=True)

# Generate icons for macOS menu bar (template images)
# Template images should be black with transparent background
sizes = [16, 32]  # macOS uses 16x16 and 32x32 for retina

for size in sizes:
    # Black icon for light mode
    icon = create_microphone_icon(size, color=(0, 0, 0, 255))
    icon.save(f'tray/icon_{size}x{size}.png')
    
    # Also save @2x version for retina
    if size == 16:
        icon_2x = create_microphone_icon(32, color=(0, 0, 0, 255))
        icon_2x.save('tray/icon_16x16@2x.png')

print("Tray icons generated successfully!")