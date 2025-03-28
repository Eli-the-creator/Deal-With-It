"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // Аудио и распознавание речи
  audio: {
    // Инициализация захвата аудио
    initAudioCapture: () => electron.ipcRenderer.invoke("initialize-audio-capture"),
    // Обновление настроек аудио захвата
    updateAudioSettings: (newSettings) => electron.ipcRenderer.invoke("update-audio-settings", newSettings),
    // Начать запись аудио
    startCapture: (sourceId) => electron.ipcRenderer.invoke("start-audio-capture", sourceId),
    // Остановить запись аудио
    stopCapture: () => electron.ipcRenderer.invoke("stop-audio-capture"),
    // Получить текущий статус захвата аудио
    getCaptureStatus: () => electron.ipcRenderer.invoke("get-capture-status"),
    // Отправить аудио данные в основной процесс
    sendAudioData: (audioData) => electron.ipcRenderer.send("audio-data", audioData),
    // Сохранить аудио для отладки
    saveDebugAudio: (audioData) => electron.ipcRenderer.invoke("save-debug-audio", audioData),
    // Обработчик для получения источников аудио
    onAudioSources: (callback) => {
      const handler = (_, sources) => callback(sources);
      electron.ipcRenderer.on("audio-sources", handler);
      return () => electron.ipcRenderer.removeListener("audio-sources", handler);
    },
    // Обработчик для получения настроек захвата аудио
    onAudioSettings: (callback) => {
      const handler = (_, settings) => callback(settings);
      electron.ipcRenderer.on("audio-capture-settings", handler);
      return () => electron.ipcRenderer.removeListener("audio-capture-settings", handler);
    },
    // Обработчик начала/остановки захвата
    // onCaptureControl: (callback: (command: { action: string }) => void) => {
    //   const handler = (_: any, command: { action: string }) =>
    //     callback(command);
    //   ipcRenderer.on("capture-control", handler);
    //   return () => ipcRenderer.removeListener("capture-control", handler);
    // },
    onCaptureControl: (callback) => {
      const handler = (_, command) => callback(command);
      electron.ipcRenderer.on("capture-control", handler);
      return () => electron.ipcRenderer.removeListener("capture-control", handler);
    },
    // Обработчик старта захвата
    onStartCapture: (callback) => {
      const handler = (_, data) => callback(data);
      electron.ipcRenderer.on("start-capture", handler);
      return () => electron.ipcRenderer.removeListener("start-capture", handler);
    },
    // Обработчик остановки захвата
    onStopCapture: (callback) => {
      const handler = () => callback();
      electron.ipcRenderer.on("stop-capture", handler);
      return () => electron.ipcRenderer.removeListener("stop-capture", handler);
    }
  },
  // Распознавание речи (Whisper)
  whisper: {
    // Транскрибирование текущего аудио буфера
    transcribeBuffer: (options) => electron.ipcRenderer.invoke("transcribe-buffer", options),
    // Получение последней транскрипции
    getLastTranscription: () => electron.ipcRenderer.invoke("get-last-transcription"),
    // Обработчик для получения результатов транскрипции
    onTranscriptionResult: (callback) => {
      const handler = (_, result) => callback(result);
      electron.ipcRenderer.on("transcription-result", handler);
      return () => electron.ipcRenderer.removeListener("transcription-result", handler);
    },
    // Обработчик статуса Whisper
    onWhisperStatus: (callback) => {
      const handler = (_, status) => callback(status);
      electron.ipcRenderer.on("whisper-status", handler);
      return () => electron.ipcRenderer.removeListener("whisper-status", handler);
    },
    // Обработчик для обработки аудио данных
    onProcessAudioData: (callback) => {
      const handler = (_, audioData) => callback(audioData);
      electron.ipcRenderer.on("process-audio-data", handler);
      return () => electron.ipcRenderer.removeListener("process-audio-data", handler);
    }
  },
  // Очередь запросов
  queue: {
    // Добавление последней транскрипции в очередь
    addLastTranscriptionToQueue: () => electron.ipcRenderer.invoke("add-last-transcription-to-queue"),
    // Добавление скриншота в очередь
    addScreenshotToQueue: () => electron.ipcRenderer.invoke("add-screenshot-to-queue"),
    // Добавление содержимого буфера обмена в очередь
    addClipboardToQueue: () => electron.ipcRenderer.invoke("add-clipboard-to-queue"),
    // Удаление элемента из очереди
    removeFromQueue: (itemId) => electron.ipcRenderer.invoke("remove-from-queue", itemId),
    // Очистка всей очереди
    clearQueue: () => electron.ipcRenderer.invoke("clear-queue"),
    // Получение текущей очереди
    getQueue: () => electron.ipcRenderer.invoke("get-queue"),
    // Обработчик обновления очереди
    onQueueUpdated: (callback) => {
      const handler = (_, queue) => callback(queue);
      electron.ipcRenderer.on("queue-updated", handler);
      return () => electron.ipcRenderer.removeListener("queue-updated", handler);
    }
  },
  // Генерация ответов через Gemini
  gemini: {
    // Загрузка конфигурации Gemini
    loadConfig: () => electron.ipcRenderer.invoke("load-gemini-config"),
    // Сохранение конфигурации Gemini
    saveConfig: (newConfig) => electron.ipcRenderer.invoke("save-gemini-config", newConfig),
    // Генерация ответа
    generateResponse: (params) => electron.ipcRenderer.invoke("generate-response", params),
    // Остановка генерации
    stopGeneration: () => electron.ipcRenderer.invoke("stop-generation"),
    // Получение статуса генерации
    getGenerationStatus: () => electron.ipcRenderer.invoke("get-generation-status"),
    // Обработчик для получения чанков генерации
    onGenerationChunk: (callback) => {
      const handler = (_, data) => callback(data);
      electron.ipcRenderer.on("generation-chunk", handler);
      return () => electron.ipcRenderer.removeListener("generation-chunk", handler);
    },
    // Обработчик статуса генерации
    onGenerationStatus: (callback) => {
      const handler = (_, status) => callback(status);
      electron.ipcRenderer.on("generation-status", handler);
      return () => electron.ipcRenderer.removeListener("generation-status", handler);
    }
  },
  // Горячие клавиши
  hotkeys: {
    // Получение списка горячих клавиш
    getHotkeys: () => electron.ipcRenderer.invoke("get-hotkeys"),
    // Обработчик горячих клавиш
    onHotkeyTriggered: (callback) => {
      const handler = (_, action) => callback(action);
      electron.ipcRenderer.on("hotkey-triggered", handler);
      return () => electron.ipcRenderer.removeListener("hotkey-triggered", handler);
    }
  },
  // Проверка, идет ли демонстрация экрана
  isScreenSharing: () => electron.ipcRenderer.invoke("is-screen-sharing")
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
