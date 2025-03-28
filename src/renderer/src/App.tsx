// import React, { useEffect, useState } from "react";
// import { Button } from "./components/ui/button";
// import { useAudioCapture } from "./hooks/useAudioCapture";
// import { useTranscription } from "./hooks/useTranscription";
// import { useQueue } from "./hooks/useQueue";
// import { useGemini } from "./hooks/useGemini";
// import { useHotkeys } from "./hooks/useHotkeys";

// // Компоненты
// import { MainPanel } from "./components/MainPanel";
// import { TranscriptionPanel } from "./components/TranscriptionPanel";
// import { QueuePanel } from "./components/QueuePanel";
// import { ResponsePanel } from "./components/ResponsePanel";
// import { SettingsPanel } from "./components/SettingsPanel";

// // Импортируем или создаем DebugPanel компонент, если он определен
// let DebugPanel: React.FC<{ isVisible: boolean }>;
// try {
//   // Динамический импорт для предотвращения ошибок, если компонент не существует
//   DebugPanel = require("./components/DebugPanel").DebugPanel;
// } catch (error) {
//   // Если компонент не найден, создаем заглушку
//   DebugPanel = ({ isVisible }) =>
//     isVisible ? (
//       <div className="fixed bottom-4 right-4 bg-background/80 p-2 rounded border">
//         Debug panel unavailable
//       </div>
//     ) : null;
//   console.warn("DebugPanel component not found, using fallback");
// }

// // Простая реализация debugLog, если утилиты не загружаются
// const debugLog = (scope: string, message: string, data?: any) => {
//   if (data) {
//     console.log(`[${scope}] ${message}`, data);
//   } else {
//     console.log(`[${scope}] ${message}`);
//   }
// };

// // Определяем setupKeyboardShortcuts, если модуль не загружается
// const setupKeyboardShortcuts = (callbacks: any) => {
//   console.log("Setting up keyboard shortcuts", callbacks);

//   // Простая реализация обработчика клавиатуры
//   const handler = (e: KeyboardEvent) => {
//     // CMD+I для переключения захвата
//     if ((e.metaKey || e.ctrlKey) && e.key === "i") {
//       e.preventDefault();
//       callbacks.onToggleCapture?.();
//     }
//     // CMD+O для добавления последней транскрипции
//     else if ((e.metaKey || e.ctrlKey) && e.key === "o") {
//       e.preventDefault();
//       callbacks.onAddLastText?.();
//     }
//   };

//   window.addEventListener("keydown", handler);
//   return () => window.removeEventListener("keydown", handler);
// };

// // Error Boundary для отлова ошибок рендеринга
// class ErrorBoundary extends React.Component<
//   { children: React.ReactNode },
//   { hasError: boolean; error: Error | null }
// > {
//   state = { hasError: false, error: null };

//   static getDerivedStateFromError(error: Error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
//     console.error("App crashed:", error, errorInfo);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div className="p-4 bg-red-100 text-red-900 rounded">
//           <h2>Something went wrong!</h2>
//           <details>
//             <summary>Error details</summary>
//             <pre>{this.state.error?.toString()}</pre>
//           </details>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// // Состояния интерфейса
// type UIMode = "compact" | "full";
// type ActivePanel = "transcription" | "queue" | "response" | "settings" | null;

// const App: React.FC = () => {
//   console.log("App component rendering");

//   // Состояние загрузки
//   const [isLoading, setIsLoading] = useState(true);

//   // Состояние UI
//   const [uiMode, setUIMode] = useState<UIMode>("full");
//   const [activePanel, setActivePanel] = useState<ActivePanel>("transcription");
//   const [isVisible, setIsVisible] = useState(true);
//   const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(true); // Set to true for debugging

//   // Инициализация хуков для работы с сервисами
//   const { isCapturing, startCapture, stopCapture, captureStatus } =
//     useAudioCapture();

//   const { lastTranscription, transcriptionStatus } = useTranscription();

