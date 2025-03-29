"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // Audio and speech recognition
  audio: {
    // Initialize audio capture
    initAudioCapture: () => electron.ipcRenderer.invoke("initialize-audio-capture"),
    // Update audio capture settings
    updateAudioSettings: (newSettings) => electron.ipcRenderer.invoke("update-audio-settings", newSettings),
    // Start audio recording
    startCapture: (sourceId) => electron.ipcRenderer.invoke("start-audio-capture", sourceId),
    // Stop audio recording
    stopCapture: () => electron.ipcRenderer.invoke("stop-audio-capture"),
    // Get current audio capture status
    getCaptureStatus: () => electron.ipcRenderer.invoke("get-capture-status"),
    // Send audio data to main process
    sendAudioData: (audioData) => electron.ipcRenderer.send("audio-data", audioData),
    // Save audio for debugging
    saveDebugAudio: (audioData) => electron.ipcRenderer.invoke("save-debug-audio", audioData),
    // Handler for receiving audio sources
    onAudioSources: (callback) => {
      const handler = (_, sources) => callback(sources);
      electron.ipcRenderer.on("audio-sources", handler);
      return () => electron.ipcRenderer.removeListener("audio-sources", handler);
    },
    // Handler for receiving audio capture settings
    onAudioSettings: (callback) => {
      const handler = (_, settings) => callback(settings);
      electron.ipcRenderer.on("audio-capture-settings", handler);
      return () => electron.ipcRenderer.removeListener("audio-capture-settings", handler);
    },
    onCaptureControl: (callback) => {
      const handler = (_, command) => callback(command);
      electron.ipcRenderer.on("capture-control", handler);
      return () => electron.ipcRenderer.removeListener("capture-control", handler);
    },
    // Handler for start capture
    onStartCapture: (callback) => {
      const handler = (_, data) => callback(data);
      electron.ipcRenderer.on("start-capture", handler);
      return () => electron.ipcRenderer.removeListener("start-capture", handler);
    },
    // Handler for stop capture
    onStopCapture: (callback) => {
      const handler = () => callback();
      electron.ipcRenderer.on("stop-capture", handler);
      return () => electron.ipcRenderer.removeListener("stop-capture", handler);
    }
  },
  // Speech recognition (DeepGram API)
  whisper: {
    // Transcribe current audio buffer
    transcribeBuffer: (options) => electron.ipcRenderer.invoke("transcribe-buffer", options),
    // Get last transcription
    getLastTranscription: () => electron.ipcRenderer.invoke("get-last-transcription"),
    // Handler for receiving transcription results
    onTranscriptionResult: (callback) => {
      const handler = (_, result) => callback(result);
      electron.ipcRenderer.on("transcription-result", handler);
      return () => electron.ipcRenderer.removeListener("transcription-result", handler);
    },
    // Handler for transcription service status
    onWhisperStatus: (callback) => {
      const handler = (_, status) => callback(status);
      electron.ipcRenderer.on("whisper-status", handler);
      return () => electron.ipcRenderer.removeListener("whisper-status", handler);
    },
    // Handler for processing audio data
    onProcessAudioData: (callback) => {
      const handler = (_, audioData) => callback(audioData);
      electron.ipcRenderer.on("process-audio-data", handler);
      return () => electron.ipcRenderer.removeListener("process-audio-data", handler);
    }
  },
  // DeepGram API configuration
  deepgram: {
    // Load DeepGram configuration
    loadConfig: () => electron.ipcRenderer.invoke("load-deepgram-config"),
    // Save DeepGram configuration
    saveConfig: (config) => electron.ipcRenderer.invoke("save-deepgram-config", config)
  },
  // Request queue
  queue: {
    // Add last transcription to queue
    addLastTranscriptionToQueue: () => electron.ipcRenderer.invoke("add-last-transcription-to-queue"),
    // Add screenshot to queue
    addScreenshotToQueue: () => electron.ipcRenderer.invoke("add-screenshot-to-queue"),
    // Add clipboard content to queue
    addClipboardToQueue: () => electron.ipcRenderer.invoke("add-clipboard-to-queue"),
    // Remove item from queue
    removeFromQueue: (itemId) => electron.ipcRenderer.invoke("remove-from-queue", itemId),
    // Clear entire queue
    clearQueue: () => electron.ipcRenderer.invoke("clear-queue"),
    // Get current queue
    getQueue: () => electron.ipcRenderer.invoke("get-queue"),
    // Handler for queue updates
    onQueueUpdated: (callback) => {
      const handler = (_, queue) => callback(queue);
      electron.ipcRenderer.on("queue-updated", handler);
      return () => electron.ipcRenderer.removeListener("queue-updated", handler);
    }
  },
  // Response generation via Gemini
  gemini: {
    // Load Gemini configuration
    loadConfig: () => electron.ipcRenderer.invoke("load-gemini-config"),
    // Save Gemini configuration
    saveConfig: (newConfig) => electron.ipcRenderer.invoke("save-gemini-config", newConfig),
    // Generate response
    generateResponse: (params) => electron.ipcRenderer.invoke("generate-response", params),
    // Stop generation
    stopGeneration: () => electron.ipcRenderer.invoke("stop-generation"),
    // Get generation status
    getGenerationStatus: () => electron.ipcRenderer.invoke("get-generation-status"),
    // Handler for receiving generation chunks
    onGenerationChunk: (callback) => {
      const handler = (_, data) => callback(data);
      electron.ipcRenderer.on("generation-chunk", handler);
      return () => electron.ipcRenderer.removeListener("generation-chunk", handler);
    },
    // Handler for generation status
    onGenerationStatus: (callback) => {
      const handler = (_, status) => callback(status);
      electron.ipcRenderer.on("generation-status", handler);
      return () => electron.ipcRenderer.removeListener("generation-status", handler);
    }
  },
  // Hotkeys
  hotkeys: {
    // Get list of hotkeys
    getHotkeys: () => electron.ipcRenderer.invoke("get-hotkeys"),
    // Handler for hotkey triggers
    onHotkeyTriggered: (callback) => {
      const handler = (_, action) => callback(action);
      electron.ipcRenderer.on("hotkey-triggered", handler);
      return () => electron.ipcRenderer.removeListener("hotkey-triggered", handler);
    }
  }
  // REMOVED: We no longer need the isScreenSharing method
  // since the window is now natively resistant to screen capture
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
