// import { useState, useEffect, useCallback, useRef } from "react";

// interface TranscriptionResult {
//   text: string;
//   timestamp: number;
//   language: string;
// }

// interface TranscriptionStatus {
//   status: "ready" | "error" | "processing";
//   message?: string;
// }

// export function useTranscription() {
//   const [lastTranscription, setLastTranscription] =
//     useState<TranscriptionResult | null>(null);
//   const [transcriptionStatus, setTranscriptionStatus] =
//     useState<TranscriptionStatus>({
//       status: "ready",
//     });
//   const [error, setError] = useState<string | null>(null);
//   const [transcriptionInterval, setTranscriptionIntervalState] =
//     useState<NodeJS.Timeout | null>(null);
//   const [isListeningForTranscription, setIsListeningForTranscription] =
//     useState(false);

//   // Use a ref to track pending transcription requests
//   const pendingTranscriptionRef = useRef<boolean>(false);

//   // Define transcribeBuffer FIRST so it can be used in other functions
//   // Функция для транскрибирования текущего буфера аудио
//   const transcribeBuffer = useCallback(
//     async (language: "ru" | "en" | "pl" = "ru") => {
//       try {
//         console.log(`Transcribing buffer with language: ${language}`);
//         setTranscriptionStatus({ status: "processing" });

//         const result = await window.api.whisper.transcribeBuffer({ language });

//         if (result) {
//           console.log(`Transcription successful: "${result.text}"`);
//           setLastTranscription(result);
//           setTranscriptionStatus({ status: "ready" });
//           return result;
//         } else {
//           console.log("No transcription result returned");
//           setTranscriptionStatus({ status: "ready" });
//           return null;
//         }
//       } catch (err) {
//         const errorMessage = `Ошибка при транскрибировании буфера: ${err instanceof Error ? err.message : String(err)}`;
//         console.error(errorMessage, err);
//         setError(errorMessage);
//         setTranscriptionStatus({
//           status: "error",
//           message: errorMessage,
//         });
//         return null;
//       }
//     },
//     []
//   );

//   // Запуск постоянной транскрипции с интервалом - now transcribeBuffer is available
//   const startContinuousTranscription = useCallback(
//     (intervalMs = 2000, language: "ru" | "en" | "pl" = "ru") => {
//       console.log(
//         `Starting continuous transcription with ${intervalMs}ms interval in ${language} language`
//       );

//       // Если интервал уже запущен, останавливаем его
//       if (transcriptionInterval) {
//         clearInterval(transcriptionInterval);
//         setTranscriptionIntervalState(null);
//       }

//       // Wait a bit before making the first transcription attempt
//       // This gives audio capture time to collect some data
//       setTimeout(() => {
//         // Only try transcription if not already pending
//         if (!pendingTranscriptionRef.current) {
//           pendingTranscriptionRef.current = true;
//           transcribeBuffer(language)
//             .then((result) => {
//               if (result) {
//                 console.log("Initial transcription successful:", result.text);
//                 setLastTranscription(result); // Make sure to update the state
//               } else {
//                 console.log("Initial transcription didn't return any result");
//               }
//               pendingTranscriptionRef.current = false;
//             })
//             .catch((err) => {
//               console.error("Error during initial transcription:", err);
//               pendingTranscriptionRef.current = false;
//             });
//         }
//       }, 2000); // Wait 2 seconds before first transcription

//       // Запускаем интервал для повторных транскрипций
//       const interval = setInterval(() => {
//         if (!pendingTranscriptionRef.current) {
//           pendingTranscriptionRef.current = true;
//           transcribeBuffer(language)
//             .then((result) => {
//               if (result) {
//                 console.log("Continuous transcription result:", result.text);
//                 setLastTranscription(result); // Make sure to update the state
//               } else {
//                 console.log("No transcription result returned");
//               }
//               pendingTranscriptionRef.current = false;
//             })
//             .catch((err) => {
//               console.error("Error during continuous transcription:", err);
//               pendingTranscriptionRef.current = false;
//             });
//         } else {
//           console.log(
//             "Skipping transcription - previous request still pending"
//           );
//         }
//       }, intervalMs);

//       setTranscriptionIntervalState(interval);

//       return () => {
//         console.log("Stopping continuous transcription");
//         clearInterval(interval);
//         setTranscriptionIntervalState(null);
//       };
//     },
//     [transcribeBuffer, transcriptionInterval]
//   );