//   const {
//     queue,
//     addLastTranscriptionToQueue,
//     addScreenshotToQueue,
//     clearQueue,
//     removeFromQueue,
//   } = useQueue();

//   const {
//     isGenerating,
//     generateResponse,
//     stopGeneration,
//     generatedResponse,
//     streamingChunks,
//   } = useGemini();

//   // Обработка отправки очереди в Gemini
//   const handleSendToLLM = async () => {
//     if (queue.length === 0 || isGenerating) return;

//     const texts = queue
//       .filter((item) => item.type === "text")
//       .map((item) => item.content);

//     const images = queue
//       .filter((item) => item.type === "image")
//       .map((item) => item.content);

//     await generateResponse({ texts, images, streaming: true });
//     setActivePanel("response");
//   };

//   // Регистрация обработчиков горячих клавиш
//   useHotkeys({
//     onAddLastText: () => {
//       console.log("Add last text hotkey triggered (CMD+O)");
//       addLastTranscriptionToQueue();
//     },
//     onAddScreenshot: () => {
//       addScreenshotToQueue();
//     },
//     onSendQueue: () => {
//       handleSendToLLM();
//     },
//     onClearQueue: () => {
//       clearQueue();
//     },
//     onToggleCollapse: () => {
//       setUIMode((prev) => (prev === "full" ? "compact" : "full"));
//     },
//     onToggleCapture: () => {
//       console.log(
//         `Toggle capture hotkey triggered (CMD+I): current state=${isCapturing}`
//       );
//       if (isCapturing) {
//         stopCapture();
//       } else {
//         startCapture();
//       }
//     },
//   });

//   // Автоматический запуск захвата аудио при запуске приложения
//   useEffect(() => {
//     console.log("Initial useEffect running");

//     const initCapture = async () => {
//       setIsLoading(true);
//       debugLog("App", "Initializing audio capture");
//       try {
//         await startCapture();
//         debugLog("App", "Audio capture started successfully");
//       } catch (error) {
//         debugLog("App", "Failed to start audio capture", error);
//         console.error("Failed to start audio capture:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     initCapture();

//     // Set up additional keyboard shortcuts
//     try {
//       const cleanupKeyboardShortcuts = setupKeyboardShortcuts({
//         onToggleCapture: () => {
//           debugLog(
//             "App",
//             "Toggle capture shortcut triggered from keyboard event"
//           );
//           if (isCapturing) {
//             stopCapture();
//           } else {
//             startCapture();
//           }
//         },
//         onAddLastText: () => {
//           debugLog(
//             "App",
//             "Add last text shortcut triggered from keyboard event"
//           );
//           addLastTranscriptionToQueue();
//         },
//         onAddScreenshot: () => {
//           addScreenshotToQueue();
//         },
//         onSendQueue: () => {
//           handleSendToLLM();
//         },
//         onClearQueue: () => {
//           clearQueue();
//         },
//         onToggleCollapse: () => {
//           setUIMode((prev) => (prev === "full" ? "compact" : "full"));
//         },
//       });

//       return () => {
//         debugLog("App", "Cleaning up on unmount");
//         stopCapture();
//         if (typeof cleanupKeyboardShortcuts === "function") {
//           cleanupKeyboardShortcuts();
//         }
//       };
//     } catch (error) {
//       console.error("Error setting up keyboard shortcuts:", error);
//       setIsLoading(false);

//       return () => {
//         debugLog("App", "Cleaning up on unmount");
//         stopCapture();
//       };
//     }
//   }, []);

//   // Проверка демонстрации экрана
//   useEffect(() => {
//     const checkScreenSharing = async () => {
//       try {
//         const isSharing = await window.api.isScreenSharing();
//         setIsVisible(!isSharing);
//       } catch (error) {
//         console.error("Error checking screen sharing:", error);
//       }
//     };

//     // Проверка каждые 5 секунд
//     const interval = setInterval(checkScreenSharing, 5000);

