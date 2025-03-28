import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { app } from "electron";
import { addToAudioBuffer, clearAudioBuffer } from "./whisper";

// Audio capture settings interface
interface AudioCaptureSettings {
  captureMicrophone: boolean;
  captureSystemAudio: boolean;
  sampleRate: number; // Sample rate (usually 16000 for transcription)
  channels: number; // Number of channels (1 - mono, 2 - stereo)
}

// Global capture state
let isCapturing = false;
let captureSettings: AudioCaptureSettings = {
  captureMicrophone: true,
  captureSystemAudio: true,
  sampleRate: 16000, // Optimal for speech recognition
  channels: 1, // Mono for better speech recognition
};

// Set up audio capture service
export function setupAudioCapture(mainWindow: BrowserWindow): void {
  console.log("Setting up audio capture service with FFmpeg support...");

  // Function to send capture settings to renderer
  const sendCaptureSettings = () => {
    mainWindow.webContents.send("audio-capture-settings", captureSettings);
    console.log("Sent audio capture settings to renderer", captureSettings);
  };

  // Initialize audio capture
  ipcMain.handle("initialize-audio-capture", async () => {
    try {
      console.log("Initializing audio capture...");

      // Ensure temporary directory exists
      const tempDir = join(app.getPath("temp"), "deepgram_audio");
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      // Send current settings
      sendCaptureSettings();

      return { success: true };
    } catch (error) {
      console.error("Error initializing audio capture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Handler for updating capture settings
  ipcMain.handle(
    "update-audio-settings",
    (_, newSettings: Partial<AudioCaptureSettings>) => {
      console.log("Updating audio settings", newSettings);

      captureSettings = {
        ...captureSettings,
        ...newSettings,
      };

      // Send updated settings to renderer
      sendCaptureSettings();

      return captureSettings;
    }
  );

  // Start audio capture
  ipcMain.handle("start-audio-capture", async (_, sourceId?: string) => {
    console.log("Received request to start audio capture", {
      sourceId,
      isAlreadyCapturing: isCapturing,
    });

    if (isCapturing) {
      return { success: true, alreadyCapturing: true };
    }

    try {
      // Clear audio buffer at the start
      clearAudioBuffer();

      // Send command to renderer to start audio capture via WebRTC
      mainWindow.webContents.send("start-capture", {
        sourceId,
        settings: captureSettings,
      });

      isCapturing = true;
      console.log("Audio capture started successfully");
      return { success: true };
    } catch (error) {
      console.error("Error starting audio capture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Stop audio capture
  ipcMain.handle("stop-audio-capture", () => {
    console.log("Received request to stop audio capture", {
      isCurrentlyCapturing: isCapturing,
    });

    if (!isCapturing) {
      return { success: true, notCapturing: true };
    }

    try {
      mainWindow.webContents.send("stop-capture");
      isCapturing = false;
      console.log("Audio capture stopped successfully");
      return { success: true };
    } catch (error) {
      console.error("Error stopping audio capture:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  // Get current capture status
  ipcMain.handle("get-capture-status", () => {
    console.log("Getting capture status", {
      isCapturing,
      settings: captureSettings,
    });
    return {
      isCapturing,
      settings: captureSettings,
    };
  });

  // Process audio data from renderer
  ipcMain.on("audio-data", (_, audioData) => {
    if (!isCapturing) {
      console.log("Received audio data but not capturing, ignoring");
      return;
    }

    // Forward to whisper service (now DeepGram)
    mainWindow.webContents.send("process-audio-data", audioData);
    console.log(`Received and forwarded audio data: ${audioData.length} bytes`);

    // Add audio data to transcription buffer
    addToAudioBuffer(audioData);
  });

  // Save debug audio file (for debugging)
  ipcMain.handle("save-debug-audio", (_, audioData: Buffer) => {
    try {
      const debugFilePath = join(app.getPath("temp"), "debug_audio.wav");
      writeFileSync(debugFilePath, audioData);
      console.log(`Saved debug audio to ${debugFilePath}`);
      return { success: true, path: debugFilePath };
    } catch (error) {
      console.error("Error saving debug audio:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });

  console.log("Audio capture service setup complete");
}