//   // Остановка постоянной транскрипции
//   const stopContinuousTranscription = useCallback(() => {
//     console.log("Explicitly stopping continuous transcription");
//     if (transcriptionInterval) {
//       clearInterval(transcriptionInterval);
//       setTranscriptionIntervalState(null);
//     }
//   }, [transcriptionInterval]);

//   // Получаем последнюю транскрипцию при монтировании компонента
//   useEffect(() => {
//     console.log("Setting up transcription listeners");
//     const getLastTranscription = async () => {
//       try {
//         const result = await window.api.whisper.getLastTranscription();
//         if (result) {
//           console.log("Retrieved last transcription:", result);
//           setLastTranscription(result);
//         }
//       } catch (err) {
//         setError(
//           `Ошибка при получении последней транскрипции: ${err instanceof Error ? err.message : String(err)}`
//         );
//         console.error("Ошибка при получении последней транскрипции:", err);
//       }
//     };

//     getLastTranscription();

//     // Слушаем события от основного процесса
//     const removeTranscriptionResultListener =
//       window.api.whisper.onTranscriptionResult((result) => {
//         console.log("Received transcription result:", result);
//         setLastTranscription(result);
//         pendingTranscriptionRef.current = false;
//       });

//     const removeWhisperStatusListener = window.api.whisper.onWhisperStatus(
//       (status) => {
//         console.log("Whisper status changed:", status);
//         setTranscriptionStatus(status);
//       }
//     );

//     // Set up audio data listener - this helps ensure audio is being processed
//     const removeProcessAudioDataListener =
//       window.api.whisper.onProcessAudioData((audioData) => {
//         if (isListeningForTranscription) {
//           console.log(
//             `Received audio data for processing: ${audioData.length} bytes`
//           );
//         }
//       });

//     setIsListeningForTranscription(true);

//     return () => {
//       // Отписываемся от событий при размонтировании
//       removeTranscriptionResultListener();
//       removeWhisperStatusListener();
//       removeProcessAudioDataListener();
//       setIsListeningForTranscription(false);

//       // Очищаем интервал транскрипции при размонтировании
//       if (transcriptionInterval) {
//         clearInterval(transcriptionInterval);
//       }
//     };
//   }, [transcriptionInterval, isListeningForTranscription]);

//   return {
//     lastTranscription,
//     transcriptionStatus,
//     error,
//     transcribeBuffer,
//     startContinuousTranscription,
//     stopContinuousTranscription,
//     setLastTranscription, // Export setLastTranscription for use in App.tsx
//   };
// }

// Fixed useTranscription hook implementation
import { useState, useEffect, useCallback, useRef } from "react";

interface TranscriptionResult {
  text: string;
  timestamp: number;
  language: string;
}

interface TranscriptionStatus {
  status: "ready" | "error" | "processing";
  message?: string;
}