//     return () => {
//       clearInterval(interval);
//     };
//   }, []);

//   // Показываем индикатор загрузки, пока приложение инициализируется
//   if (isLoading) {
//     return (
//       <div className="h-screen flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
//         <p className="mt-4 text-muted-foreground">
//           Инициализация приложения...
//         </p>
//       </div>
//     );
//   }

//   // Если приложение должно быть скрыто, рендерим пустой div
//   if (!isVisible) {
//     return <div className="hidden" />;
//   }

//   console.log("Rendering main UI", {
//     isCapturing,
//     isGenerating,
//     queue: queue.length,
//   });

//   return (
//     <div
//       className={`h-screen flex flex-col bg-background/80 backdrop-blur-sm rounded-lg overflow-hidden
//                     transition-all duration-300 ease-in-out w-full`}>
//       {/* Основная панель управления */}
//       <MainPanel
//         isCapturing={isCapturing}
//         isGenerating={isGenerating}
//         uiMode={uiMode}
//         setUIMode={setUIMode}
//         activePanel={activePanel}
//         setActivePanel={setActivePanel}
//         queueSize={queue.length}
//         onToggleCapture={() => {
//           debugLog(
//             "App",
//             `Toggle capture button clicked, current state: ${isCapturing}`
//           );
//           if (isCapturing) {
//             stopCapture();
//           } else {
//             startCapture();
//           }
//         }}
//         onSendToLLM={handleSendToLLM}
//       />

//       {/* Содержимое активной панели */}
//       <div className="flex-1 overflow-hidden">
//         {uiMode === "full" && (
//           <>
//             {/* Панель транскрипции */}
//             {activePanel === "transcription" && (
//               <TranscriptionPanel
//                 lastTranscription={lastTranscription}
//                 isCapturing={isCapturing}
//                 onAddToQueue={addLastTranscriptionToQueue}
//               />
//             )}

//             {/* Панель очереди */}
//             {activePanel === "queue" && (
//               <QueuePanel
//                 queue={queue}
//                 onRemoveItem={removeFromQueue}
//                 onClearQueue={clearQueue}
//                 onSendToLLM={handleSendToLLM}
//               />
//             )}

//             {/* Панель ответа */}
//             {activePanel === "response" && (
//               <ResponsePanel
//                 response={generatedResponse}
//                 streamingChunks={streamingChunks}
//                 isGenerating={isGenerating}
//                 onStopGeneration={stopGeneration}
//               />
//             )}

//             {/* Панель настроек */}
//             {activePanel === "settings" && <SettingsPanel />}
//           </>
//         )}
//       </div>

//       {/* Мини-панель для управления в компактном режиме */}
//       {uiMode === "compact" && (
//         <div className="p-2 flex flex-col gap-2">
//           <Button
//             size="sm"
//             variant={isCapturing ? "destructive" : "default"}
//             onClick={() => (isCapturing ? stopCapture() : startCapture())}>
//             {isCapturing ? "Стоп" : "Старт"}
//           </Button>

//           <Button
//             size="sm"
//             variant="outline"
//             onClick={addLastTranscriptionToQueue}
//             disabled={!lastTranscription}>
//             Добавить текст
//           </Button>

//           <Button size="sm" variant="outline" onClick={addScreenshotToQueue}>
//             Скриншот
//           </Button>

//           <Button
//             size="sm"
//             variant="default"
//             onClick={handleSendToLLM}
//             disabled={queue.length === 0 || isGenerating}>
//             Отправить
//           </Button>
//         </div>
//       )}

//       {/* Индикатор статуса в нижней части окна */}
//       <div className="px-4 py-2 text-xs text-muted-foreground border-t">
//         <div className="flex justify-between">
//           <span>{isCapturing ? "Запись..." : "Запись остановлена"}</span>
//           <span>Элементов в очереди: {queue.length}</span>
//         </div>
//       </div>

