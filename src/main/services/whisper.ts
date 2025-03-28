// import { BrowserWindow, ipcMain } from "electron";
// import { join } from "path";
// import { spawnSync, spawn } from "child_process";
// import { readFileSync, writeFileSync } from "fs";
// import { app } from "electron";
// import path from "path";

// // Интерфейс для результатов транскрипции
// interface TranscriptionResult {
//   text: string;
//   timestamp: number;
//   language: string;
// }

// // Временный буфер для хранения последних аудио данных
// let audioBuffer: { data: Buffer; timestamp: number }[] = [];
// let lastTranscription: TranscriptionResult | null = null;
// const BUFFER_DURATION_MS = 5000; // 5 секунд аудио буфера

// // Путь к бинарному файлу whisper.cpp
// const getWhisperPath = () => {
//   const isProduction = app.isPackaged;
//   const binName = process.platform === "win32" ? "whisper.exe" : "whisper";

//   if (isProduction) {
//     return path.join(process.resourcesPath, "bin", binName);
//   } else {
//     return path.join(app.getAppPath(), "resources", "bin", binName);
//   }
// };

// // Путь к моделям Whisper
// const getModelPath = (modelName: string) => {
//   const isProduction = app.isPackaged;

//   if (isProduction) {
//     return path.join(process.resourcesPath, "models", `${modelName}.bin`);
//   } else {
//     return path.join(
//       app.getAppPath(),
//       "resources",
//       "models",
//       `${modelName}.bin`
//     );
//   }
// };

// // Проверка установки Whisper
// function checkWhisperInstallation() {
//   try {
//     const whisperPath = getWhisperPath();
//     const result = spawnSync(whisperPath, ["--version"]);

//     if (result.error) {
//       console.error(
//         "Ошибка при проверке установки Whisper:",
//         result.error.message
//       );
//       return false;
//     }

//     return true;
//   } catch (error) {
//     console.error("Whisper не установлен или не найден:", error);
//     return false;
//   }
// }

// // Транскрипция аудио через Whisper.cpp
// async function transcribeAudio(
//   audioPath: string,
//   language: "ru" | "en" | "pl" = "ru"
// ): Promise<TranscriptionResult | null> {
//   try {
//     const tempOutputPath = path.join(app.getPath("temp"), "transcript.txt");
//     const whisperPath = getWhisperPath();
//     const modelPath = getModelPath("small");

//     // Настройка языковой модели
//     const langParam = language === "ru" ? [] : [`-l ${language}`];

//     return new Promise((resolve, reject) => {
//       const whisperProcess = spawn(whisperPath, [
//         "-m",
//         modelPath,
//         "-f",
//         audioPath,
//         "-o",
//         tempOutputPath,
//         ...langParam,
//         "--no-timestamps",
//         "--single-segment",
//       ]);

//       whisperProcess.on("close", (code) => {
//         if (code !== 0) {
//           reject(new Error(`Whisper завершился с кодом ${code}`));
//           return;
//         }

//         try {
//           const transcription = readFileSync(tempOutputPath, "utf-8").trim();

//           if (transcription) {
//             lastTranscription = {
//               text: transcription,
//               timestamp: Date.now(),
//               language,
//             };

//             resolve(lastTranscription);
//           } else {
//             resolve(null);
//           }
//         } catch (err) {
//           reject(err);
//         }
//       });

//       whisperProcess.stderr.on("data", (data) => {
//         console.error(`Whisper stderr: ${data}`);
//       });
//     });
//   } catch (error) {
//     console.error("Ошибка при транскрипции аудио:", error);
//     return null;
//   }
// }

// // Добавление аудио данных в буфер
// function addToAudioBuffer(audioData: Buffer) {
//   const now = Date.now();

//   // Добавляем новые данные
//   audioBuffer.push({ data: audioData, timestamp: now });

//   // Очищаем старые данные
//   const cutoffTime = now - BUFFER_DURATION_MS;
//   audioBuffer = audioBuffer.filter((item) => item.timestamp >= cutoffTime);
// }

// // Получение последней транскрипции
// function getLastTranscription(): TranscriptionResult | null {
//   return lastTranscription;
// }

// // Настройка сервиса Whisper
// export function setupWhisperService(mainWindow: BrowserWindow): void {
//   // Проверяем, установлен ли Whisper
//   const isWhisperInstalled = checkWhisperInstallation();

//   if (!isWhisperInstalled) {
//     console.error(
//       "Whisper не установлен. Функция распознавания речи не будет работать!"
//     );
//     mainWindow.webContents.send("whisper-status", {
//       status: "error",
//       message: "Whisper не установлен или не найден",
//     });
//     return;
//   }

//   // Обработчики IPC
//   ipcMain.handle(
//     "transcribe-buffer",
//     async (_, options: { language?: "ru" | "en" | "pl" }) => {
//       if (audioBuffer.length === 0) {
//         return null;
//       }

