import {
  app,
  shell,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  desktopCapturer,
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

// Import services
import { setupWhisperService } from "./services/whisper";
import { setupGeminiService } from "./services/gemini";
import { setupAudioCapture } from "./services/audio-capture";
import { registerHotkeys } from "./services/hotkeys";
import { setupQueueService } from "./services/queue";
import { setupDeepgramService } from "./services/deepgram-service";

// Application state
let mainWindow: BrowserWindow | null = null;
let isVisible = true;

function createWindow(): void {
  // Get primary display size
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Create main window with settings that make it resistant to screen capture
  mainWindow = new BrowserWindow({
    width: 660,
    height: 320,
    x: width - 720,
    y: height - 650,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true, // Hide from taskbar
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    // Set type to 'panel' for better on-top behavior
    type: "panel",
    // Set background color to transparent
    backgroundColor: "#00000000",
  });

  // Enhanced screen capture resistance
  mainWindow.setContentProtection(true); // Main property that blocks screen capture
  mainWindow.setHiddenInMissionControl(true);
  mainWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  });
  mainWindow.setAlwaysOnTop(true, "floating", 1);

  // Additional screen capture resistance settings for macOS
  if (process.platform === "darwin") {
    // Prevent window from being captured in screenshots
    mainWindow.setWindowButtonVisibility(false);

    // Prevent window from being included in window switcher
    mainWindow.setSkipTaskbar(true);

    // Disable window shadow
    mainWindow.setHasShadow(false);
  }

  // Prevent performance throttling when window is not focused
  mainWindow.webContents.setBackgroundThrottling(false);
  mainWindow.webContents.setFrameRate(60);

  // Configure window behavior
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  // Make sure window isn't resizable
  mainWindow.setResizable(false);

  // Prevent opening external links in the app
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Load UI
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Initialize services
  setupWhisperService(mainWindow);
  setupGeminiService(mainWindow);
  setupAudioCapture(mainWindow);
  setupQueueService(mainWindow);
  setupDeepgramService(mainWindow);
}

// Application initialization
app.whenReady().then(() => {
  // Append switches for audio support (particularly important for macOS)
  if (process.platform === "darwin") {
    app.commandLine.appendSwitch("enable-speech-dispatcher");
    app.commandLine.appendSwitch(
      "use-file-for-fake-audio-capture",
      "test-audio.wav"
    );
  }

  // Set app user model ID for Windows
  electronApp.setAppUserModelId("com.voice-copilot");

  // Configure DevTools in development mode
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Create main window
  createWindow();

  // Register hotkeys
  registerHotkeys({
    toggleVisibility: () => {
      if (mainWindow) {
        if (isVisible) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
        isVisible = !isVisible;
      }
    },
    moveWindow: (direction) => {
      if (mainWindow) {
        const [x, y] = mainWindow.getPosition();
        const step = 62; // Movement step in pixels

        switch (direction) {
          case "up":
            mainWindow.setPosition(x, y - step);
            break;
          case "down":
            mainWindow.setPosition(x, y + step);
            break;
          case "left":
            mainWindow.setPosition(x - step, y);
            break;
          case "right":
            mainWindow.setPosition(x + step, y);
            break;
        }
      }
    },
  });

  // Remove the old screen sharing detection logic
  // No longer need to check if sharing is active - window should always be invisible
  // to screen capture regardless of sharing state

  // Handle app activation
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Proper app shutdown
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Unregister hotkeys on exit
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Export desktopCapturer for use in other modules
export { desktopCapturer };
