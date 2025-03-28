// import { globalShortcut, ipcMain, BrowserWindow } from "electron";

// // Интерфейс для колбэков горячих клавиш
// interface HotkeyCallbacks {
//   toggleVisibility: () => void;
//   moveWindow: (direction: "up" | "down" | "left" | "right") => void;
//   onAddLastText?: () => void;
//   onAddScreenshot?: () => void;
//   onSendQueue?: () => void;
//   onClearQueue?: () => void;
//   onToggleCollapse?: () => void;
//   onToggleCapture?: () => void;
// }

// // Список горячих клавиш с описанием
// // const HOTKEYS = {
// //   ADD_LAST_TEXT: "CommandOrControl+I", // Добавление последнего распознанного текста
// //   ADD_SCREENSHOT: "CommandOrControl+H", // Создание и добавление скриншота
// //   SEND_QUEUE: "CommandOrControl+Enter", // Отправка очереди в LLM
// //   CLEAR_QUEUE: "CommandOrControl+R", // Очистка очереди
// //   TOGGLE_COLLAPSE: "CommandOrControl+B", // Сворачивание/разворачивание интерфейса
// //   MOVE_UP: "CommandOrControl+Up", // Перемещение панели вверх
// //   MOVE_DOWN: "CommandOrControl+Down", // Перемещение панели вниз
// //   MOVE_LEFT: "CommandOrControl+Left", // Перемещение панели влево
// //   MOVE_RIGHT: "CommandOrControl+Right", // Перемещение панели вправо
// // };

// const HOTKEYS = {
//   ADD_LAST_TEXT: "CommandOrControl+O", // Добавление последнего распознанного текста
//   TOGGLE_CAPTURE: "CommandOrControl+I", // Включение/выключение записи микрофона
//   ADD_SCREENSHOT: "CommandOrControl+H", // Создание и добавление скриншота
//   SEND_QUEUE: "CommandOrControl+Enter", // Отправка очереди в LLM
//   CLEAR_QUEUE: "CommandOrControl+R", // Очистка очереди
//   TOGGLE_COLLAPSE: "CommandOrControl+B", // Сворачивание/разворачивание интерфейса
//   MOVE_UP: "CommandOrControl+Up", // Перемещение панели вверх
//   MOVE_DOWN: "CommandOrControl+Down", // Перемещение панели вниз
//   MOVE_LEFT: "CommandOrControl+Left", // Перемещение панели влево
//   MOVE_RIGHT: "CommandOrControl+Right", // Перемещение панели вправо
// };

// // Хранение состояния зарегистрированных горячих клавиш
// let registeredHotkeys: string[] = [];

// // Регистрация горячих клавиш
// // export function registerHotkeys(callbacks: HotkeyCallbacks): void {
// //   // Очищаем ранее зарегистрированные горячие клавиши
// //   unregisterAllHotkeys();

// //   try {
// //     // Регистрация клавиши для перемещения окна вверх
// //     globalShortcut.register(HOTKEYS.MOVE_UP, () => {
// //       callbacks.moveWindow("up");
// //     });
// //     registeredHotkeys.push(HOTKEYS.MOVE_UP);

// //     // Регистрация клавиши для перемещения окна вниз
// //     globalShortcut.register(HOTKEYS.MOVE_DOWN, () => {
// //       callbacks.moveWindow("down");
// //     });
// //     registeredHotkeys.push(HOTKEYS.MOVE_DOWN);

// //     // Регистрация клавиши для перемещения окна влево
// //     globalShortcut.register(HOTKEYS.MOVE_LEFT, () => {
// //       callbacks.moveWindow("left");
// //     });
// //     registeredHotkeys.push(HOTKEYS.MOVE_LEFT);

// //     // Регистрация клавиши для перемещения окна вправо
// //     globalShortcut.register(HOTKEYS.MOVE_RIGHT, () => {
// //       callbacks.moveWindow("right");
// //     });
// //     registeredHotkeys.push(HOTKEYS.MOVE_RIGHT);