//       try {
//         // Объединяем все аудио данные из буфера
//         const combinedBuffer = Buffer.concat(
//           audioBuffer.map((item) => item.data)
//         );

//         // Сохраняем во временный файл
//         const tempAudioPath = join(
//           app.getPath("temp"),
//           "audio_to_transcribe.wav"
//         );
//         writeFileSync(tempAudioPath, combinedBuffer);

//         // Транскрибируем
//         const language = options.language || "ru";
//         const result = await transcribeAudio(tempAudioPath, language);

//         // Отправляем результат в интерфейс
//         if (result) {
//           mainWindow.webContents.send("transcription-result", result);
//         }

//         return result;
//       } catch (error) {
//         console.error("Ошибка при транскрибировании буфера:", error);
//         return null;
//       }
//     }
//   );

//   ipcMain.handle("get-last-transcription", () => {
//     return lastTranscription;
//   });

//   // Обработчик для добавления аудио данных в буфер
//   ipcMain.on("add-audio-data", (_, audioData: Buffer) => {
//     addToAudioBuffer(audioData);
//   });

//   // Сообщаем об успешной инициализации
//   mainWindow.webContents.send("whisper-status", {
//     status: "ready",
//     message: "Модуль распознавания речи готов к работе",
//   });
// }

// export { getLastTranscription };

import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { spawnSync, spawn, execSync, exec } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
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

// Функция для логирования в консоль с пометкой [Whisper]
function logWhisper(message: string, ...args: any[]) {
  console.log(`[Whisper] ${message}`, ...args);
}

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
    logWhisper(`Checking Whisper installation at: ${whisperPath}`);

    // Check if the file exists and is executable
    if (!existsSync(whisperPath)) {
      logWhisper(`Whisper executable not found at: ${whisperPath}`);

      // Try to use a system-installed whisper command
      try {
        logWhisper(`Trying system whisper command...`);

        // On macOS, we can use which to check if whisper is installed
        if (process.platform === "darwin" || process.platform === "linux") {
          const result = execSync("which whisper").toString().trim();
          logWhisper(`Found system whisper at: ${result}`);
          return result;
        }
      } catch (err) {
        logWhisper(`No system whisper found: ${err}`);
      }

      return null;
    }

    // Try checking the version to see if it's executable
    try {
      const result = spawnSync(whisperPath, ["--version"]);
      if (result.error) {
        logWhisper(`Error checking Whisper version: ${result.error.message}`);
        return null;
      }
      logWhisper(`Whisper version check successful`);
      return whisperPath;
    } catch (error) {
      logWhisper(`Error running Whisper: ${error}`);
      return null;
    }
  } catch (error) {
    logWhisper(`Whisper not installed or not found: ${error}`);
    return null;
  }
}

// Create a dummy transcription for debugging when Whisper isn't available
function createDummyTranscription(
  language: "ru" | "en" | "pl"
): TranscriptionResult {
  const now = Date.now();
  const text = `This is a dummy transcription because Whisper is not properly configured. Timestamp: ${now}`;

  return {
    text,
    timestamp: now,
    language,
  };
}

// Транскрипция аудио через Whisper.cpp
async function transcribeAudio(
  audioPath: string,
  language: "ru" | "en" | "pl" = "ru",
  whisperExecutable: string | null
): Promise<TranscriptionResult | null> {
  try {
    logWhisper(`Transcribing audio: ${audioPath} with language: ${language}`);

    // If no whisper executable is available, return a dummy transcription
    if (!whisperExecutable) {
      logWhisper(
        "No Whisper executable available, creating dummy transcription"
      );
      return createDummyTranscription(language);
    }

    const tempOutputPath = path.join(app.getPath("temp"), "transcript.txt");
    logWhisper(`Output will be written to: ${tempOutputPath}`);

    // Create models directory if it doesn't exist
    const modelsDir = path.join(app.getAppPath(), "resources", "models");
    if (!existsSync(modelsDir)) {
      logWhisper(`Creating models directory: ${modelsDir}`);
      mkdirSync(modelsDir, { recursive: true });
    }

    const modelPath = getModelPath("small");
    logWhisper(`Using model: ${modelPath}`);

    // Check if model exists
    if (!existsSync(modelPath)) {
      logWhisper(
        `Model file not found: ${modelPath}, using dummy transcription`
      );
      return createDummyTranscription(language);
    }

    // Настройка языковой модели
    const langParam = language === "ru" ? [] : [`-l ${language}`];

    return new Promise((resolve, reject) => {
      logWhisper(`Spawning Whisper process: ${whisperExecutable}`);
      logWhisper(
        `Command parameters: -m ${modelPath} -f ${audioPath} -o ${tempOutputPath} ${langParam.join(" ")} --no-timestamps --single-segment`
      );

      const whisperProcess = spawn(whisperExecutable, [
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
          const errorMsg = `Whisper process exited with code ${code}`;
          logWhisper(errorMsg);

          // Even if it fails, provide a dummy transcription
          const dummy = createDummyTranscription(language);
          lastTranscription = dummy;
          resolve(dummy);
          return;
        }

        try {
          logWhisper(`Reading transcription from: ${tempOutputPath}`);
          if (existsSync(tempOutputPath)) {
            const transcription = readFileSync(tempOutputPath, "utf-8").trim();
            logWhisper(`Transcription result: "${transcription}"`);

            if (transcription) {
              lastTranscription = {
                text: transcription,
                timestamp: Date.now(),
                language,
              };

              resolve(lastTranscription);
            } else {
              logWhisper("Empty transcription, creating dummy");
              const dummy = createDummyTranscription(language);
              lastTranscription = dummy;
              resolve(dummy);
            }
          } else {
            logWhisper(`Output file not found: ${tempOutputPath}, using dummy`);
            const dummy = createDummyTranscription(language);
            lastTranscription = dummy;
            resolve(dummy);
          }
        } catch (err) {
          logWhisper(`Error reading transcription: ${err}`);
          const dummy = createDummyTranscription(language);
          lastTranscription = dummy;
          resolve(dummy);
        }
      });

      whisperProcess.stderr.on("data", (data) => {
        logWhisper(`Whisper stderr: ${data}`);
      });

      whisperProcess.stdout.on("data", (data) => {
        logWhisper(`Whisper stdout: ${data}`);
      });
    });
  } catch (error) {
    logWhisper(`Error in transcribeAudio: ${error}`);
    // Return a dummy transcription as a fallback
    const dummy = createDummyTranscription(language);
    lastTranscription = dummy;
    return dummy;
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

  // Log buffer growth periodically
  if (audioBuffer.length % 5 === 0) {
    logWhisper(
      `Audio buffer size: ${audioBuffer.length} chunks, total bytes: ${audioBuffer.reduce((acc, item) => acc + item.data.length, 0)}`
    );
  }
}

