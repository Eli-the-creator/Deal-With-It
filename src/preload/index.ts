import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Define API for user interface
const api = {
  // Audio and speech recognition
  audio: {
    // Initialize audio capture
    initAudioCapture: () => ipcRenderer.invoke("initialize-audio-capture"),

    // Update audio capture settings
    updateAudioSettings: (newSettings: any) =>
      ipcRenderer.invoke("update-audio-settings", newSettings),

    // Start audio recording
    startCapture: (sourceId?: string) =>
      ipcRenderer.invoke("start-audio-capture", sourceId),

    // Stop audio recording
    stopCapture: () => ipcRenderer.invoke("stop-audio-capture"),

    // Get current audio capture status
    getCaptureStatus: () => ipcRenderer.invoke("get-capture-status"),

    // Send audio data to main process
    sendAudioData: (audioData: Uint8Array) =>
      ipcRenderer.send("audio-data", audioData),

    // Save audio for debugging
    saveDebugAudio: (audioData: Uint8Array) =>
      ipcRenderer.invoke("save-debug-audio", audioData),

    // Handler for receiving audio sources
    onAudioSources: (callback: (sources: any[]) => void) => {
      const handler = (_: any, sources: any[]) => callback(sources);
      ipcRenderer.on("audio-sources", handler);
      return () => ipcRenderer.removeListener("audio-sources", handler);
    },

    // Handler for receiving audio capture settings
    onAudioSettings: (callback: (settings: any) => void) => {
      const handler = (_: any, settings: any) => callback(settings);
      ipcRenderer.on("audio-capture-settings", handler);
      return () =>
        ipcRenderer.removeListener("audio-capture-settings", handler);
    },

    onCaptureControl: (callback: (command: { action: string }) => void) => {
      const handler = (_: any, command: { action: string }) =>
        callback(command);
      ipcRenderer.on("capture-control", handler);
      return () => ipcRenderer.removeListener("capture-control", handler);
    },

    // Handler for start capture
    onStartCapture: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on("start-capture", handler);
      return () => ipcRenderer.removeListener("start-capture", handler);
    },

    // Handler for stop capture
    onStopCapture: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("stop-capture", handler);
      return () => ipcRenderer.removeListener("stop-capture", handler);
    },
  },

  // Speech recognition (DeepGram API)
  whisper: {
    // Transcribe current audio buffer
    transcribeBuffer: (options: { language?: "ru" | "en" | "pl" }) =>
      ipcRenderer.invoke("transcribe-buffer", options),

    // Get last transcription
    getLastTranscription: () => ipcRenderer.invoke("get-last-transcription"),

    // Handler for receiving transcription results
    onTranscriptionResult: (callback: (result: any) => void) => {
      const handler = (_: any, result: any) => callback(result);
      ipcRenderer.on("transcription-result", handler);
      return () => ipcRenderer.removeListener("transcription-result", handler);
    },

    // Handler for transcription service status
    onWhisperStatus: (callback: (status: any) => void) => {
      const handler = (_: any, status: any) => callback(status);
      ipcRenderer.on("whisper-status", handler);
      return () => ipcRenderer.removeListener("whisper-status", handler);
    },

    // Handler for processing audio data
    onProcessAudioData: (callback: (audioData: Uint8Array) => void) => {
      const handler = (_: any, audioData: Uint8Array) => callback(audioData);
      ipcRenderer.on("process-audio-data", handler);
      return () => ipcRenderer.removeListener("process-audio-data", handler);
    },
  },

  // DeepGram API configuration
  deepgram: {
    // Load DeepGram configuration
    loadConfig: () => ipcRenderer.invoke("load-deepgram-config"),

    // Save DeepGram configuration
    saveConfig: (config: { apiKey: string }) =>
      ipcRenderer.invoke("save-deepgram-config", config),
  },

  // Request queue
  queue: {
    // Add last transcription to queue
    addLastTranscriptionToQueue: () =>
      ipcRenderer.invoke("add-last-transcription-to-queue"),

    // Add screenshot to queue
    addScreenshotToQueue: () => ipcRenderer.invoke("add-screenshot-to-queue"),

    // Add clipboard content to queue
    addClipboardToQueue: () => ipcRenderer.invoke("add-clipboard-to-queue"),

    // Remove item from queue
    removeFromQueue: (itemId: string) =>
      ipcRenderer.invoke("remove-from-queue", itemId),

    // Clear entire queue
    clearQueue: () => ipcRenderer.invoke("clear-queue"),

    // Get current queue
    getQueue: () => ipcRenderer.invoke("get-queue"),

    // Handler for queue updates
    onQueueUpdated: (callback: (queue: any[]) => void) => {
      const handler = (_: any, queue: any[]) => callback(queue);
      ipcRenderer.on("queue-updated", handler);
      return () => ipcRenderer.removeListener("queue-updated", handler);
    },
  },

  // Response generation via Gemini
  gemini: {
    // Load Gemini configuration
    loadConfig: () => ipcRenderer.invoke("load-gemini-config"),

    // Save Gemini configuration
    saveConfig: (newConfig: any) =>
      ipcRenderer.invoke("save-gemini-config", newConfig),

    // Generate response
    generateResponse: (params: {
      texts: string[];
      images: string[];
      streaming?: boolean;
    }) => ipcRenderer.invoke("generate-response", params),

    // Stop generation
    stopGeneration: () => ipcRenderer.invoke("stop-generation"),

    // Get generation status
    getGenerationStatus: () => ipcRenderer.invoke("get-generation-status"),

    // Handler for receiving generation chunks
    onGenerationChunk: (callback: (data: { chunk: string }) => void) => {
      const handler = (_: any, data: { chunk: string }) => callback(data);
      ipcRenderer.on("generation-chunk", handler);
      return () => ipcRenderer.removeListener("generation-chunk", handler);
    },

    // Handler for generation status
    onGenerationStatus: (callback: (status: any) => void) => {
      const handler = (_: any, status: any) => callback(status);
      ipcRenderer.on("generation-status", handler);
      return () => ipcRenderer.removeListener("generation-status", handler);
    },
  },

  // Hotkeys
  hotkeys: {
    // Get list of hotkeys
    getHotkeys: () => ipcRenderer.invoke("get-hotkeys"),

    // Handler for hotkey triggers
    onHotkeyTriggered: (callback: (action: string) => void) => {
      const handler = (_: any, action: string) => callback(action);
      ipcRenderer.on("hotkey-triggered", handler);
      return () => ipcRenderer.removeListener("hotkey-triggered", handler);
    },
  },

  // REMOVED: We no longer need the isScreenSharing method
  // since the window is now natively resistant to screen capture
};

// Expose API to renderer window
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (defined in d.ts)
  window.electron = electronAPI;
  // @ts-ignore (defined in d.ts)
  window.api = api;
}