// //     // Регистрация клавиши для сворачивания/разворачивания интерфейса
// //     globalShortcut.register(HOTKEYS.TOGGLE_COLLAPSE, () => {
// //       callbacks.toggleVisibility();
// //     });
// //     registeredHotkeys.push(HOTKEYS.TOGGLE_COLLAPSE);

// //     // Остальные горячие клавиши обрабатываются через IPC, т.к. они взаимодействуют с рендерером
// //     globalShortcut.register(HOTKEYS.ADD_LAST_TEXT, () => {
// //       BrowserWindow.getAllWindows().forEach((window) => {
// //         window.webContents.send("hotkey-triggered", "add-last-text");
// //       });
// //     });
// //     registeredHotkeys.push(HOTKEYS.ADD_LAST_TEXT);

// //     globalShortcut.register(HOTKEYS.ADD_SCREENSHOT, () => {
// //       BrowserWindow.getAllWindows().forEach((window) => {
// //         window.webContents.send("hotkey-triggered", "add-screenshot");
// //       });
// //     });
// //     registeredHotkeys.push(HOTKEYS.ADD_SCREENSHOT);

// //     globalShortcut.register(HOTKEYS.SEND_QUEUE, () => {
// //       BrowserWindow.getAllWindows().forEach((window) => {
// //         window.webContents.send("hotkey-triggered", "send-queue");
// //       });
// //     });
// //     registeredHotkeys.push(HOTKEYS.SEND_QUEUE);

// //     globalShortcut.register(HOTKEYS.CLEAR_QUEUE, () => {
// //       BrowserWindow.getAllWindows().forEach((window) => {
// //         window.webContents.send("hotkey-triggered", "clear-queue");
// //       });
// //     });
// //     registeredHotkeys.push(HOTKEYS.CLEAR_QUEUE);

// //     console.log("Горячие клавиши успешно зарегистрированы");
// //   } catch (error) {
// //     console.error("Ошибка при регистрации горячих клавиш:", error);
// //   }

// //   // Настройка IPC для получения горячих клавиш из рендерера
// //   ipcMain.handle("get-hotkeys", () => {
// //     return HOTKEYS;
// //   });
// // }

// // Регистрация горячих клавиш
// export function registerHotkeys(callbacks: HotkeyCallbacks): void {
//   // Очищаем ранее зарегистрированные горячие клавиши
//   unregisterAllHotkeys();

//   try {
//     // Регистрация клавиши для toggle микрофона
//     globalShortcut.register(HOTKEYS.TOGGLE_CAPTURE, () => {
//       BrowserWindow.getAllWindows().forEach((window) => {
//         window.webContents.send("hotkey-triggered", "toggle-capture");
//       });
//     });
//     registeredHotkeys.push(HOTKEYS.TOGGLE_CAPTURE);

//     // Регистрация клавиши для добавления последней транскрипции в очередь
//     globalShortcut.register(HOTKEYS.ADD_LAST_TEXT, () => {
//       BrowserWindow.getAllWindows().forEach((window) => {
//         window.webContents.send("hotkey-triggered", "add-last-text");
//       });
//     });
//     registeredHotkeys.push(HOTKEYS.ADD_LAST_TEXT);

//     // Регистрация клавиши для перемещения окна вверх
//     globalShortcut.register(HOTKEYS.MOVE_UP, () => {
//       callbacks.moveWindow("up");
//     });
//     registeredHotkeys.push(HOTKEYS.MOVE_UP);

//     // Регистрация клавиши для перемещения окна вниз
//     globalShortcut.register(HOTKEYS.MOVE_DOWN, () => {
//       callbacks.moveWindow("down");
//     });
//     registeredHotkeys.push(HOTKEYS.MOVE_DOWN);

//     // Регистрация клавиши для перемещения окна влево
//     globalShortcut.register(HOTKEYS.MOVE_LEFT, () => {
//       callbacks.moveWindow("left");
//     });
//     registeredHotkeys.push(HOTKEYS.MOVE_LEFT);