// Получение последней транскрипции
function getLastTranscription(): TranscriptionResult | null {
  return lastTranscription;
}

// Настройка сервиса Whisper
export function setupWhisperService(mainWindow: BrowserWindow): void {
  logWhisper("Setting up Whisper service");

  // Ensure we have a temp directory for audio files
  const tempDir = path.join(app.getPath("temp"), "whisper_audio");
  if (!existsSync(tempDir)) {
    logWhisper(`Creating temp directory: ${tempDir}`);
    mkdirSync(tempDir, { recursive: true });
  }

  // Проверяем, установлен ли Whisper
  const whisperExecutable = checkWhisperInstallation();

  if (!whisperExecutable) {
    logWhisper(
      "Whisper не установлен или неверно настроен, будет возвращать dummy транскрипции"
    );
    mainWindow.webContents.send("whisper-status", {
      status: "warning",
      message:
        "Whisper не установлен или не найден, будет использоваться тестовый режим",
    });
  } else {
    logWhisper(`Whisper found at: ${whisperExecutable}`);
  }

  // Обработчики IPC
  ipcMain.handle(
    "transcribe-buffer",
    async (_, options: { language?: "ru" | "en" | "pl" }) => {
      logWhisper(
        `Received transcribe-buffer request with options: ${JSON.stringify(options)}`
      );

      if (audioBuffer.length === 0) {
        logWhisper("Audio buffer is empty, nothing to transcribe");
        return null;
      }

      try {
        // Объединяем все аудио данные из буфера
        const combinedBuffer = Buffer.concat(
          audioBuffer.map((item) => item.data)
        );

        logWhisper(`Combined buffer size: ${combinedBuffer.length} bytes`);

        // Ensure temp directory exists
        if (!existsSync(tempDir)) {
          mkdirSync(tempDir, { recursive: true });
        }

        // Сохраняем во временный файл с уникальным именем
        const tempAudioPath = join(
          tempDir,
          `audio_to_transcribe_${Date.now()}.wav`
        );

        logWhisper(`Saving audio to: ${tempAudioPath}`);
        writeFileSync(tempAudioPath, combinedBuffer);

        // Транскрибируем
        const language = options.language || "ru";
        const result = await transcribeAudio(
          tempAudioPath,
          language,
          whisperExecutable
        );

        // Отправляем результат в интерфейс
        if (result) {
          logWhisper(`Sending transcription result to UI: "${result.text}"`);
          mainWindow.webContents.send("transcription-result", result);
        } else {
          logWhisper("No transcription result to send to UI");
        }

        return result;
      } catch (error) {
        logWhisper(`Error transcribing buffer: ${error}`);

        // Create a fallback transcription
        const dummy = createDummyTranscription(options.language || "ru");
        mainWindow.webContents.send("transcription-result", dummy);

        return dummy;
      }
    }
  );

  ipcMain.handle("get-last-transcription", () => {
    logWhisper(
      `Returning last transcription: ${lastTranscription?.text || "none"}`
    );
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

  logWhisper("Whisper service setup complete");
}

export { getLastTranscription, addToAudioBuffer };