//       {/* Debug Panel - only visible in development */}
//       {DebugPanel && <DebugPanel isVisible={isDebugPanelVisible} />}
//     </div>
//   );
// };

// // Оборачиваем компонент в ErrorBoundary
// const AppWithErrorBoundary: React.FC = () => (
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>
// );

// export default AppWithErrorBoundary;

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "./components/ui/button";
import { useAudioCapture } from "./hooks/useAudioCapture";
import { useTranscription } from "./hooks/useTranscription";
import { useQueue } from "./hooks/useQueue";
import { useGemini } from "./hooks/useGemini";
import { useHotkeys } from "./hooks/useHotkeys";

// Компоненты
import { MainPanel } from "./components/MainPanel";
import { TranscriptionPanel } from "./components/TranscriptionPanel";
import { QueuePanel } from "./components/QueuePanel";
import { ResponsePanel } from "./components/ResponsePanel";
import { SettingsPanel } from "./components/SettingsPanel";

// Импортируем или создаем DebugPanel компонент, если он определен
let DebugPanel: React.FC<{ isVisible: boolean }>;
try {
  // Динамический импорт для предотвращения ошибок, если компонент не существует
  DebugPanel = require("./components/DebugPanel").DebugPanel;
} catch (error) {
  // Если компонент не найден, создаем заглушку
  DebugPanel = ({ isVisible }) =>
    isVisible ? (
      <div className="fixed bottom-4 right-4 bg-background/80 p-2 rounded border">
        Debug panel unavailable
      </div>
    ) : null;
  console.warn("DebugPanel component not found, using fallback");
}

// Простая реализация debugLog, если утилиты не загружаются
const debugLog = (scope: string, message: string, data?: any) => {
  if (data) {
    console.log(`[${scope}] ${message}`, data);
  } else {
    console.log(`[${scope}] ${message}`);
  }
};

// Error Boundary для отлова ошибок рендеринга
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-900 rounded">
          <h2>Something went wrong!</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Состояния интерфейса
type UIMode = "compact" | "full";
type ActivePanel = "transcription" | "queue" | "response" | "settings" | null;

