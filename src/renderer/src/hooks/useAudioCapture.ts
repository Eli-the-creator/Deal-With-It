import { useState, useEffect, useCallback } from "react";

interface CaptureStatus {
  isCapturing: boolean;
  settings: {
    captureMicrophone: boolean;
    captureSystemAudio: boolean;
    sampleRate: number;
    channels: number;
  };
}

interface AudioSource {
  id: string;
  name: string;
  thumbnail: string;
}

export function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus | null>(
    null
  );
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Инициализация захвата аудио при монтировании компонента
  useEffect(() => {
    const initAudioCapture = async () => {
      try {
        // Запрашиваем список источников аудио
        await window.api.audio.initAudioCapture();

        // Получаем текущий статус захвата
        const status = await window.api.audio.getCaptureStatus();
        setCaptureStatus(status);
        setIsCapturing(status?.isCapturing || false);
      } catch (err) {
        setError(
          `Ошибка инициализации захвата аудио: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Ошибка инициализации захвата аудио:", err);
      }
    };

    initAudioCapture();

    // Слушаем события от основного процесса
    const removeAudioSourcesListener = window.api.audio.onAudioSources(
      (sources) => {
        setAudioSources(sources);
      }
    );

    const removeAudioSettingsListener = window.api.audio.onAudioSettings(
      (settings) => {
        setCaptureStatus((prev) => (prev ? { ...prev, settings } : null));
      }
    );

    return () => {
      // Отписываемся от событий при размонтировании
      removeAudioSourcesListener();
      removeAudioSettingsListener();

      // Останавливаем захват при размонтировании
      if (isCapturing) {
        window.api.audio.stopCapture();
      }

      // Останавливаем MediaRecorder и AudioContext
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }

      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  // Функция для отправки аудио данных в основной процесс
  const sendAudioData = useCallback((data: Uint8Array) => {
    window.api.audio.sendAudioData(data);
  }, []);

  // Начало захвата аудио
  const startCapture = useCallback(
    async (sourceId?: string) => {
      try {
        // Создаем AudioContext, если еще не создан
        if (!audioContext) {
          const newAudioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)({
            sampleRate: captureStatus?.settings.sampleRate || 16000,
          });
          setAudioContext(newAudioContext);
        }

        // Запрашиваем доступ к микрофону
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Создаем MediaRecorder для записи аудио
        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });

        // Настраиваем обработчик данных
        recorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            const fileReader = new FileReader();

            fileReader.onload = () => {
              if (fileReader.result) {
                const arrayBuffer = fileReader.result as ArrayBuffer;
                const uint8Array = new Uint8Array(arrayBuffer);
                sendAudioData(uint8Array);
              }
            };

            fileReader.readAsArrayBuffer(event.data);
          }
        };

        // Настраиваем обработчики событий MediaRecorder
        recorder.onstart = () => {
          setIsCapturing(true);
        };

        recorder.onstop = () => {
          setIsCapturing(false);
        };

        recorder.onerror = (event) => {
          setError(`Ошибка MediaRecorder: ${event.error}`);
          setIsCapturing(false);
        };

        // Запускаем MediaRecorder
        recorder.start(1000); // Получаем данные каждую секунду
        setMediaRecorder(recorder);

        // Сообщаем основному процессу о начале захвата
        const result = await window.api.audio.startCapture(sourceId);

        if (!result.success) {
          throw new Error(result.error || "Не удалось начать захват аудио");
        }

        setIsCapturing(true);
        return true;
      } catch (err) {
        setError(
          `Ошибка при начале захвата аудио: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Ошибка при начале захвата аудио:", err);
        setIsCapturing(false);
        return false;
      }
    },
    [audioContext, captureStatus, sendAudioData]
  );

  // Остановка захвата аудио
  const stopCapture = useCallback(async () => {
    try {
      // Останавливаем MediaRecorder
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();

        // Останавливаем все дорожки в потоке
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      // Сообщаем основному процессу об остановке захвата
      const result = await window.api.audio.stopCapture();

      if (!result.success && !result.notCapturing) {
        throw new Error(result.error || "Не удалось остановить захват аудио");
      }

      setIsCapturing(false);
      return true;
    } catch (err) {
      setError(
        `Ошибка при остановке захвата аудио: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error("Ошибка при остановке захвата аудио:", err);
      return false;
    }
  }, [mediaRecorder]);

  // Обновление настроек захвата аудио
  const updateSettings = useCallback(
    async (newSettings: Partial<CaptureStatus["settings"]>) => {
      try {
        const result = await window.api.audio.updateAudioSettings(newSettings);
        return result;
      } catch (err) {
        setError(
          `Ошибка при обновлении настроек аудио: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Ошибка при обновлении настроек аудио:", err);
        return null;
      }
    },
    []
  );

  return {
    isCapturing,
    audioSources,
    captureStatus,
    error,
    startCapture,
    stopCapture,
    updateSettings,
  };
}