//     // Регистрация клавиши для перемещения окна вправо
//     globalShortcut.register(HOTKEYS.MOVE_RIGHT, () => {
//       callbacks.moveWindow("right");
//     });
//     registeredHotkeys.push(HOTKEYS.MOVE_RIGHT);

//     // Регистрация клавиши для сворачивания/разворачивания интерфейса
//     globalShortcut.register(HOTKEYS.TOGGLE_COLLAPSE, () => {
//       callbacks.toggleVisibility();
//     });
//     registeredHotkeys.push(HOTKEYS.TOGGLE_COLLAPSE);

//     // Остальные регистрации клавиш
//     globalShortcut.register(HOTKEYS.ADD_SCREENSHOT, () => {
//       BrowserWindow.getAllWindows().forEach((window) => {
//         window.webContents.send("hotkey-triggered", "add-screenshot");
//       });
//     });
//     registeredHotkeys.push(HOTKEYS.ADD_SCREENSHOT);

//     globalShortcut.register(HOTKEYS.SEND_QUEUE, () => {
//       BrowserWindow.getAllWindows().forEach((window) => {
//         window.webContents.send("hotkey-triggered", "send-queue");
//       });
//     });
//     registeredHotkeys.push(HOTKEYS.SEND_QUEUE);

//     globalShortcut.register(HOTKEYS.CLEAR_QUEUE, () => {
//       BrowserWindow.getAllWindows().forEach((window) => {
//         window.webContents.send("hotkey-triggered", "clear-queue");
//       });
//     });
//     registeredHotkeys.push(HOTKEYS.CLEAR_QUEUE);

//     console.log("Горячие клавиши успешно зарегистрированы");
//   } catch (error) {
//     console.error("Ошибка при регистрации горячих клавиш:", error);
//   }

//   // Настройка IPC для получения горячих клавиш из рендерера
//   ipcMain.handle("get-hotkeys", () => {
//     return HOTKEYS;
//   });
// }

// // Отмена регистрации всех горячих клавиш
// export function unregisterAllHotkeys(): void {
//   try {
//     registeredHotkeys.forEach((hotkey) => {
//       if (globalShortcut.isRegistered(hotkey)) {
//         globalShortcut.unregister(hotkey);
//       }
//     });
//     registeredHotkeys = [];
//     console.log("Все горячие клавиши отменены");
//   } catch (error) {
//     console.error("Ошибка при отмене регистрации горячих клавиш:", error);
//   }
// }

import { globalShortcut, ipcMain, BrowserWindow } from "electron";

// Интерфейс для колбэков горячих клавиш
interface HotkeyCallbacks {
  toggleVisibility: () => void;
  moveWindow: (direction: "up" | "down" | "left" | "right") => void;
}

// Список горячих клавиш с описанием
const HOTKEYS = {
  TOGGLE_CAPTURE: "CommandOrControl+I", // Включение/выключение записи микрофона
  ADD_LAST_TEXT: "CommandOrControl+O", // Добавление последнего распознанного текста
  ADD_SCREENSHOT: "CommandOrControl+H", // Создание и добавление скриншота
  SEND_QUEUE: "CommandOrControl+Enter", // Отправка очереди в LLM
  CLEAR_QUEUE: "CommandOrControl+R", // Очистка очереди
  TOGGLE_COLLAPSE: "CommandOrControl+B", // Сворачивание/разворачивание интерфейса
  MOVE_UP: "CommandOrControl+Up", // Перемещение панели вверх
  MOVE_DOWN: "CommandOrControl+Down", // Перемещение панели вниз
  MOVE_LEFT: "CommandOrControl+Left", // Перемещение панели влево
  MOVE_RIGHT: "CommandOrControl+Right", // Перемещение панели вправо
};

// Хранение состояния зарегистрированных горячих клавиш
let registeredHotkeys: string[] = [];

