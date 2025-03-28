// import {
//   app,
//   shell,
//   BrowserWindow,
//   globalShortcut,
//   screen,
//   ipcMain,
//   desktopCapturer,
// } from "electron";
// import { join } from "path";
// import { electronApp, optimizer, is } from "@electron-toolkit/utils";
// import icon from "../../resources/icon.png?asset";
// import { writeFileSync } from "fs";

// // Импорт исходного кода системы
// import { setupWhisperService } from "./services/whisper";
// import { setupGeminiService } from "./services/gemini";
// import { setupAudioCapture } from "./services/audio-capture";
// import { registerHotkeys } from "./services/hotkeys";
// import { setupQueueService } from "./services/queue";

// // Настройки захвата аудио
// interface AudioCaptureSettings {
//   captureMicrophone: boolean;
//   captureSystemAudio: boolean;
//   sampleRate: number; // Частота дискретизации (обычно 16000 для Whisper)
//   channels: number; // Количество каналов (1 - моно, 2 - стерео)
// }

// // Хранение окон приложения
// let mainWindow: BrowserWindow | null = null;
// let isVisible = true;

// function createWindow(): void {
//   // Получаем размер основного экрана
//   const primaryDisplay = screen.getPrimaryDisplay();
//   const { width, height } = primaryDisplay.workAreaSize;

//   // Создаем основное окно
//   mainWindow = new BrowserWindow({
//     width: 660,
//     height: 320,
//     x: width - 720,
//     y: height - 650,
//     show: false,
//     frame: false,
//     transparent: true,
//     resizable: false,
//     skipTaskbar: false,
//     alwaysOnTop: true,
//     webPreferences: {
//       preload: join(__dirname, "../preload/index.js"),
//       sandbox: false,
//       contextIsolation: true,
//       nodeIntegration: false,
//     },
//   });

//   // Настраиваем поведение окна
//   mainWindow.on("ready-to-show", () => {
//     mainWindow?.show();
//   });

//   // Запрещаем изменение размеров окна
//   mainWindow.setResizable(false);

//   // Предотвращаем открытие внешних ссылок в приложении
//   mainWindow.webContents.setWindowOpenHandler((details) => {
//     shell.openExternal(details.url);
//     return { action: "deny" };
//   });

//   // Загружаем UI
//   if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
//     mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
//   } else {
//     mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
//   }

//   // Инициализируем сервисы
//   setupWhisperService(mainWindow);
//   setupGeminiService(mainWindow);
//   setupAudioCapture(mainWindow);
//   setupQueueService(mainWindow);
// }

// // Инициализация приложения
// app.whenReady().then(() => {
//   // Установка ID для Windows
//   electronApp.setAppUserModelId("com.voice-copilot");

//   // Настройка DevTools в режиме разработки
//   app.on("browser-window-created", (_, window) => {
//     optimizer.watchWindowShortcuts(window);
//   });

//   // Создаем главное окно
//   createWindow();

//   // Регистрируем горячие клавиши
//   registerHotkeys({
//     toggleVisibility: () => {
//       if (mainWindow) {
//         if (isVisible) {
//           mainWindow.hide();
//         } else {
//           mainWindow.show();
//         }
//         isVisible = !isVisible;
//       }
//     },
//     moveWindow: (direction) => {
//       if (mainWindow) {
//         const [x, y] = mainWindow.getPosition();
//         const step = 62; // Шаг перемещения в пикселях

//         switch (direction) {
//           case "up":
//             mainWindow.setPosition(x, y - step);
//             break;
//           case "down":
//             mainWindow.setPosition(x, y + step);
//             break;
//           case "left":
//             mainWindow.setPosition(x - step, y);
//             break;
//           case "right":
//             mainWindow.setPosition(x + step, y);
//             break;
//         }
//       }
//     },
//   });

//   // IPC обработчики
//   ipcMain.handle("is-screen-sharing", () => {
//     // Во время демонстрации экрана скрываем приложение
//     return mainWindow
//       ?.getContentSource()
//       .then((source) => {
//         if (source && source.id) {
//           mainWindow?.hide();
//           return true;
//         }
//         return false;
//       })
//       .catch(() => false);
//   });

//   // Восстановление окна при активации (macOS)
//   app.on("activate", function () {
//     if (BrowserWindow.getAllWindows().length === 0) createWindow();
//   });
// });

// // Корректное завершение работы приложения
// app.on("window-all-closed", () => {
//   // На macOS обычно не закрываем приложение полностью
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });

// // Отмена регистрации горячих клавиш при выходе
// app.on("will-quit", () => {
//   globalShortcut.unregisterAll();
// });

// // Состояние захвата аудио
// let isCapturing = false;
// let captureSettings: AudioCaptureSettings = {
//   captureMicrophone: true,
//   captureSystemAudio: true,
//   sampleRate: 16000, // Оптимально для Whisper
//   channels: 1, // Моно для лучшего распознавания речи
// };

// // // Настройка сервиса аудиозахвата
// export function setupAudioCapture(mainWindow: BrowserWindow): void {
//   console.log("Setting up audio capture service...");

//   // Отправка настроек захвата аудио в рендерер
//   const sendCaptureSettings = () => {
//     mainWindow.webContents.send("audio-capture-settings", captureSettings);
//     console.log("Sent audio capture settings to renderer", captureSettings);
//   };

//   // Инициализация захвата аудио
//   ipcMain.handle("initialize-audio-capture", async () => {
//     try {
//       console.log("Initializing audio capture...");

//       // Получаем список доступных аудиоисточников
//       const sources = await desktopCapturer.getSources({
//         types: ["audio"],
//         fetchWindowIcons: false,
//       });

