import { BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { app } from "electron";
import path from "path";
import fs from "fs";
import { createClient } from "@deepgram/sdk";
// import { loadConfigFromFile } from "./deepgram-service";

// Определяем интерфейс для результатов транскрипции
interface TranscriptionResult {
  text: string;
  timestamp: number;
  language: string;
}

// Временный буфер для хранения аудио данных
let audioBuffer: { data: Buffer; timestamp: number }[] = [];
let lastTranscription: TranscriptionResult | null = null;
const BUFFER_DURATION_MS = 5000; // 5 секунд буфера аудио

// Инициализируем клиент DeepGram
let deepgramClient: Deepgram | null = null;

// Функция для логирования с префиксом [DeepGram]
function logDeepgram(message: string, ...args: any[]) {
  console.log(`[DeepGram] ${message}`, ...args);
}

// Инициализация клиента DeepGram
function initializeDeepgramClient() {
  try {
    // const config = loadConfigFromFile();
    const apiKey = process.env.DEEPGRAM_API_KEY || "";

    if (!apiKey) {
      logDeepgram(
        "No DeepGram API key provided. Please configure it in the settings."
      );
      return null;
    }

    deepgramClient = createClient(apiKey);
    logDeepgram("DeepGram client initialized successfully");
    return deepgramClient;
  } catch (error) {
    logDeepgram("Failed to initialize DeepGram client:", error);
    return null;
  }
}

// Create a dummy transcription for debugging or when DeepGram API is not available
function createDummyTranscription(
  language: "ru" | "en" | "pl"
): TranscriptionResult {
  const now = Date.now();

  // Generate a dummy message based on the buffer size to make debugging easier
  const bufferSize = audioBuffer.length;
  const totalBytes = audioBuffer.reduce(
    (acc, item) => acc + item.data.length,
    0
  );

  const text =
    bufferSize > 0
      ? `Audio recording received (${bufferSize} fragments, ${totalBytes} bytes). DeepGram API not configured.`
      : `Audio recording is empty. Check microphone settings. DeepGram API not configured.`;

  return {
    text,
    timestamp: now,
    language,
  };
}

async function transcribeAudioWithDeepgram(
  audioPath: string,
  language: "ru" | "en" | "pl" = "en"
): Promise<TranscriptionResult | null> {
  try {
    logDeepgram(
      `Transcribing audio with DeepGram: ${audioPath} (language: ${language})`
    );

    // Загрузим конфигурацию
    // const config = loadConfigFromFile();
    const apiKey = process.env.DEEPGRAM_API_KEY || "";

    if (!apiKey) {
      logDeepgram(
        "No DeepGram API key found, please configure it in settings."
      );
      return createDummyTranscription(language);
    }

    // Создаем клиент DeepGram
    const deepgram = createClient(apiKey);

    // Читаем аудио файл
    const audioFile = fs.readFileSync(audioPath);

    // Отправляем запрос, используя метод из вашего рабочего примера
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioFile,
      {
        model: "nova-2",
        language: language, // использование выбранного языка
        smart_format: true,
        punctuate: true,
      }
    );

    // Проверяем на ошибки
    if (error) {
      logDeepgram(`DeepGram API error: ${error}`);
      return createDummyTranscription(language);
    }

    // Извлекаем транскрипцию из результата
    const transcript =
      result?.results?.channels[0]?.alternatives[0]?.transcript;

    if (!transcript) {
      logDeepgram("No transcription available in DeepGram response");
      return createDummyTranscription(language);
    }

    logDeepgram(`Transcription result: "${transcript}"`);

    // Создаем и возвращаем результат транскрипции
    const transcriptionResult: TranscriptionResult = {
      text: transcript,
      timestamp: Date.now(),
      language,
    };

    lastTranscription = transcriptionResult;
    return transcriptionResult;
  } catch (error) {
    logDeepgram(`Error in transcribeAudioWithDeepgram: ${error}`);
    return createDummyTranscription(language);
  }
}

// Add audio data to buffer with improved handling and logging
function addToAudioBuffer(audioData: Buffer) {
  const now = Date.now();

  // Log more detailed information about the incoming audio data
  console.log(
    `[DeepGram] Adding audio data to buffer: ${audioData.length} bytes`
  );

  // Check if the audioData is valid before adding to buffer
  if (!audioData || audioData.length === 0) {
    console.warn("[DeepGram] Received empty audio data, ignoring");
    return;
  }

  // Add the new data to buffer
  audioBuffer.push({ data: audioData, timestamp: now });

  // Clean up old data
  const cutoffTime = now - BUFFER_DURATION_MS;
  const oldLength = audioBuffer.length;
  audioBuffer = audioBuffer.filter((item) => item.timestamp >= cutoffTime);

  // Log detailed buffer stats periodically or when significant changes occur
  const totalBytes = audioBuffer.reduce(
    (acc, item) => acc + item.data.length,
    0
  );

  console.log(
    `[DeepGram] Audio buffer updated: ${audioBuffer.length} chunks (${totalBytes} bytes), removed ${oldLength - audioBuffer.length} old chunks`
  );
}

