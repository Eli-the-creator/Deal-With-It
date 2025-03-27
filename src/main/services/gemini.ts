import { BrowserWindow, ipcMain } from "electron";
import fetch from "node-fetch";
import FormData from "form-data";
import { createReadStream, readFileSync } from "fs";
import path from "path";
import { app } from "electron";

// Конфигурация API
interface GeminiConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
}

// Настройки API по умолчанию
let config: GeminiConfig = {
  apiKey: "",
  apiUrl: "https://generativelanguage.googleapis.com/v1beta/models",
  model: "gemini-pro-vision",
  maxTokens: 2048,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
};

// Состояние генерации
let isGenerating = false;

// Настройка сервиса Gemini
export function setupGeminiService(mainWindow: BrowserWindow): void {
  // Загрузка конфигурации из локального хранилища
  ipcMain.handle("load-gemini-config", async () => {
    try {
      // В реальном приложении здесь должна быть загрузка из безопасного хранилища
      // Например, Electron secure-storage или keytar
      // В данном примере используется заглушка
      return config;
    } catch (error) {
      console.error("Ошибка при загрузке конфигурации Gemini:", error);
      return config;
    }
  });

  // Сохранение конфигурации
  ipcMain.handle(
    "save-gemini-config",
    async (_, newConfig: Partial<GeminiConfig>) => {
      try {
        config = {
          ...config,
          ...newConfig,
        };

        // В реальном приложении здесь должно быть сохранение в безопасное хранилище

        return { success: true, config };
      } catch (error) {
        console.error("Ошибка при сохранении конфигурации Gemini:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Неизвестная ошибка",
        };
      }
    }
  );

  // Обработчик для генерации ответа с помощью API Gemini
  ipcMain.handle(
    "generate-response",
    async (
      _,
      {
        texts,
        images,
        streaming = true,
      }: {
        texts: string[];
        images: string[];
        streaming?: boolean;
      }
    ) => {
      if (isGenerating) {
        return {
          success: false,
          error: "Генерация уже выполняется",
        };
      }

      if (!config.apiKey) {
        return {
          success: false,
          error: "API ключ не настроен",
        };
      }

      try {
        isGenerating = true;
        mainWindow.webContents.send("generation-status", { status: "started" });

        // Объединяем тексты в один с разделителем
        const combinedText = texts.join("\n\n");

        // Создаем объект запроса для Gemini
        const requestBody: any = {
          contents: [
            {
              parts: [{ text: combinedText }],
            },
          ],
          generationConfig: {
            maxOutputTokens: config.maxTokens,
            temperature: config.temperature,
            topP: config.topP,
            topK: config.topK,
          },
        };

        // Добавляем изображения, если они есть
        if (images && images.length > 0) {
          for (const imagePath of images) {
            try {
              const imageBuffer = readFileSync(imagePath);
              const base64Image = imageBuffer.toString("base64");

              requestBody.contents[0].parts.push({
                inlineData: {
                  mimeType: "image/jpeg", // или 'image/png' в зависимости от формата
                  data: base64Image,
                },
              });
            } catch (imageError) {
              console.error(
                `Ошибка при чтении изображения ${imagePath}:`,
                imageError
              );
            }
          }
        }

        // Определяем модель в зависимости от наличия изображений
        const modelToUse =
          images.length > 0 ? "gemini-pro-vision" : "gemini-pro";
        const apiUrl = `${config.apiUrl}/${modelToUse}:generateContent?key=${config.apiKey}`;

        // Запрос в режиме стриминга или обычном режиме
        if (streaming) {
          requestBody.streamGenerationConfig = {
            streamContentTokenLimit: 1,
          };

          const streamUrl = `${config.apiUrl}/${modelToUse}:streamGenerateContent?key=${config.apiKey}`;

          const response = await fetch(streamUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `API запрос вернул ошибку: ${response.status} ${errorText}`
            );
          }

          // Создаем reader для обработки потока
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let result = "";

          // Чтение и обработка потока
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            // Декодируем и парсим чанк ответа
            const chunk = decoder.decode(value, { stream: true });
            try {
              // Gemini возвращает несколько JSON объектов, разделенных новой строкой
              const lines = chunk.split("\n").filter((line) => line.trim());

              for (const line of lines) {
                try {
                  const data = JSON.parse(line);

                  if (
                    data.candidates &&
                    data.candidates[0].content &&
                    data.candidates[0].content.parts &&
                    data.candidates[0].content.parts[0].text
                  ) {
                    const textChunk = data.candidates[0].content.parts[0].text;
                    result += textChunk;

                    // Отправляем чанк в рендерер
                    mainWindow.webContents.send("generation-chunk", {
                      chunk: textChunk,
                    });
                  }
                } catch (parseError) {
                  console.error(
                    "Ошибка при разборе JSON в потоке:",
                    parseError
                  );
                }
              }
            } catch (chunkError) {
              console.error("Ошибка при обработке чанка:", chunkError);
            }
          }

          // Завершаем генерацию
          mainWindow.webContents.send("generation-status", {
            status: "completed",
            result,
          });

          isGenerating = false;
          return { success: true, result };
        } else {
          // Обычный запрос (не стриминг)
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `API запрос вернул ошибку: ${response.status} ${errorText}`
            );
          }

          const data = await response.json();

          let result = "";
          if (
            data.candidates &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts[0].text
          ) {
            result = data.candidates[0].content.parts[0].text;
          }

          mainWindow.webContents.send("generation-status", {
            status: "completed",
            result,
          });

          isGenerating = false;
          return { success: true, result };
        }
      } catch (error) {
        console.error("Ошибка при генерации ответа:", error);

        mainWindow.webContents.send("generation-status", {
          status: "error",
          error: error instanceof Error ? error.message : "Неизвестная ошибка",
        });

        isGenerating = false;
        return {
          success: false,
          error: error instanceof Error ? error.message : "Неизвестная ошибка",
        };
      }
    }
  );

  // Прерывание текущей генерации
  ipcMain.handle("stop-generation", () => {
    if (!isGenerating) {
      return { success: true, wasGenerating: false };
    }

    try {
      // На самом деле API Gemini не поддерживает остановку запроса
      // Мы просто устанавливаем флаг состояния
      isGenerating = false;
      mainWindow.webContents.send("generation-status", { status: "stopped" });

      return { success: true, wasGenerating: true };
    } catch (error) {
      console.error("Ошибка при остановке генерации:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      };
    }
  });

  // Получение статуса генерации
  ipcMain.handle("get-generation-status", () => {
    return { isGenerating };
  });
}
