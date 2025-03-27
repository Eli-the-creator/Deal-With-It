import { BrowserWindow, ipcMain, clipboard, nativeImage } from "electron";
import { getLastTranscription } from "./whisper";
import path from "path";
import { app } from "electron";
import { writeFileSync, existsSync, mkdirSync } from "fs";

// Типы элементов очереди
type QueueItemType = "text" | "image";

// Интерфейс элемента очереди
interface QueueItem {
  id: string;
  type: QueueItemType;
  content: string; // Для текста - сам текст, для изображения - путь к файлу
  timestamp: number;
  isQuestion: boolean;
}

// Очередь запросов
let requestsQueue: QueueItem[] = [];

// Настройка сервиса очереди
export function setupQueueService(mainWindow: BrowserWindow): void {
  // Создаем папку для временных файлов, если ее нет
  const tempDir = path.join(app.getPath("temp"), "voiceCopilot");
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  // Добавление последнего распознанного текста в очередь
  ipcMain.handle("add-last-transcription-to-queue", () => {
    const lastTranscription = getLastTranscription();

    if (!lastTranscription) {
      return { success: false, error: "Нет распознанного текста" };
    }

    const id = `text-${Date.now()}`;
    const isQuestion = detectQuestion(lastTranscription.text);

    const queueItem: QueueItem = {
      id,
      type: "text",
      content: lastTranscription.text,
      timestamp: Date.now(),
      isQuestion,
    };

    requestsQueue.push(queueItem);

    // Отправляем обновленную очередь в рендерер
    mainWindow.webContents.send("queue-updated", requestsQueue);

    return { success: true, item: queueItem };
  });

  // Создание и добавление скриншота в очередь
  ipcMain.handle("add-screenshot-to-queue", async () => {
    try {
      // Скрываем окно приложения перед скриншотом
      const wasVisible = mainWindow.isVisible();
      if (wasVisible) mainWindow.hide();

      // Небольшая задержка, чтобы окно успело скрыться
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Получаем скриншот всего экрана
      const primaryDisplay = require("electron").screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;

      // Создаем объект captureWindow с размерами экрана
      const captureWindow = new BrowserWindow({
        width,
        height,
        show: false,
        frame: false,
        transparent: true,
        skipTaskbar: true,
        alwaysOnTop: false,
      });

      // Делаем скриншот
      const screenshot = await captureWindow.webContents.capturePage({
        x: 0,
        y: 0,
        width,
        height,
      });

      // Закрываем окно для скриншота
      captureWindow.close();

      // Сохраняем скриншот
      const screenshotId = Date.now();
      const screenshotPath = path.join(
        tempDir,
        `screenshot-${screenshotId}.png`
      );
      writeFileSync(screenshotPath, screenshot.toPNG());

      // Создаем элемент очереди
      const id = `image-${screenshotId}`;
      const queueItem: QueueItem = {
        id,
        type: "image",
        content: screenshotPath,
        timestamp: Date.now(),
        isQuestion: false,
      };

      requestsQueue.push(queueItem);

      // Отправляем обновленную очередь в рендерер
      mainWindow.webContents.send("queue-updated", requestsQueue);

      // Восстанавливаем видимость окна
      if (wasVisible) mainWindow.show();

      return { success: true, item: queueItem };
    } catch (error) {
      console.error("Ошибка при создании скриншота:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    }
  });

  // Добавление текста из буфера обмена в очередь
  ipcMain.handle("add-clipboard-to-queue", () => {
    const clipboardText = clipboard.readText().trim();

    if (!clipboardText) {
      // Проверяем наличие изображения в буфере обмена
      const clipboardImage = clipboard.readImage();

      if (!clipboardImage.isEmpty()) {
        // Сохраняем изображение во временный файл
        const imageId = Date.now();
        const imagePath = path.join(tempDir, `clipboard-${imageId}.png`);
        writeFileSync(imagePath, clipboardImage.toPNG());

        // Создаем элемент очереди
        const id = `image-${imageId}`;
        const queueItem: QueueItem = {
          id,
          type: "image",
          content: imagePath,
          timestamp: Date.now(),
          isQuestion: false,
        };

        requestsQueue.push(queueItem);

        // Отправляем обновленную очередь в рендерер
        mainWindow.webContents.send("queue-updated", requestsQueue);

        return { success: true, item: queueItem };
      }

      return { success: false, error: "Буфер обмена пуст" };
    }

    const id = `text-${Date.now()}`;
    const isQuestion = detectQuestion(clipboardText);

    const queueItem: QueueItem = {
      id,
      type: "text",
      content: clipboardText,
      timestamp: Date.now(),
      isQuestion,
    };

    requestsQueue.push(queueItem);

    // Отправляем обновленную очередь в рендерер
    mainWindow.webContents.send("queue-updated", requestsQueue);

    return { success: true, item: queueItem };
  });

  // Удаление элемента из очереди
  ipcMain.handle("remove-from-queue", (_, itemId: string) => {
    const initialLength = requestsQueue.length;
    requestsQueue = requestsQueue.filter((item) => item.id !== itemId);

    const success = initialLength !== requestsQueue.length;

    if (success) {
      // Отправляем обновленную очередь в рендерер
      mainWindow.webContents.send("queue-updated", requestsQueue);
    }

    return { success };
  });

  // Очистка всей очереди
  ipcMain.handle("clear-queue", () => {
    requestsQueue = [];

    // Отправляем обновленную очередь в рендерер
    mainWindow.webContents.send("queue-updated", requestsQueue);

    return { success: true };
  });

  // Получение текущей очереди
  ipcMain.handle("get-queue", () => {
    return requestsQueue;
  });

  // Проверяем, является ли текст вопросом
  function detectQuestion(text: string): boolean {
    // Простая эвристика для определения вопросов
    const lowerText = text.toLowerCase();

    // Заканчивается вопросительным знаком
    if (text.trim().endsWith("?")) {
      return true;
    }

    // Начинается с вопросительных слов
    const ruQuestionWords = [
      "что",
      "кто",
      "где",
      "когда",
      "почему",
      "зачем",
      "как",
      "который",
      "чей",
      "сколько",
      "какой",
      "какая",
      "какое",
      "какие",
      "куда",
      "откуда",
      "можно ли",
      "правда ли",
      "верно ли",
    ];

    const enQuestionWords = [
      "what",
      "who",
      "where",
      "when",
      "why",
      "how",
      "which",
      "whose",
      "whom",
      "can",
      "could",
      "would",
      "should",
      "will",
      "do",
      "does",
      "did",
      "is",
      "are",
      "was",
      "were",
    ];

    const plQuestionWords = [
      "co",
      "kto",
      "gdzie",
      "kiedy",
      "dlaczego",
      "jak",
      "który",
      "czyj",
      "ile",
      "jaki",
      "jaka",
      "jakie",
    ];

    const allQuestionWords = [
      ...ruQuestionWords,
      ...enQuestionWords,
      ...plQuestionWords,
    ];

    for (const word of allQuestionWords) {
      if (lowerText.startsWith(word + " ")) {
        return true;
      }
    }

    return false;
  }
}