export function useTranscription() {
  const [lastTranscription, setLastTranscription] =
    useState<TranscriptionResult | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] =
    useState<TranscriptionStatus>({
      status: "ready",
    });
  const [error, setError] = useState<string | null>(null);
  const [isListeningForTranscription, setIsListeningForTranscription] =
    useState(false);

  // Use refs for internal state that shouldn't trigger re-renders
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptionRef = useRef<boolean>(false);
  const lastTranscriptionTextRef = useRef<string | null>(null);
  const continuousTranscriptionActiveRef = useRef<boolean>(false);

  // Function to transcribe current audio buffer
  const transcribeBuffer = useCallback(
    async (language: "ru" | "en" | "pl" = "ru") => {
      // Don't start a new transcription if one is already in progress
      if (pendingTranscriptionRef.current) {
        console.log("Transcription already in progress, skipping new request");
        return null;
      }

      try {
        console.log(`Transcribing buffer with language: ${language}`);
        pendingTranscriptionRef.current = true;
        setTranscriptionStatus({ status: "processing" });

        const result = await window.api.whisper.transcribeBuffer({ language });

        if (result) {
          console.log(`Transcription successful: "${result.text}"`);

          // Only update state if text is actually different to avoid unnecessary renders
          if (result.text !== lastTranscriptionTextRef.current) {
            lastTranscriptionTextRef.current = result.text;
            setLastTranscription(result);
          }

          setTranscriptionStatus({ status: "ready" });
          pendingTranscriptionRef.current = false;
          return result;
        } else {
          console.log("No transcription result returned");
          setTranscriptionStatus({ status: "ready" });
          pendingTranscriptionRef.current = false;
          return null;
        }
      } catch (err) {
        const errorMessage = `Error transcribing buffer: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMessage, err);
        setError(errorMessage);
        setTranscriptionStatus({
          status: "error",
          message: errorMessage,
        });
        pendingTranscriptionRef.current = false;
        return null;
      }
    },
    []
  );

  // Function to start continuous transcription
  const startContinuousTranscription = useCallback(
    (intervalMs = 2000, language: "ru" | "en" | "pl" = "ru") => {
      console.log(
        `Starting continuous transcription with ${intervalMs}ms interval in ${language} language`
      );

      // If a transcription interval is already running, stop it
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }

      // Set active flag
      continuousTranscriptionActiveRef.current = true;

      // Wait before first transcription to allow audio buffer to collect data
      setTimeout(() => {
        if (!continuousTranscriptionActiveRef.current) return;

        // Only try transcription if not already pending
        if (!pendingTranscriptionRef.current) {
          transcribeBuffer(language)
            .then((result) => {
              if (result) {
                console.log("Initial transcription successful:", result.text);
              } else {
                console.log("Initial transcription didn't return any result");
              }
            })
            .catch((err) => {
              console.error("Error during initial transcription:", err);
            });
        }
      }, 2000); // Initial delay

      // Start interval for repeated transcriptions
      const interval = setInterval(() => {
        if (!continuousTranscriptionActiveRef.current) {
          // If no longer active, clear the interval
          clearInterval(interval);
          return;
        }

        if (!pendingTranscriptionRef.current) {
          transcribeBuffer(language)
            .then((result) => {
              if (result) {
                console.log("Continuous transcription result:", result.text);
              } else {
                console.log("No transcription result returned");
              }
            })
            .catch((err) => {
              console.error("Error during continuous transcription:", err);
            });
        } else {
          console.log(
            "Skipping transcription - previous request still pending"
          );
        }
      }, intervalMs);

      transcriptionIntervalRef.current = interval;

      // Return cleanup function
      return () => {
        continuousTranscriptionActiveRef.current = false;
        if (transcriptionIntervalRef.current) {
          clearInterval(transcriptionIntervalRef.current);
          transcriptionIntervalRef.current = null;
        }
      };
    },
    [transcribeBuffer]
  );

  // Function to stop continuous transcription
  const stopContinuousTranscription = useCallback(() => {
    console.log("Explicitly stopping continuous transcription");
    continuousTranscriptionActiveRef.current = false;

    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }
  }, []);

  // Set up event listeners and initial state
  useEffect(() => {
    console.log("Setting up transcription listeners");

    const getLastTranscription = async () => {
      try {
        const result = await window.api.whisper.getLastTranscription();
        if (result) {
          console.log("Retrieved last transcription:", result);
          setLastTranscription(result);
          lastTranscriptionTextRef.current = result.text;
        }
      } catch (err) {
        setError(
          `Error getting last transcription: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Error getting last transcription:", err);
      }
    };

    getLastTranscription();

    // Set up event listeners
    const removeTranscriptionResultListener =
      window.api.whisper.onTranscriptionResult((result) => {
        console.log("Received transcription result:", result);
        if (result && result.text !== lastTranscriptionTextRef.current) {
          setLastTranscription(result);
          lastTranscriptionTextRef.current = result.text;
        }
        pendingTranscriptionRef.current = false;
      });

    const removeWhisperStatusListener = window.api.whisper.onWhisperStatus(
      (status) => {
        console.log("Whisper status changed:", status);
        setTranscriptionStatus(status);
      }
    );

    // Set up audio data listener
    const removeProcessAudioDataListener =
      window.api.whisper.onProcessAudioData((audioData) => {
        if (isListeningForTranscription) {
          console.log(
            `Received audio data for processing: ${audioData.length} bytes`
          );
        }
      });

    setIsListeningForTranscription(true);

    return () => {
      // Unsubscribe from events on unmount
      removeTranscriptionResultListener();
      removeWhisperStatusListener();
      removeProcessAudioDataListener();
      setIsListeningForTranscription(false);

      // Clean up transcription interval on unmount
      stopContinuousTranscription();
    };
  }, [stopContinuousTranscription]);

  return {
    lastTranscription,
    transcriptionStatus,
    error,
    transcribeBuffer,
    startContinuousTranscription,
    stopContinuousTranscription,
    setLastTranscription, // Export setLastTranscription for use in App.tsx
  };
}
