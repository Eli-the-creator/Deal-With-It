import { BrowserWindow, ipcMain, desktopCapturer } from "electron";
import { join } from "path";
import { writeFileSync } from "fs";
import { app } from "electron";

// Настройки захвата аудио
interface AudioCaptureSettings {
  captureMicrophone: boolean;
  captureSystemAudio: boolean;
  sampleRate: number; // Частота дискретизации (обычно 16000 для Whisper)
  channels: number; // Количество каналов (1 - моно, 2 - стерео)
}

// Состояние захвата аудио
let isCapturing = false;
let captureSettings: AudioCaptureSettings = {
  captureMicrophone: true,
  captureSystemAudio: true,
  sampleRate: 16000, // Оптимально для Whisper
  channels: 1, // Моно для лучшего распознавания речи
};

// Настройка сервиса аудиозахвата
export function setupAudioCapture(mainWindow: BrowserWindow): void {
  // Отправка настроек захвата аудио в рендерер
  const sendCaptureSettings = () => {
    mainWindow.webContents.send("audio-capture-settings", captureSettings);
  };

  // Инициализация захвата аудио
  ipcMain.handle("initialize-audio-capture", async () => {
    try {
      // Получаем список доступных аудиоисточников
      const sources = await desktopCapturer.getSources({
        types: ["audio"],
        fetchWindowIcons: false,
      });

      // Отправляем список источников в интерфейс
      mainWindow.webContents.send("audio-sources", sources);

      // Отправляем текущие настройки
      sendCaptureSettings();

      return { success: true };
    } catch (error) {
      console.error("Ошибка при инициализации захвата аудио:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    }
  });

  // Обработчик для изменения настроек захвата
  ipcMain.handle(
    "update-audio-settings",
    (_, newSettings: Partial<AudioCaptureSettings>) => {
      captureSettings = {
        ...captureSettings,
        ...newSettings,
      };

      // Отправляем обновленные настройки в интерфейс
      sendCaptureSettings();

      return captureSettings;
    }
  );

  // Начало захвата аудио
  ipcMain.handle("start-audio-capture", async (_, sourceId?: string) => {
    if (isCapturing) {
      return { success: true, alreadyCapturing: true };
    }

    try {
      // Отправляем команду в рендерер для начала захвата аудио через WebRTC
      mainWindow.webContents.send("start-capture", {
        sourceId,
        settings: captureSettings,
      });

      isCapturing = true;
      return { success: true };
    } catch (error) {
      console.error("Ошибка при запуске захвата аудио:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    }
  });

  // Остановка захвата аудио
  ipcMain.handle("stop-audio-capture", () => {
    if (!isCapturing) {
      return { success: true, notCapturing: true };
    }

    try {
      mainWindow.webContents.send("stop-capture");
      isCapturing = false;
      return { success: true };
    } catch (error) {
      console.error("Ошибка при остановке захвата аудио:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    }
  });

  // Получение текущего состояния захвата
  ipcMain.handle("get-capture-status", () => {
    return {
      isCapturing,
      settings: captureSettings,
    };
  });

  // Обработка аудио данных из рендерера
  ipcMain.on("audio-data", (_, audioData) => {
    // Пересылаем данные в whisper сервис
    mainWindow.webContents.send("process-audio-data", audioData);
  });

  // Сохранение временного аудиофайла (для отладки)
  ipcMain.handle("save-debug-audio", (_, audioData: Buffer) => {
    try {
      const debugFilePath = join(app.getPath("temp"), "debug_audio.wav");
      writeFileSync(debugFilePath, audioData);
      return { success: true, path: debugFilePath };
    } catch (error) {
      console.error("Ошибка при сохранении отладочного аудио:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    }
  });
}