const App: React.FC = () => {
  console.log("App component rendering");

  // Состояние загрузки
  const [isLoading, setIsLoading] = useState(true);

  // Состояние UI
  const [uiMode, setUIMode] = useState<UIMode>("full");
  const [activePanel, setActivePanel] = useState<ActivePanel>("transcription");
  const [isVisible, setIsVisible] = useState(true);
  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(true); // Set to true for debugging

  // Инициализация хуков для работы с сервисами
  const { isCapturing, startCapture, stopCapture, captureStatus } =
    useAudioCapture();

  const {
    lastTranscription,
    transcriptionStatus,
    transcribeBuffer,
    startContinuousTranscription,
    stopContinuousTranscription,
  } = useTranscription();

  const {
    queue,
    addLastTranscriptionToQueue,
    addScreenshotToQueue,
    clearQueue,
    removeFromQueue,
  } = useQueue();

  const {
    isGenerating,
    generateResponse,
    stopGeneration,
    generatedResponse,
    streamingChunks,
  } = useGemini();

  // Flag to track if continuous transcription is active
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Toggle audio capture and transcription with CMD+I
  // const toggleCaptureAndTranscription = useCallback(() => {
  //   debugLog(
  //     "App",
  //     `Toggle capture hotkey triggered, current state: ${isCapturing}, transcribing: ${isTranscribing}`
  //   );

  //   if (!isCapturing && !isTranscribing) {
  //     // Start capturing and transcribing
  //     startCapture().then((success) => {
  //       if (success) {
  //         setIsTranscribing(true);
  //         // Set active panel to transcription to show the user what's being captured
  //         setActivePanel("transcription");
  //         // Start continuous transcription with 2-second interval
  //         startContinuousTranscription(2000, "ru");
  //         debugLog("App", "Started capturing and transcribing");
  //       }
  //     });
  //   } else if (isCapturing && isTranscribing) {
  //     // Stop capturing, add last transcription to queue
  //     stopContinuousTranscription();
  //     stopCapture().then((success) => {
  //       if (success) {
  //         setIsTranscribing(false);
  //         // Add the last transcription to the queue
  //         if (lastTranscription) {
  //           addLastTranscriptionToQueue().then(() => {
  //             // Switch to queue panel to show the added transcription
  //             setActivePanel("queue");
  //             debugLog("App", "Added transcription to queue");
  //           });
  //         }
  //         debugLog("App", "Stopped capturing and transcribing");
  //       }
  //     });
  //   }
  // }, [
  //   isCapturing,
  //   isTranscribing,
  //   startCapture,
  //   stopCapture,
  //   lastTranscription,
  //   addLastTranscriptionToQueue,
  //   startContinuousTranscription,
  //   stopContinuousTranscription,
  // ]);

  // TODO: TEST  DATA  ADD  HERE
  // Add synchronization between audio and transcription systems
  useEffect(() => {
    // This is a temporary solution until the audio buffer issue is fixed
    if (isCapturing && isTranscribing) {
      console.log("Starting mock transcription system");

      // Initial transcription
      const initialTranscription = {
        text: "Тестовая транскрипция активирована. Говорите что-нибудь...",
        timestamp: Date.now(),
        language: "ru",
      };
      setIsTranscribing(initialTranscription);

      // Update transcription every few seconds to simulate real-time transcription
      const transcriptionInterval = setInterval(() => {
        const currentTime = new Date().toLocaleTimeString();
        const updatedTranscription = {
          text: `Транскрипция текста в ${currentTime}. Нажмите CMD+I чтобы остановить и добавить в очередь.`,
          timestamp: Date.now(),
          language: "ru",
        };
        setIsTranscribing(updatedTranscription);
      }, 3000);

      return () => {
        console.log("Stopping mock transcription system");
        clearInterval(transcriptionInterval);
      };
    }
  }, [isCapturing, isTranscribing]);

  // Then, update your toggle function to use a different approach:

  // Toggle audio capture and transcription with CMD+I
  const toggleCaptureAndTranscription = useCallback(() => {
    debugLog(
      "App",
      `Toggle capture hotkey triggered, current state: ${isCapturing}, transcribing: ${isTranscribing}`
    );

    if (!isCapturing && !isTranscribing) {
      // Start capturing and transcribing
      startCapture().then((success) => {
        if (success) {
          debugLog("App", "Started capturing audio");
          setIsTranscribing(true);

          // Set active panel to transcription to show the user what's being captured
          setActivePanel("transcription");

          // Wait a brief moment for audio capture to start before transcription
          setTimeout(() => {
            // Start continuous transcription
            startContinuousTranscription(2000, "ru");
          }, 500);
        }
      });
    } else if (isCapturing && isTranscribing) {
      // First stop continuous transcription
      debugLog("App", "Stopping continuous transcription");
      stopContinuousTranscription();

      // Save the current transcription before stopping
      const currentTranscription = lastTranscription;

      // Final transcription
      transcribeBuffer("ru").then((finalResult) => {
        debugLog(
          "App",
          "Final transcription before stopping:",
          finalResult?.text
        );

        // Then stop capturing
        stopCapture().then((success) => {
          if (success) {
            debugLog("App", "Stopped capturing audio");

            // IMPORTANT: Don't immediately reset isTranscribing here
            // We'll do it after adding to queue

            // Add the last transcription to the queue - use finalResult if available
            const transcriptionToAdd = finalResult || currentTranscription;

            if (transcriptionToAdd && transcriptionToAdd.text.trim() !== "") {
              debugLog(
                "App",
                "Adding transcription to queue:",
                transcriptionToAdd.text
              );

              // Keep the transcription visible until we add it to the queue
              if (finalResult) {
                setLastTranscription(finalResult);
              }

              addLastTranscriptionToQueue().then(() => {
                // Now we can set isTranscribing to false and switch panels
                setIsTranscribing(false);
                setActivePanel("queue");
                debugLog("App", "Added transcription to queue");
              });
            } else {
              setIsTranscribing(false);
              debugLog("App", "No transcription to add or empty transcription");
            }
          }
        });
      });
    }
  }, [
    isCapturing,
    isTranscribing,
    startCapture,
    stopCapture,
    lastTranscription,
    addLastTranscriptionToQueue,
    startContinuousTranscription,
    stopContinuousTranscription,
    transcribeBuffer,
  ]);

  // Обработка отправки очереди в Gemini
  const handleSendToLLM = async () => {
    if (queue.length === 0 || isGenerating) return;

    const texts = queue
      .filter((item) => item.type === "text")
      .map((item) => item.content);

    const images = queue
      .filter((item) => item.type === "image")
      .map((item) => item.content);

    await generateResponse({ texts, images, streaming: true });
    setActivePanel("response");
  };

  // Регистрация обработчиков горячих клавиш
  useHotkeys({
    onAddLastText: () => {
      console.log("Add last text hotkey triggered (CMD+O)");
      addLastTranscriptionToQueue();
    },
    onAddScreenshot: () => {
      addScreenshotToQueue();
    },
    onSendQueue: () => {
      handleSendToLLM();
    },
    onClearQueue: () => {
      clearQueue();
    },
    onToggleCollapse: () => {
      setUIMode((prev) => (prev === "full" ? "compact" : "full"));
    },
    onToggleCapture: toggleCaptureAndTranscription,
  });

  // Инициализация приложения
  useEffect(() => {
    console.log("Initial useEffect running");

    const init = async () => {
      setIsLoading(true);
      debugLog("App", "Initializing application");

      try {
        // We don't auto-start audio capture anymore
        // Just initialize other components
        debugLog("App", "Application initialized successfully");
      } catch (error) {
        debugLog("App", "Failed to initialize application", error);
        console.error("Failed to initialize application:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Setup additional keyboard shortcuts
    try {
      const cleanupKeyboardShortcuts = setupKeyboardShortcuts({
        onToggleCapture: toggleCaptureAndTranscription,
        onAddLastText: () => {
          debugLog(
            "App",
            "Add last text shortcut triggered from keyboard event"
          );
          addLastTranscriptionToQueue();
        },
        onAddScreenshot: () => {
          addScreenshotToQueue();
        },
        onSendQueue: () => {
          handleSendToLLM();
        },
        onClearQueue: () => {
          clearQueue();
        },
        onToggleCollapse: () => {
          setUIMode((prev) => (prev === "full" ? "compact" : "full"));
        },
      });

      return () => {
        debugLog("App", "Cleaning up on unmount");
        // Make sure to stop any ongoing processes
        if (isCapturing) {
          stopCapture();
        }
        if (isTranscribing) {
          stopContinuousTranscription();
        }

        if (typeof cleanupKeyboardShortcuts === "function") {
          cleanupKeyboardShortcuts();
        }
      };
    } catch (error) {
      console.error("Error setting up keyboard shortcuts:", error);
      setIsLoading(false);

      return () => {
        debugLog("App", "Cleaning up on unmount");
        if (isCapturing) {
          stopCapture();
        }
        if (isTranscribing) {
          stopContinuousTranscription();
        }
      };
    }
  }, []);

  // Define setupKeyboardShortcuts function
  const setupKeyboardShortcuts = (callbacks: any) => {
    console.log("Setting up keyboard shortcuts", callbacks);

    // Simple keyboard event handler
    const handler = (e: KeyboardEvent) => {
      // CMD+I for toggling capture
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault();
        callbacks.onToggleCapture?.();
      }
      // CMD+O for adding last transcription
      else if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        callbacks.onAddLastText?.();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  };

  // Проверка демонстрации экрана
  useEffect(() => {
    const checkScreenSharing = async () => {
      try {
        const isSharing = await window.api.isScreenSharing();
        setIsVisible(!isSharing);
      } catch (error) {
        console.error("Error checking screen sharing:", error);
      }
    };

    // Проверка каждые 5 секунд
    const interval = setInterval(checkScreenSharing, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Показываем индикатор загрузки, пока приложение инициализируется
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">
          Инициализация приложения...
        </p>
      </div>
    );
  }

  // Если приложение должно быть скрыто, рендерим пустой div
  if (!isVisible) {
    return <div className="hidden" />;
  }

  console.log("Rendering main UI", {
    isCapturing,
    isGenerating,
    queue: queue.length,
    isTranscribing,
  });

  return (
    <div
      className={`h-screen flex flex-col bg-background/80 backdrop-blur-sm rounded-lg overflow-hidden
                    transition-all duration-300 ease-in-out w-full`}>
      {/* Основная панель управления */}
      <MainPanel
        isCapturing={isCapturing}
        isGenerating={isGenerating}
        uiMode={uiMode}
        setUIMode={setUIMode}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        queueSize={queue.length}
        onToggleCapture={toggleCaptureAndTranscription}
        onSendToLLM={handleSendToLLM}
        isTranscribing={isTranscribing}
      />

      {/* Содержимое активной панели */}
      <div className="flex-1 overflow-hidden">
        {uiMode === "full" && (
          <>
            {/* Панель транскрипции */}
            {activePanel === "transcription" && (
              <TranscriptionPanel
                lastTranscription={lastTranscription}
                isCapturing={isCapturing}
                onAddToQueue={addLastTranscriptionToQueue}
                isTranscribing={isTranscribing}
              />
            )}

            {/* Панель очереди */}
            {activePanel === "queue" && (
              <QueuePanel
                queue={queue}
                onRemoveItem={removeFromQueue}
                onClearQueue={clearQueue}
                onSendToLLM={handleSendToLLM}
              />
            )}

            {/* Панель ответа */}
            {activePanel === "response" && (
              <ResponsePanel
                response={generatedResponse}
                streamingChunks={streamingChunks}
                isGenerating={isGenerating}
                onStopGeneration={stopGeneration}
              />
            )}

            {/* Панель настроек */}
            {activePanel === "settings" && <SettingsPanel />}
          </>
        )}
      </div>

      {/* Мини-панель для управления в компактном режиме */}
      {uiMode === "compact" && (
        <div className="p-2 flex flex-col gap-2">
          <Button
            size="sm"
            variant={isCapturing ? "destructive" : "default"}
            onClick={toggleCaptureAndTranscription}>
            {isCapturing
              ? isTranscribing
                ? "Стоп+Добавить"
                : "Стоп"
              : "Начать запись"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={addLastTranscriptionToQueue}
            disabled={!lastTranscription}>
            Добавить текст
          </Button>

          <Button size="sm" variant="outline" onClick={addScreenshotToQueue}>
            Скриншот
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handleSendToLLM}
            disabled={queue.length === 0 || isGenerating}>
            Отправить
          </Button>
        </div>
      )}

      {/* Индикатор статуса в нижней части окна */}
      <div className="px-4 py-2 text-xs text-muted-foreground border-t">
        <div className="flex justify-between">
          <span>
            {isCapturing
              ? isTranscribing
                ? "Запись и транскрипция... (CMD+I для остановки и добавления в очередь)"
                : "Запись..."
              : "Запись остановлена"}
          </span>
          <span>Элементов в очереди: {queue.length}</span>
        </div>
      </div>

      {/* Debug Panel - only visible in development */}
      {DebugPanel && <DebugPanel isVisible={isDebugPanelVisible} />}
    </div>
  );
};

// Оборачиваем компонент в ErrorBoundary
const AppWithErrorBoundary: React.FC = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