//       console.log(`Found ${sources.length} audio sources`);

//       // Отправляем список источников в интерфейс
//       mainWindow.webContents.send("audio-sources", sources);

//       // Отправляем текущие настройки
//       sendCaptureSettings();

//       return { success: true };
//     } catch (error) {
//       console.error("Ошибка при инициализации захвата аудио:", error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : "Неизвестная ошибка",
//       };
//     }
//   });

//   // Обработчик для изменения настроек захвата
//   ipcMain.handle(
//     "update-audio-settings",
//     (_, newSettings: Partial<AudioCaptureSettings>) => {
//       console.log("Updating audio settings", newSettings);

//       captureSettings = {
//         ...captureSettings,
//         ...newSettings,
//       };

//       // Отправляем обновленные настройки в интерфейс
//       sendCaptureSettings();

//       return captureSettings;
//     }
//   );

//   // Начало захвата аудио
//   ipcMain.handle("start-audio-capture", async (_, sourceId?: string) => {
//     console.log("Received request to start audio capture", {
//       sourceId,
//       isAlreadyCapturing: isCapturing,
//     });

//     if (isCapturing) {
//       return { success: true, alreadyCapturing: true };
//     }

//     try {
//       // Отправляем команду в рендерер для начала захвата аудио через WebRTC
//       mainWindow.webContents.send("start-capture", {
//         sourceId,
//         settings: captureSettings,
//       });

//       isCapturing = true;
//       console.log("Audio capture started successfully");
//       return { success: true };
//     } catch (error) {
//       console.error("Ошибка при запуске захвата аудио:", error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : "Неизвестная ошибка",
//       };
//     }
//   });

//   // Остановка захвата аудио
//   ipcMain.handle("stop-audio-capture", () => {
//     console.log("Received request to stop audio capture", {
//       isCurrentlyCapturing: isCapturing,
//     });

//     if (!isCapturing) {
//       return { success: true, notCapturing: true };
//     }

//     try {
//       mainWindow.webContents.send("stop-capture");
//       isCapturing = false;
//       console.log("Audio capture stopped successfully");
//       return { success: true };
//     } catch (error) {
//       console.error("Ошибка при остановке захвата аудио:", error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : "Неизвестная ошибка",
//       };
//     }
//   });

//   // Получение текущего состояния захвата
//   ipcMain.handle("get-capture-status", () => {
//     console.log("Getting capture status", {
//       isCapturing,
//       settings: captureSettings,
//     });
//     return {
//       isCapturing,
//       settings: captureSettings,
//     };
//   });

//   // Обработка аудио данных из рендерера
//   ipcMain.on("audio-data", (_, audioData) => {
//     // Пересылаем данные в whisper сервис
//     mainWindow.webContents.send("process-audio-data", audioData);
//     console.log(`Received and forwarded audio data: ${audioData.length} bytes`);
//   });

//   // Сохранение временного аудиофайла (для отладки)
//   ipcMain.handle("save-debug-audio", (_, audioData: Buffer) => {
//     try {
//       const debugFilePath = join(app.getPath("temp"), "debug_audio.wav");
//       writeFileSync(debugFilePath, audioData);
//       console.log(`Saved debug audio to ${debugFilePath}`);
//       return { success: true, path: debugFilePath };
//     } catch (error) {
//       console.error("Ошибка при сохранении отладочного аудио:", error);
//       return {
//         success: false,
//         error: error instanceof Error ? error.message : "Неизвестная ошибка",
//       };
//     }
//   });

//   console.log("Audio capture service setup complete");
// }

import {
  app,
  shell,
  BrowserWindow,
  globalShortcut,
  screen,
  ipcMain,
  desktopCapturer, // Added proper import here
} from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import icon from "../../resources/icon.png?asset";

// Импорт исходного кода системы
import { setupWhisperService } from "./services/whisper";
import { setupGeminiService } from "./services/gemini";
import { setupAudioCapture } from "./services/audio-capture";
import { registerHotkeys } from "./services/hotkeys";
import { setupQueueService } from "./services/queue";

// Хранение окон приложения
let mainWindow: BrowserWindow | null = null;
let isVisible = true;

function createWindow(): void {
  // Получаем размер основного экрана
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Создаем основное окно
  mainWindow = new BrowserWindow({
    width: 660,
    height: 320,
    x: width - 720,
    y: height - 650,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Настраиваем поведение окна
  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  // Запрещаем изменение размеров окна
  mainWindow.setResizable(false);

  // Предотвращаем открытие внешних ссылок в приложении
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Загружаем UI
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Инициализируем сервисы
  setupWhisperService(mainWindow);
  setupGeminiService(mainWindow);
  setupAudioCapture(mainWindow);
  setupQueueService(mainWindow);
}

// Инициализация приложения
app.whenReady().then(() => {
  // Установка ID для Windows
  electronApp.setAppUserModelId("com.voice-copilot");

  // Настройка DevTools в режиме разработки
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Создаем главное окно
  createWindow();

  // Регистрируем горячие клавиши
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
        const step = 62; // Шаг перемещения в пикселях

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

  // IPC обработчики
  ipcMain.handle("is-screen-sharing", () => {
    // Во время демонстрации экрана скрываем приложение
    return mainWindow
      ?.getContentSource()
      .then((source) => {
        if (source && source.id) {
          mainWindow?.hide();
          return true;
        }
        return false;
      })
      .catch(() => false);
  });

  // Восстановление окна при активации (macOS)
  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Корректное завершение работы приложения
app.on("window-all-closed", () => {
  // На macOS обычно не закрываем приложение полностью
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Отмена регистрации горячих клавиш при выходе
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Экспортируем desktopCapturer для использования в других модулях
export { desktopCapturer };
