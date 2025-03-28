import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Определение API для интерфейса пользователя
const api = {
  // Аудио и распознавание речи
  audio: {
    // Инициализация захвата аудио
    initAudioCapture: () => ipcRenderer.invoke("initialize-audio-capture"),

    // Обновление настроек аудио захвата
    updateAudioSettings: (newSettings: any) =>
      ipcRenderer.invoke("update-audio-settings", newSettings),

    // Начать запись аудио
    startCapture: (sourceId?: string) =>
      ipcRenderer.invoke("start-audio-capture", sourceId),

    // Остановить запись аудио
    stopCapture: () => ipcRenderer.invoke("stop-audio-capture"),

    // Получить текущий статус захвата аудио
    getCaptureStatus: () => ipcRenderer.invoke("get-capture-status"),

    // Отправить аудио данные в основной процесс
    sendAudioData: (audioData: Uint8Array) =>
      ipcRenderer.send("audio-data", audioData),

    // Сохранить аудио для отладки
    saveDebugAudio: (audioData: Uint8Array) =>
      ipcRenderer.invoke("save-debug-audio", audioData),

    // Обработчик для получения источников аудио
    onAudioSources: (callback: (sources: any[]) => void) => {
      const handler = (_: any, sources: any[]) => callback(sources);
      ipcRenderer.on("audio-sources", handler);
      return () => ipcRenderer.removeListener("audio-sources", handler);
    },

    // Обработчик для получения настроек захвата аудио
    onAudioSettings: (callback: (settings: any) => void) => {
      const handler = (_: any, settings: any) => callback(settings);
      ipcRenderer.on("audio-capture-settings", handler);
      return () =>
        ipcRenderer.removeListener("audio-capture-settings", handler);
    },

    // Обработчик начала/остановки захвата
    // onCaptureControl: (callback: (command: { action: string }) => void) => {
    //   const handler = (_: any, command: { action: string }) =>
    //     callback(command);
    //   ipcRenderer.on("capture-control", handler);
    //   return () => ipcRenderer.removeListener("capture-control", handler);
    // },

    onCaptureControl: (callback: (command: { action: string }) => void) => {
      const handler = (_: any, command: { action: string }) =>
        callback(command);
      ipcRenderer.on("capture-control", handler);
      return () => ipcRenderer.removeListener("capture-control", handler);
    },
    // Обработчик старта захвата
    onStartCapture: (callback: (data: any) => void) => {
      const handler = (_: any, data: any) => callback(data);
      ipcRenderer.on("start-capture", handler);
      return () => ipcRenderer.removeListener("start-capture", handler);
    },

    // Обработчик остановки захвата
    onStopCapture: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("stop-capture", handler);
      return () => ipcRenderer.removeListener("stop-capture", handler);
    },
  },

  // Распознавание речи (Whisper)
  whisper: {
    // Транскрибирование текущего аудио буфера
    transcribeBuffer: (options: { language?: "ru" | "en" | "pl" }) =>
      ipcRenderer.invoke("transcribe-buffer", options),

    // Получение последней транскрипции
    getLastTranscription: () => ipcRenderer.invoke("get-last-transcription"),

    // Обработчик для получения результатов транскрипции
    onTranscriptionResult: (callback: (result: any) => void) => {
      const handler = (_: any, result: any) => callback(result);
      ipcRenderer.on("transcription-result", handler);
      return () => ipcRenderer.removeListener("transcription-result", handler);
    },

    // Обработчик статуса Whisper
    onWhisperStatus: (callback: (status: any) => void) => {
      const handler = (_: any, status: any) => callback(status);
      ipcRenderer.on("whisper-status", handler);
      return () => ipcRenderer.removeListener("whisper-status", handler);
    },

    // Обработчик для обработки аудио данных
    onProcessAudioData: (callback: (audioData: Uint8Array) => void) => {
      const handler = (_: any, audioData: Uint8Array) => callback(audioData);
      ipcRenderer.on("process-audio-data", handler);
      return () => ipcRenderer.removeListener("process-audio-data", handler);
    },
  },

  // Очередь запросов
  queue: {
    // Добавление последней транскрипции в очередь
    addLastTranscriptionToQueue: () =>
      ipcRenderer.invoke("add-last-transcription-to-queue"),

    // Добавление скриншота в очередь
    addScreenshotToQueue: () => ipcRenderer.invoke("add-screenshot-to-queue"),

    // Добавление содержимого буфера обмена в очередь
    addClipboardToQueue: () => ipcRenderer.invoke("add-clipboard-to-queue"),

    // Удаление элемента из очереди
    removeFromQueue: (itemId: string) =>
      ipcRenderer.invoke("remove-from-queue", itemId),

    // Очистка всей очереди
    clearQueue: () => ipcRenderer.invoke("clear-queue"),

    // Получение текущей очереди
    getQueue: () => ipcRenderer.invoke("get-queue"),

    // Обработчик обновления очереди
    onQueueUpdated: (callback: (queue: any[]) => void) => {
      const handler = (_: any, queue: any[]) => callback(queue);
      ipcRenderer.on("queue-updated", handler);
      return () => ipcRenderer.removeListener("queue-updated", handler);
    },
  },

  // Генерация ответов через Gemini
  gemini: {
    // Загрузка конфигурации Gemini
    loadConfig: () => ipcRenderer.invoke("load-gemini-config"),

    // Сохранение конфигурации Gemini
    saveConfig: (newConfig: any) =>
      ipcRenderer.invoke("save-gemini-config", newConfig),

    // Генерация ответа
    generateResponse: (params: {
      texts: string[];
      images: string[];
      streaming?: boolean;
    }) => ipcRenderer.invoke("generate-response", params),

    // Остановка генерации
    stopGeneration: () => ipcRenderer.invoke("stop-generation"),

    // Получение статуса генерации
    getGenerationStatus: () => ipcRenderer.invoke("get-generation-status"),

    // Обработчик для получения чанков генерации
    onGenerationChunk: (callback: (data: { chunk: string }) => void) => {
      const handler = (_: any, data: { chunk: string }) => callback(data);
      ipcRenderer.on("generation-chunk", handler);
      return () => ipcRenderer.removeListener("generation-chunk", handler);
    },

    // Обработчик статуса генерации
    onGenerationStatus: (callback: (status: any) => void) => {
      const handler = (_: any, status: any) => callback(status);
      ipcRenderer.on("generation-status", handler);
      return () => ipcRenderer.removeListener("generation-status", handler);
    },
  },

  // Горячие клавиши
  hotkeys: {
    // Получение списка горячих клавиш
    getHotkeys: () => ipcRenderer.invoke("get-hotkeys"),

    // Обработчик горячих клавиш
    onHotkeyTriggered: (callback: (action: string) => void) => {
      const handler = (_: any, action: string) => callback(action);
      ipcRenderer.on("hotkey-triggered", handler);
      return () => ipcRenderer.removeListener("hotkey-triggered", handler);
    },
  },

  // Проверка, идет ли демонстрация экрана
  isScreenSharing: () => ipcRenderer.invoke("is-screen-sharing"),
};

// Открываем API для окна рендерера
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (определено в d.ts)
  window.electron = electronAPI;
  // @ts-ignore (определено в d.ts)
  window.api = api;
}