// Регистрация горячих клавиш
export function registerHotkeys(callbacks: HotkeyCallbacks): void {
  // Очищаем ранее зарегистрированные горячие клавиши
  unregisterAllHotkeys();

  try {
    console.log("Регистрация горячих клавиш...");

    // Регистрация клавиши для toggle микрофона
    globalShortcut.register(HOTKEYS.TOGGLE_CAPTURE, () => {
      console.log("Горячая клавиша нажата: TOGGLE_CAPTURE");
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send("hotkey-triggered", "toggle-capture");
      });
    });
    registeredHotkeys.push(HOTKEYS.TOGGLE_CAPTURE);

    // Регистрация клавиши для добавления последней транскрипции в очередь
    globalShortcut.register(HOTKEYS.ADD_LAST_TEXT, () => {
      console.log("Горячая клавиша нажата: ADD_LAST_TEXT");
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send("hotkey-triggered", "add-last-text");
      });
    });
    registeredHotkeys.push(HOTKEYS.ADD_LAST_TEXT);

    // Регистрация клавиши для перемещения окна вверх
    globalShortcut.register(HOTKEYS.MOVE_UP, () => {
      callbacks.moveWindow("up");
    });
    registeredHotkeys.push(HOTKEYS.MOVE_UP);

    // Регистрация клавиши для перемещения окна вниз
    globalShortcut.register(HOTKEYS.MOVE_DOWN, () => {
      callbacks.moveWindow("down");
    });
    registeredHotkeys.push(HOTKEYS.MOVE_DOWN);

    // Регистрация клавиши для перемещения окна влево
    globalShortcut.register(HOTKEYS.MOVE_LEFT, () => {
      callbacks.moveWindow("left");
    });
    registeredHotkeys.push(HOTKEYS.MOVE_LEFT);

    // Регистрация клавиши для перемещения окна вправо
    globalShortcut.register(HOTKEYS.MOVE_RIGHT, () => {
      callbacks.moveWindow("right");
    });
    registeredHotkeys.push(HOTKEYS.MOVE_RIGHT);

    // Регистрация клавиши для сворачивания/разворачивания интерфейса
    globalShortcut.register(HOTKEYS.TOGGLE_COLLAPSE, () => {
      callbacks.toggleVisibility();
    });
    registeredHotkeys.push(HOTKEYS.TOGGLE_COLLAPSE);

    // Остальные регистрации клавиш
    globalShortcut.register(HOTKEYS.ADD_SCREENSHOT, () => {
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send("hotkey-triggered", "add-screenshot");
      });
    });
    registeredHotkeys.push(HOTKEYS.ADD_SCREENSHOT);

    globalShortcut.register(HOTKEYS.SEND_QUEUE, () => {
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send("hotkey-triggered", "send-queue");
      });
    });
    registeredHotkeys.push(HOTKEYS.SEND_QUEUE);

    globalShortcut.register(HOTKEYS.CLEAR_QUEUE, () => {
      BrowserWindow.getAllWindows().forEach((window) => {
        window.webContents.send("hotkey-triggered", "clear-queue");
      });
    });
    registeredHotkeys.push(HOTKEYS.CLEAR_QUEUE);

    console.log("Горячие клавиши успешно зарегистрированы");
  } catch (error) {
    console.error("Ошибка при регистрации горячих клавиш:", error);
  }

  // Настройка IPC для получения горячих клавиш из рендерера
  ipcMain.handle("get-hotkeys", () => {
    return HOTKEYS;
  });
}

// Отмена регистрации всех горячих клавиш
export function unregisterAllHotkeys(): void {
  try {
    registeredHotkeys.forEach((hotkey) => {
      if (globalShortcut.isRegistered(hotkey)) {
        globalShortcut.unregister(hotkey);
      }
    });
    registeredHotkeys = [];
    console.log("Все горячие клавиши отменены");
  } catch (error) {
    console.error("Ошибка при отмене регистрации горячих клавиш:", error);
  }
}
