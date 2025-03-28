// src/renderer/src/lib/keyboard-shortcuts.ts

import { debugLog } from "./utils";

interface KeyboardShortcutsConfig {
  toggleCapture: string;
  addLastText: string;
  addScreenshot: string;
  sendQueue: string;
  clearQueue: string;
  toggleCollapse: string;
}

// Default keyboard shortcuts configuration
const DEFAULT_SHORTCUTS: KeyboardShortcutsConfig = {
  toggleCapture: "CommandOrControl+I",
  addLastText: "CommandOrControl+O",
  addScreenshot: "CommandOrControl+H",
  sendQueue: "CommandOrControl+Enter",
  clearQueue: "CommandOrControl+R",
  toggleCollapse: "CommandOrControl+B",
};

/**
 * Sets up keyboard event listeners in the renderer process
 * to capture keyboard shortcuts that might be missed by Electron's globalShortcut
 */
export function setupKeyboardShortcuts(callbacks: {
  onToggleCapture?: () => void;
  onAddLastText?: () => void;
  onAddScreenshot?: () => void;
  onSendQueue?: () => void;
  onClearQueue?: () => void;
  onToggleCollapse?: () => void;
}) {
  debugLog("KeyboardShortcuts", "Setting up keyboard shortcuts");

  // Helper to check if the keyboard event matches the shortcut pattern
  const matchesShortcut = (event: KeyboardEvent, shortcut: string): boolean => {
    const keys = shortcut.split("+");
    const key = keys[keys.length - 1].toLowerCase();
    const needsCtrl =
      shortcut.includes("Control") || shortcut.includes("CommandOrControl");
    const needsCmd =
      shortcut.includes("Command") || shortcut.includes("CommandOrControl");
    const needsShift = shortcut.includes("Shift");
    const needsAlt = shortcut.includes("Alt");

    const matches =
      (event.key.toLowerCase() === key.toLowerCase() ||
        event.code.toLowerCase() === key.toLowerCase()) &&
      ((needsCtrl && event.ctrlKey) || !needsCtrl) &&
      ((needsCmd && event.metaKey) || !needsCmd) &&
      ((needsShift && event.shiftKey) || !needsShift) &&
      ((needsAlt && event.altKey) || !needsAlt);

    if (matches) {
      debugLog("KeyboardShortcuts", `Matched shortcut: ${shortcut}`, {
        key: event.key,
        code: event.code,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
        shift: event.shiftKey,
        alt: event.altKey,
      });
    }

    return matches;
  };

  // Handle keydown events
  const handleKeyDown = (event: KeyboardEvent) => {
    // Check for toggle capture shortcut (CMD+I)
    if (matchesShortcut(event, DEFAULT_SHORTCUTS.toggleCapture)) {
      event.preventDefault();
      debugLog("KeyboardShortcuts", "Toggle capture shortcut triggered");
      callbacks.onToggleCapture?.();
    }

    // Check for add last text shortcut (CMD+O)
    else if (matchesShortcut(event, DEFAULT_SHORTCUTS.addLastText)) {
      event.preventDefault();
      debugLog("KeyboardShortcuts", "Add last text shortcut triggered");
      callbacks.onAddLastText?.();
    }

    // Check for add screenshot shortcut
    else if (matchesShortcut(event, DEFAULT_SHORTCUTS.addScreenshot)) {
      event.preventDefault();
      debugLog("KeyboardShortcuts", "Add screenshot shortcut triggered");
      callbacks.onAddScreenshot?.();
    }

    // Check for send queue shortcut
    else if (matchesShortcut(event, DEFAULT_SHORTCUTS.sendQueue)) {
      event.preventDefault();
      debugLog("KeyboardShortcuts", "Send queue shortcut triggered");
      callbacks.onSendQueue?.();
    }

    // Check for clear queue shortcut
    else if (matchesShortcut(event, DEFAULT_SHORTCUTS.clearQueue)) {
      event.preventDefault();
      debugLog("KeyboardShortcuts", "Clear queue shortcut triggered");
      callbacks.onClearQueue?.();
    }

    // Check for toggle collapse shortcut
    else if (matchesShortcut(event, DEFAULT_SHORTCUTS.toggleCollapse)) {
      event.preventDefault();
      debugLog("KeyboardShortcuts", "Toggle collapse shortcut triggered");
      callbacks.onToggleCollapse?.();
    }
  };

  // Add the event listener
  window.addEventListener("keydown", handleKeyDown);

  // Return a cleanup function
  return () => {
    debugLog("KeyboardShortcuts", "Removing keyboard shortcuts");
    window.addEventListener("keydown", handleKeyDown);
  };
}
