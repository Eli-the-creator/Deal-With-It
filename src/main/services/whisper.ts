import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { spawnSync, spawn } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { app } from "electron";
import path from "path";

// Интерфейс для результатов транскрипции
interface TranscriptionResult {
  text: string;
  timestamp: number;
  language: string;
}

// Временный буфер для хранения последних аудио данных
let audioBuffer: { data: Buffer; timestamp: number }[] = [];
let lastTranscription: TranscriptionResult | null = null;
const BUFFER_DURATION_MS = 5000; // 5 секунд аудио буфера

// Путь к бинарному файлу whisper.cpp
const getWhisperPath = () => {
  const isProduction = app.isPackaged;
  const binName = process.platform === "win32" ? "whisper.exe" : "whisper";

  if (isProduction) {
    return path.join(process.resourcesPath, "bin", binName);
  } else {
    return path.join(app.getAppPath(), "resources", "bin", binName);
  }
};

// Путь к моделям Whisper
const getModelPath = (modelName: string) => {
  const isProduction = app.isPackaged;

  if (isProduction) {
    return path.join(process.resourcesPath, "models", `${modelName}.bin`);
  } else {
    return path.join(
      app.getAppPath(),
      "resources",
      "models",
      `${modelName}.bin`
    );
  }
};

// Проверка установки Whisper
function checkWhisperInstallation() {
  try {
    const whisperPath = getWhisperPath();
    const result = spawnSync(whisperPath, ["--version"]);

    if (result.error) {
      console.error(
        "Ошибка при проверке установки Whisper:",
        result.error.message
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Whisper не установлен или не найден:", error);
    return false;
  }
}

// Транскрипция аудио через Whisper.cpp
async function transcribeAudio(
  audioPath: string,
  language: "ru" | "en" | "pl" = "ru"
): Promise<TranscriptionResult | null> {
  try {
    const tempOutputPath = path.join(app.getPath("temp"), "transcript.txt");
    const whisperPath = getWhisperPath();
    const modelPath = getModelPath("small");

    // Настройка языковой модели
    const langParam = language === "ru" ? [] : [`-l ${language}`];

    return new Promise((resolve, reject) => {
      const whisperProcess = spawn(whisperPath, [
        "-m",
        modelPath,
        "-f",
        audioPath,
        "-o",
        tempOutputPath,
        ...langParam,
        "--no-timestamps",
        "--single-segment",
      ]);

      whisperProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Whisper завершился с кодом ${code}`));
          return;
        }

        try {
          const transcription = readFileSync(tempOutputPath, "utf-8").trim();

          if (transcription) {
            lastTranscription = {
              text: transcription,
              timestamp: Date.now(),
              language,
            };

            resolve(lastTranscription);
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      });

      whisperProcess.stderr.on("data", (data) => {
        console.error(`Whisper stderr: ${data}`);
      });
    });
  } catch (error) {
    console.error("Ошибка при транскрипции аудио:", error);
    return null;
  }
}

// Добавление аудио данных в буфер
function addToAudioBuffer(audioData: Buffer) {
  const now = Date.now();

  // Добавляем новые данные
  audioBuffer.push({ data: audioData, timestamp: now });

  // Очищаем старые данные
  const cutoffTime = now - BUFFER_DURATION_MS;
  audioBuffer = audioBuffer.filter((item) => item.timestamp >= cutoffTime);
}

// Получение последней транскрипции
function getLastTranscription(): TranscriptionResult | null {
  return lastTranscription;
}

// Настройка сервиса Whisper
export function setupWhisperService(mainWindow: BrowserWindow): void {
  // Проверяем, установлен ли Whisper
  const isWhisperInstalled = checkWhisperInstallation();

  if (!isWhisperInstalled) {
    console.error(
      "Whisper не установлен. Функция распознавания речи не будет работать!"
    );
    mainWindow.webContents.send("whisper-status", {
      status: "error",
      message: "Whisper не установлен или не найден",
    });
    return;
  }

  // Обработчики IPC
  ipcMain.handle(
    "transcribe-buffer",
    async (_, options: { language?: "ru" | "en" | "pl" }) => {
      if (audioBuffer.length === 0) {
        return null;
      }

      try {
        // Объединяем все аудио данные из буфера
        const combinedBuffer = Buffer.concat(
          audioBuffer.map((item) => item.data)
        );

        // Сохраняем во временный файл
        const tempAudioPath = join(
          app.getPath("temp"),
          "audio_to_transcribe.wav"
        );
        writeFileSync(tempAudioPath, combinedBuffer);

        // Транскрибируем
        const language = options.language || "ru";
        const result = await transcribeAudio(tempAudioPath, language);

        // Отправляем результат в интерфейс
        if (result) {
          mainWindow.webContents.send("transcription-result", result);
        }

        return result;
      } catch (error) {
        console.error("Ошибка при транскрибировании буфера:", error);
        return null;
      }
    }
  );

  ipcMain.handle("get-last-transcription", () => {
    return lastTranscription;
  });

  // Обработчик для добавления аудио данных в буфер
  ipcMain.on("add-audio-data", (_, audioData: Buffer) => {
    addToAudioBuffer(audioData);
  });

  // Сообщаем об успешной инициализации
  mainWindow.webContents.send("whisper-status", {
    status: "ready",
    message: "Модуль распознавания речи готов к работе",
  });
}

export { getLastTranscription };
