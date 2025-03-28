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
  //   useEffect(() => {
  //     const initAudioCapture = async () => {
  //       try {
  //         // Запрашиваем список источников аудио
  //         await window.api.audio.initAudioCapture();

  //         // Получаем текущий статус захвата
  //         const status = await window.api.audio.getCaptureStatus();
  //         setCaptureStatus(status);
  //         setIsCapturing(status?.isCapturing || false);
  //       } catch (err) {
  //         setError(
  //           `Ошибка инициализации захвата аудио: ${err instanceof Error ? err.message : String(err)}`
  //         );
  //         console.error("Ошибка инициализации захвата аудио:", err);
  //       }
  //     };

  //     initAudioCapture();

  //     // Слушаем события от основного процесса
  //     const removeAudioSourcesListener = window.api.audio.onAudioSources(
  //       (sources) => {
  //         setAudioSources(sources);
  //       }
  //     );

  //     const removeAudioSettingsListener = window.api.audio.onAudioSettings(
  //       (settings) => {
  //         setCaptureStatus((prev) => (prev ? { ...prev, settings } : null));
  //       }
  //     );

  //     return () => {
  //       // Отписываемся от событий при размонтировании
  //       removeAudioSourcesListener();
  //       removeAudioSettingsListener();

  //       // Останавливаем захват при размонтировании
  //       if (isCapturing) {
  //         window.api.audio.stopCapture();
  //       }

  //       // Останавливаем MediaRecorder и AudioContext
  //       if (mediaRecorder && mediaRecorder.state !== "inactive") {
  //         mediaRecorder.stop();
  //       }

  //       if (audioContext) {
  //         audioContext.close();
  //       }
  //     };
  //   }, []);

  // Инициализация захвата аудио при монтировании компонента
  useEffect(() => {
    const initAudioCapture = async () => {
      try {
        console.log("Initializing audio capture in hook...");

        // Запрашиваем список источников аудио
        await window.api.audio.initAudioCapture();

        // Получаем текущий статус захвата
        const status = await window.api.audio.getCaptureStatus();
        setCaptureStatus(status);
        setIsCapturing(status?.isCapturing || false);
        console.log("Initial capture status:", status);
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
        console.log("Received audio sources:", sources.length);
        setAudioSources(sources);
      }
    );

    const removeAudioSettingsListener = window.api.audio.onAudioSettings(
      (settings) => {
        console.log("Received updated audio settings:", settings);
        setCaptureStatus((prev) => (prev ? { ...prev, settings } : null));
      }
    );

    // Listen for start-capture command from main process
    const removeStartCaptureListener = window.api.audio.onStartCapture(
      (data) => {
        console.log("Received start-capture command from main process", data);
        // Here we would start the audio capture in the renderer process
        // This is useful when the command comes from a hotkey
        if (!isCapturing) {
          startCapture(data.sourceId);
        }
      }
    );

    // Listen for stop-capture command from main process
    const removeStopCaptureListener = window.api.audio.onStopCapture(() => {
      console.log("Received stop-capture command from main process");
      if (isCapturing) {
        stopCapture();
      }
    });

    return () => {
      console.log("Cleaning up audio capture hook...");

      // Отписываемся от событий при размонтировании
      if (typeof removeAudioSourcesListener === "function")
        removeAudioSourcesListener();
      if (typeof removeAudioSettingsListener === "function")
        removeAudioSettingsListener();
      if (typeof removeStartCaptureListener === "function")
        removeStartCaptureListener();
      if (typeof removeStopCaptureListener === "function")
        removeStopCaptureListener();

      // Останавливаем захват при размонтировании
      if (isCapturing) {
        console.log("Stopping audio capture during cleanup");
        window.api.audio.stopCapture().catch((err) => {
          console.error("Error stopping capture during cleanup:", err);
        });
      }

      // Останавливаем MediaRecorder и AudioContext
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        console.log("Stopping MediaRecorder during cleanup");
        mediaRecorder.stop();
        // Stop all tracks to ensure complete shutdown
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      if (audioContext) {
        console.log("Closing AudioContext during cleanup");
        audioContext.close().catch((err) => {
          console.error("Error closing AudioContext:", err);
        });
      }
    };
  }, []);

  // Функция для отправки аудио данных в основной процесс
  const sendAudioData = useCallback((data: Uint8Array) => {
    window.api.audio.sendAudioData(data);
  }, []);

  //   // Начало захвата аудио
  //   const startCapture = useCallback(
  //     async (sourceId?: string) => {
  //       try {
  //         console.log("Starting audio capture...");

  //         // Создаем AudioContext, если еще не создан
  //         let newAudioContext = audioContext;
  //         if (!newAudioContext) {
  //           newAudioContext = new (window.AudioContext ||
  //             (window as any).webkitAudioContext)({
  //             sampleRate: captureStatus?.settings.sampleRate || 16000,
  //           });
  //           setAudioContext(newAudioContext);
  //         }

  //         // Запрашиваем доступ к микрофону с более детальными опциями
  //         const constraints = {
  //           audio: {
  //             echoCancellation: true,
  //             noiseSuppression: true,
  //             autoGainControl: true,
  //             channelCount: captureStatus?.settings.channels || 1,
  //             sampleRate: captureStatus?.settings.sampleRate || 16000,
  //           },
  //         };

  //         console.log("Requesting media with constraints:", constraints);
  //         const stream = await navigator.mediaDevices.getUserMedia(constraints);

  //         console.log("Media stream obtained. Creating recorder...");

  //         // Создаем MediaRecorder для записи аудио с более надежными настройками
  //         const recorder = new MediaRecorder(stream, {
  //           mimeType: MediaRecorder.isTypeSupported("audio/webm")
  //             ? "audio/webm"
  //             : "audio/mp4",
  //         });

  //         console.log("Recorder created with MIME type:", recorder.mimeType);

  //         // Настраиваем обработчик данных с более подробным логированием
  //         recorder.ondataavailable = async (event) => {
  //           if (event.data.size > 0) {
  //             console.log(`Received audio chunk: ${event.data.size} bytes`);

  //             const fileReader = new FileReader();

  //             fileReader.onload = () => {
  //               if (fileReader.result) {
  //                 const arrayBuffer = fileReader.result as ArrayBuffer;
  //                 const uint8Array = new Uint8Array(arrayBuffer);
  //                 sendAudioData(uint8Array);
  //                 console.log(`Sent audio data: ${uint8Array.length} bytes`);
  //               }
  //             };

  //             fileReader.readAsArrayBuffer(event.data);
  //           }
  //         };

  //         // Настраиваем обработчики событий MediaRecorder
  //         recorder.onstart = () => {
  //           console.log("MediaRecorder started");
  //           setIsCapturing(true);
  //         };

  //         recorder.onstop = () => {
  //           console.log("MediaRecorder stopped");
  //           setIsCapturing(false);
  //         };

  //         recorder.onerror = (event) => {
  //           console.error("MediaRecorder error:", event);
  //           setError(`Ошибка MediaRecorder: ${event.error}`);
  //           setIsCapturing(false);
  //         };

  //         // Запускаем MediaRecorder с меньшим таймслотом для большей реактивности
  //         recorder.start(500); // Получаем данные каждые полсекунды
  //         setMediaRecorder(recorder);

  //         // Сообщаем основному процессу о начале захвата
  //         console.log("Notifying main process about capture start");
  //         const result = await window.api.audio.startCapture(sourceId);

  //         if (!result.success) {
  //           throw new Error(result.error || "Не удалось начать захват аудио");
  //         }

  //         console.log("Audio capture successfully started");
  //         setIsCapturing(true);
  //         return true;
  //       } catch (err) {
  //         const errorMessage = `Ошибка при начале захвата аудио: ${err instanceof Error ? err.message : String(err)}`;
  //         console.error(errorMessage, err);
  //         setError(errorMessage);
  //         setIsCapturing(false);
  //         return false;
  //       }
  //     },
  //     [audioContext, captureStatus, sendAudioData]
  //   );

  //   // Остановка захвата аудио
  //   const stopCapture = useCallback(async () => {
  //     try {
  //       console.log("Attempting to stop audio capture...");

  //       // Останавливаем MediaRecorder
  //       if (mediaRecorder && mediaRecorder.state !== "inactive") {
  //         console.log("Stopping MediaRecorder");
  //         mediaRecorder.stop();

  //         // Останавливаем все дорожки в потоке
  //         console.log("Stopping all tracks in the stream");
  //         const tracks = mediaRecorder.stream.getTracks();
  //         tracks.forEach((track) => {
  //           console.log(`Stopping track: ${track.kind}`);
  //           track.stop();
  //         });
  //       } else {
  //         console.log("MediaRecorder already inactive or not available");
  //       }

  //       // Clear any references to avoid memory leaks
  //       setMediaRecorder(null);
  //       if (audioContext) {
  //         console.log("Closing AudioContext");
  //         await audioContext.close();
  //         setAudioContext(null);
  //       }

  //       // Сообщаем основному процессу об остановке захвата
  //       console.log("Notifying main process about capture stop");
  //       const result = await window.api.audio.stopCapture();

  //       if (!result.success && !result.notCapturing) {
  //         throw new Error(result.error || "Не удалось остановить захват аудио");
  //       }

  //       setIsCapturing(false);
  //       console.log("Audio capture successfully stopped");
  //       return true;
  //     } catch (err) {
  //       setError(
  //         `Ошибка при остановке захвата аудио: ${err instanceof Error ? err.message : String(err)}`
  //       );
  //       console.error("Ошибка при остановке захвата аудио:", err);

  //       // Force capturing state to false even if there was an error
  //       setIsCapturing(false);
  //       return false;
  //     }
  //   }, [mediaRecorder, audioContext]);

  const startCapture = useCallback(
    async (sourceId?: string) => {
      try {
        console.log("Starting audio capture in renderer process...");

        // Создаем AudioContext, если еще не создан
        let newAudioContext = audioContext;
        if (!newAudioContext) {
          newAudioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)({
            sampleRate: captureStatus?.settings.sampleRate || 16000,
          });
          setAudioContext(newAudioContext);
        }

        // Запрашиваем доступ к микрофону с более детальными опциями
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: captureStatus?.settings.channels || 1,
            sampleRate: captureStatus?.settings.sampleRate || 16000,
          },
        };

        console.log("Requesting media with constraints:", constraints);

        // First check if we have the necessary permissions
        try {
          // Request permission explicitly before trying to get the stream
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("Audio permission granted");
        } catch (permError) {
          console.error("Failed to get audio permission:", permError);
          throw new Error("Audio permission denied");
        }

        // Now get the actual stream with our constraints
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        console.log("Media stream obtained. Creating recorder...");

        // Check if any MediaRecorder is still active and stop it
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          console.log("Stopping previous MediaRecorder");
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }

        // Создаем MediaRecorder для записи аудио с более надежными настройками
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "audio/mp4",
        });

        console.log("Recorder created with MIME type:", recorder.mimeType);

        // Настраиваем обработчик данных с более подробным логированием
        recorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            console.log(`Received audio chunk: ${event.data.size} bytes`);

            const fileReader = new FileReader();

            fileReader.onload = () => {
              if (fileReader.result) {
                const arrayBuffer = fileReader.result as ArrayBuffer;
                const uint8Array = new Uint8Array(arrayBuffer);
                sendAudioData(uint8Array);
                console.log(`Sent audio data: ${uint8Array.length} bytes`);
              }
            };

            fileReader.readAsArrayBuffer(event.data);
          }
        };

        // Настраиваем обработчики событий MediaRecorder
        recorder.onstart = () => {
          console.log("MediaRecorder started");
          setIsCapturing(true);
        };

        recorder.onstop = () => {
          console.log("MediaRecorder stopped");
          setIsCapturing(false);
        };

        recorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          setError(`Ошибка MediaRecorder: ${event.error}`);
          setIsCapturing(false);
        };

        // Notify the main process before starting the MediaRecorder
        console.log("Notifying main process about capture start");
        const result = await window.api.audio.startCapture(sourceId);

        if (!result.success) {
          // If main process reports failure, clean up and throw error
          stream.getTracks().forEach((track) => track.stop());
          throw new Error(result.error || "Не удалось начать захват аудио");
        }

        // Start the MediaRecorder *after* the main process confirms it's ready
        // Get more frequent chunks for better responsiveness (300ms)
        recorder.start(300);
        setMediaRecorder(recorder);

        console.log("Audio capture successfully started in renderer");
        setIsCapturing(true);
        return true;
      } catch (err) {
        const errorMessage = `Ошибка при начале захвата аудио: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMessage, err);
        setError(errorMessage);

        // Try to notify main process of failure if we previously didn't
        try {
          await window.api.audio.stopCapture();
        } catch (stopErr) {
          console.error("Failed to stop capture after error:", stopErr);
        }

        setIsCapturing(false);
        return false;
      }
    },
    [audioContext, captureStatus, sendAudioData]
  );

  // Modified stopCapture function in useAudioCapture.ts
  const stopCapture = useCallback(async () => {
    try {
      console.log("Stopping audio capture in renderer...");

      // First notify the main process to stop capture
      // This ensures the buffer on main side stops accepting data
      console.log("Notifying main process about capture stop");
      const result = await window.api.audio.stopCapture();

      // Only then stop the MediaRecorder
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        console.log("Stopping MediaRecorder");
        mediaRecorder.stop();

        // Останавливаем все дорожки в потоке
        console.log("Stopping all tracks in the stream");
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach((track) => {
          console.log(`Stopping track: ${track.kind}`);
          track.stop();
        });
      } else {
        console.log("MediaRecorder already inactive or not available");
      }

      // Clear any references to avoid memory leaks
      setMediaRecorder(null);
      if (audioContext) {
        console.log("Closing AudioContext");
        await audioContext.close();
        setAudioContext(null);
      }

      if (!result.success && !result.notCapturing) {
        throw new Error(result.error || "Не удалось остановить захват аудио");
      }

      setIsCapturing(false);
      console.log("Audio capture successfully stopped in renderer");
      return true;
    } catch (err) {
      setError(
        `Ошибка при остановке захвата аудио: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error("Ошибка при остановке захвата аудио:", err);

      // Force capturing state to false even if there was an error
      setIsCapturing(false);
      return false;
    }
  }, [mediaRecorder, audioContext]);

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
