import { useState, useEffect, useRef } from 'react';

interface ShortcutFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Map of key names to symbols
const KEY_SYMBOLS: Record<string, string> = {
  'CommandOrControl': '⌘',
  'Command': '⌘',
  'Cmd': '⌘',
  'Control': '⌃',
  'Ctrl': '⌃',
  'Shift': '⇧',
  'Alt': '⌥',
  'Option': '⌥',
  'Space': 'Space',
  'Enter': '⏎',
  'Return': '⏎',
  'Escape': '⎋',
  'Esc': '⎋',
  'Tab': '⇥',
  'Delete': '⌫',
  'Backspace': '⌫',
  'Up': '↑',
  'Down': '↓',
  'Left': '←',
  'Right': '→',
  'fn': 'fn',
  'F1': 'F1',
  'F2': 'F2',
  'F3': 'F3',
  'F4': 'F4',
  'F5': 'F5',
  'F6': 'F6',
  'F7': 'F7',
  'F8': 'F8',
  'F9': 'F9',
  'F10': 'F10',
  'F11': 'F11',
  'F12': 'F12',
};

export function ShortcutField({ value, onChange, placeholder = 'Click to record' }: ShortcutFieldProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const fieldRef = useRef<HTMLDivElement>(null);

  // Parse the shortcut string into display format
  const formatShortcut = (shortcut: string): string[] => {
    if (!shortcut) return [];
    
    // Split by + and map to symbols
    const parts = shortcut.split('+').map(part => {
      const trimmed = part.trim();
      return KEY_SYMBOLS[trimmed] || trimmed;
    });
    
    return parts;
  };

  // Convert recorded keys to shortcut string
  const keysToShortcut = (keySet: Set<string>): string => {
    const keyArray = Array.from(keySet);
    const order = ['Meta', 'Control', 'Alt', 'Shift']; // Proper modifier order
    
    const sortedKeys = keyArray.sort((a, b) => {
      const aIndex = order.findIndex(o => a.includes(o));
      const bIndex = order.findIndex(o => b.includes(o));
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return 0;
    });
    
    // Map to cross-platform names
    return sortedKeys.map(key => {
      if (key === 'Meta') return 'CommandOrControl';
      if (key === 'Control') return 'Ctrl';
      if (key === 'Alt') return 'Alt';
      if (key === 'Shift') return 'Shift';
      if (key === ' ') return 'Space';
      return key;
    }).join('+');
  };

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const newKeys = new Set(keys);
      
      // Add modifier keys
      if (e.metaKey) newKeys.add('Meta');
      if (e.ctrlKey) newKeys.add('Control');
      if (e.altKey) newKeys.add('Alt');
      if (e.shiftKey) newKeys.add('Shift');
      
      // Add the actual key (if not a modifier)
      if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
        // Handle special keys
        if (e.key === ' ') {
          newKeys.add(' ');
        } else if (e.key.startsWith('F') && e.key.length <= 3) {
          // Function keys
          newKeys.add(e.key);
        } else if (e.code === 'Fn') {
          // Function key (fn)
          newKeys.add('fn');
        } else if (e.key.length === 1) {
          newKeys.add(e.key.toUpperCase());
        } else {
          newKeys.add(e.key);
        }
      }
      
      setKeys(newKeys);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Stop recording when all keys are released
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && keys.size > 0) {
        const shortcut = keysToShortcut(keys);
        onChange(shortcut);
        setIsRecording(false);
        setKeys(new Set());
      }
    };

    const handleBlur = () => {
      // Cancel recording if clicked outside
      setIsRecording(false);
      setKeys(new Set());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    fieldRef.current?.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      fieldRef.current?.removeEventListener('blur', handleBlur);
    };
  }, [isRecording, keys, onChange]);

  const displayParts = formatShortcut(value);

  return (
    <div
      ref={fieldRef}
      tabIndex={0}
      onClick={() => setIsRecording(true)}
      className={`
        flex items-center gap-1 min-w-[200px] cursor-pointer
        ${isRecording ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      {isRecording ? (
        <span className="text-gray-400 text-sm">Press keys...</span>
      ) : displayParts.length > 0 ? (
        displayParts.map((part, index) => (
          <kbd
            key={index}
            className="inline-flex items-center justify-center px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded text-gray-700 min-w-[24px]"
          >
            {part}
          </kbd>
        ))
      ) : (
        <span className="text-gray-400 text-sm">{placeholder}</span>
      )}
    </div>
  );
}