// Function to clear the audio buffer with better logging
function clearAudioBuffer() {
  console.log("[DeepGram] Clearing audio buffer completely");
  const oldLength = audioBuffer.length;

  if (oldLength > 0) {
    const totalBytes = audioBuffer.reduce(
      (acc, item) => acc + item.data.length,
      0
    );
    console.log(
      `[DeepGram] Discarding ${oldLength} chunks (${totalBytes} bytes)`
    );
  }

  audioBuffer = [];
  console.log("[DeepGram] Audio buffer cleared");
}

// Get the last transcription
function getLastTranscription(): TranscriptionResult | null {
  return lastTranscription;
}

// Set up Whisper service
export function setupWhisperService(mainWindow: BrowserWindow): void {
  logDeepgram("Setting up DeepGram transcription service");

  // Создаем директорию для временных аудио файлов
  const tempDir = path.join(app.getPath("temp"), "deepgram_audio");
  if (!existsSync(tempDir)) {
    logDeepgram(`Creating temp directory: ${tempDir}`);
    mkdirSync(tempDir, { recursive: true });
  }

  // Инициализируем клиент DeepGram
  initializeDeepgramClient();

  // Обработчик для транскрипции буфера аудио
  ipcMain.handle(
    "transcribe-buffer",
    async (_, options: { language?: "ru" | "en" | "pl" }) => {
      logDeepgram(
        `Received transcribe-buffer request with options: ${JSON.stringify(options)}`
      );

      // Проверяем, есть ли данные для транскрипции
      if (audioBuffer.length === 0) {
        logDeepgram("Audio buffer is empty, returning dummy transcription");
        const dummyTranscription = createDummyTranscription(
          options.language || "en"
        );
        mainWindow.webContents.send("transcription-result", dummyTranscription);
        return dummyTranscription;
      }

      try {
        // Объединяем все фрагменты аудио в один буфер
        const combinedBuffer = Buffer.concat(
          audioBuffer.map((item) => item.data)
        );
        logDeepgram(
          `Combined buffer size: ${combinedBuffer.length} bytes from ${audioBuffer.length} chunks`
        );

        // Создаем временный файл для аудио
        const tempAudioPath = join(
          tempDir,
          `audio_to_transcribe_${Date.now()}.wav`
        );

        // Сохраняем аудио во временный файл
        logDeepgram(`Saving audio to: ${tempAudioPath}`);
        writeFileSync(tempAudioPath, combinedBuffer);

        // Проверяем, успешно ли создан файл
        if (!existsSync(tempAudioPath)) {
          throw new Error(`Failed to write audio file to ${tempAudioPath}`);
        }

        // Транскрибируем аудио с помощью DeepGram
        const language = options.language || "en";
        const result = await transcribeAudioWithDeepgram(
          tempAudioPath,
          language
        );

        // Отправляем результат в рендерер
        if (result) {
          logDeepgram(`Sending transcription result to UI: "${result.text}"`);
          mainWindow.webContents.send("transcription-result", result);
        } else {
          logDeepgram("No transcription result to send to UI");
        }

        return result;
      } catch (err) {
        logDeepgram(`Error transcribing buffer: ${err}`);

        // Возвращаем запасной вариант при ошибке
        const dummy = createDummyTranscription(options.language || "en");
        mainWindow.webContents.send("transcription-result", dummy);
        return dummy;
      }
    }
  );

  // Получение последней транскрипции
  ipcMain.handle("get-last-transcription", () => {
    logDeepgram(
      `Returning last transcription: ${lastTranscription?.text || "none"}`
    );
    return lastTranscription;
  });

  // Добавление аудио данных в буфер
  ipcMain.on("add-audio-data", (_, audioData: Buffer) => {
    addToAudioBuffer(audioData);
  });

  // Сообщаем об успешной инициализации
  mainWindow.webContents.send("whisper-status", {
    status: "ready",
    message: "DeepGram transcription service ready",
  });

  logDeepgram("DeepGram transcription service setup complete");
}

export { getLastTranscription, addToAudioBuffer, clearAudioBuffer };
