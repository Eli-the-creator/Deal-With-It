// import {
//   app,
//   shell,
//   BrowserWindow,
//   globalShortcut,
//   screen,
//   ipcMain,
//   desktopCapturer, // Added proper import here
// } from "electron";
// import { join } from "path";
// import { electronApp, optimizer, is } from "@electron-toolkit/utils";
// import icon from "../../resources/icon.png?asset";

// // Импорт исходного кода системы
// import { setupWhisperService } from "./services/whisper";
// import { setupGeminiService } from "./services/gemini";
// import { setupAudioCapture } from "./services/audio-capture";
// import { registerHotkeys } from "./services/hotkeys";
// import { setupQueueService } from "./services/queue";

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
//   // ipcMain.handle("is-screen-sharing", () => {
//   //   // Во время демонстрации экрана скрываем приложение
//   //   return mainWindow
//   //     ?.getContentSource()
//   //     .then((source) => {
//   //       if (source && source.id) {
//   //         mainWindow?.hide();
//   //         return true;
//   //       }
//   //       return false;
//   //     })
//   //     .catch(() => false);
//   // });
//   ipcMain.handle("is-screen-sharing", () => {
//     // During screen sharing we hide the application
//     try {
//       // Check if this method is available (it may not be in some Electron versions)
//       if (mainWindow && typeof mainWindow.getContentSource === "function") {
//         return mainWindow
//           .getContentSource()
//           .then((source) => {
//             if (source && source.id) {
//               mainWindow.hide();
//               return true;
//             }
//             return false;
//           })
//           .catch(() => false);
//       } else {
//         // Fallback for Electron versions that don't support getContentSource
//         console.log("getContentSource method not available, using fallback");
//         return false;
//       }
//     } catch (error) {
//       console.error("Error checking screen sharing:", error);
//       return false;
//     }
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

// // Экспортируем desktopCapturer для использования в других модулях
// export { desktopCapturer };

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

// Импорт исходного кода системы
import { setupWhisperService } from "./services/whisper";
import { setupGeminiService } from "./services/gemini";
import { setupAudioCapture } from "./services/audio-capture";
import { registerHotkeys } from "./services/hotkeys";
import { setupQueueService } from "./services/queue";
import { setupDeepgramService } from "./services/deepgram-service";

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
  setupDeepgramService(mainWindow); // Initialize DeepGram service
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
    // During screen sharing we hide the application
    try {
      // Check if this method is available (it may not be in some Electron versions)
      if (mainWindow && typeof mainWindow.getContentSource === "function") {
        return mainWindow
          .getContentSource()
          .then((source) => {
            if (source && source.id) {
              mainWindow.hide();
              return true;
            }
            return false;
          })
          .catch(() => false);
      } else {
        // Fallback for Electron versions that don't support getContentSource
        console.log("getContentSource method not available, using fallback");
        return false;
      }
    } catch (error) {
      console.error("Error checking screen sharing:", error);
      return false;
    }
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
