import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const isTogglingRef = useRef<boolean>(false);

  // Инициализация хуков для работы с сервисами
  const { isCapturing, startCapture, stopCapture, captureStatus } =
    useAudioCapture();

  // Include setLastTranscription in the hook destructuring
  const {
    lastTranscription,
    transcriptionStatus,
    transcribeBuffer,
    startContinuousTranscription,
    stopContinuousTranscription,
    setLastTranscription,
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

  //   // Add a guard to prevent multiple simultaneous calls
  //   if (isTogglingRef.current) {
  //     debugLog("App", "Toggle already in progress, ignoring");
  //     return;
  //   }

  //   isTogglingRef.current = true;

  //   if (!isCapturing && !isTranscribing) {
  //     // Start capturing and transcribing
  //     startCapture()
  //       .then((success) => {
  //         if (success) {
  //           debugLog("App", "Started capturing audio");
  //           setIsTranscribing(true);

  //           // Set active panel to transcription to show the user what's being captured
  //           setActivePanel("transcription");

  //           // Wait a brief moment for audio capture to start before transcription
  //           setTimeout(() => {
  //             // Start continuous transcription
  //             startContinuousTranscription(2000, "ru");
  //             isTogglingRef.current = false;
  //           }, 500);
  //         } else {
  //           isTogglingRef.current = false;
  //         }
  //       })
  //       .catch(() => {
  //         isTogglingRef.current = false;
  //       });
  //   } else if (isCapturing && isTranscribing) {
  //     // First stop continuous transcription
  //     debugLog("App", "Stopping continuous transcription");
  //     stopContinuousTranscription();

  //     // Save the current transcription before stopping
  //     const currentTranscription = lastTranscription;

  //     // Final transcription
  //     transcribeBuffer("ru")
  //       .then((finalResult) => {
  //         debugLog(
  //           "App",
  //           "Final transcription before stopping:",
  //           finalResult?.text
  //         );

  //         // Then stop capturing
  //         stopCapture()
  //           .then((success) => {
  //             if (success) {
  //               debugLog("App", "Stopped capturing audio");

  //               // Add the last transcription to the queue - use finalResult if available
  //               const transcriptionToAdd = finalResult || currentTranscription;

  //               if (
  //                 transcriptionToAdd &&
  //                 transcriptionToAdd.text?.trim() !== ""
  //               ) {
  //                 debugLog(
  //                   "App",
  //                   "Adding transcription to queue:",
  //                   transcriptionToAdd.text
  //                 );

  //                 // Keep the transcription visible until we add it to the queue
  //                 if (finalResult) {
  //                   setLastTranscription(finalResult);
  //                 }

  //                 addLastTranscriptionToQueue()
  //                   .then(() => {
  //                     // Now we can set isTranscribing to false and switch panels
  //                     setIsTranscribing(false);
  //                     setActivePanel("queue");
  //                     debugLog("App", "Added transcription to queue");
  //                     isTogglingRef.current = false;
  //                   })
  //                   .catch(() => {
  //                     setIsTranscribing(false);
  //                     isTogglingRef.current = false;
  //                   });
  //               } else {
  //                 setIsTranscribing(false);
  //                 debugLog(
  //                   "App",
  //                   "No transcription to add or empty transcription"
  //                 );
  //                 isTogglingRef.current = false;
  //               }
  //             } else {
  //               setIsTranscribing(false);
  //               isTogglingRef.current = false;
  //             }
  //           })
  //           .catch(() => {
  //             setIsTranscribing(false);
  //             isTogglingRef.current = false;
  //           });
  //       })
  //       .catch(() => {
  //         stopCapture();
  //         setIsTranscribing(false);
  //         isTogglingRef.current = false;
  //       });
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
  //   transcribeBuffer,
  //   setLastTranscription,
  // ]);

  const toggleCaptureAndTranscription = useCallback(() => {
    debugLog(
      "App",
      `Toggle capture hotkey triggered, current state: isCapturing=${isCapturing}, isTranscribing=${isTranscribing}`
    );

    // Add a guard to prevent multiple simultaneous calls
    if (isTogglingRef.current) {
      debugLog("App", "Toggle already in progress, ignoring");
      return;
    }

    isTogglingRef.current = true;

    try {
      if (!isCapturing && !isTranscribing) {
        // STATE: Starting capture and transcription
        debugLog("App", "Starting audio capture and transcription");

        // Start capturing audio
        startCapture()
          .then((success) => {
            if (success) {
              debugLog("App", "Audio capture started successfully");

              // Set active panel to transcription
              setActivePanel("transcription");

              // Set transcribing state BEFORE starting continuous transcription
              setIsTranscribing(true);

              // Add a slight delay to ensure audio capture is fully initialized
              setTimeout(() => {
                // Start continuous transcription
                startContinuousTranscription(2000, "ru");
                debugLog("App", "Continuous transcription started");
                isTogglingRef.current = false;
              }, 1000); // Increased delay for better stability
            } else {
              debugLog("App", "Failed to start audio capture");
              isTogglingRef.current = false;
            }
          })
          .catch((error) => {
            console.error("Error starting capture:", error);
            isTogglingRef.current = false;
          });
      } else {
        // STATE: Stopping capture and transcription
        debugLog("App", "Stopping audio capture and transcription");

        // First stop continuous transcription to prevent further buffer requests
        stopContinuousTranscription();
        debugLog("App", "Continuous transcription stopped");

        // Wait a moment for any pending transcription to complete
        setTimeout(() => {
          // Do one final transcription
          transcribeBuffer("ru")
            .then((finalResult) => {
              debugLog(
                "App",
                "Final transcription completed",
                finalResult?.text
              );

              // Stop the audio capture
              stopCapture()
                .then((success) => {
                  if (success) {
                    debugLog("App", "Audio capture stopped successfully");

                    // Save the transcription result (if any)
                    if (finalResult && finalResult.text?.trim() !== "") {
                      setLastTranscription(finalResult);
                      debugLog(
                        "App",
                        "Setting final transcription",
                        finalResult.text
                      );

                      // Add the transcription to the queue
                      addLastTranscriptionToQueue()
                        .then(() => {
                          setIsTranscribing(false);
                          setActivePanel("queue");
                          debugLog("App", "Added transcription to queue");
                          isTogglingRef.current = false;
                        })
                        .catch((error) => {
                          console.error(
                            "Error adding transcription to queue:",
                            error
                          );
                          setIsTranscribing(false);
                          isTogglingRef.current = false;
                        });
                    } else {
                      // No transcription to add
                      setIsTranscribing(false);
                      debugLog("App", "No transcription to add (empty buffer)");
                      isTogglingRef.current = false;
                    }
                  } else {
                    setIsTranscribing(false);
                    debugLog("App", "Failed to stop audio capture");
                    isTogglingRef.current = false;
                  }
                })
                .catch((error) => {
                  console.error("Error stopping capture:", error);
                  setIsTranscribing(false);
                  isTogglingRef.current = false;
                });
            })
            .catch((error) => {
              console.error("Error in final transcription:", error);
              // Even if transcription fails, try to stop the capture
              stopCapture().catch((e) =>
                console.error(
                  "Error stopping capture after transcription failure:",
                  e
                )
              );
              setIsTranscribing(false);
              isTogglingRef.current = false;
            });
        }, 500);
      }
    } catch (error) {
      console.error(
        "Unexpected error in toggleCaptureAndTranscription:",
        error
      );
      // Make sure we clean up properly
      if (isCapturing) {
        stopCapture().catch((e) =>
          console.error("Error stopping capture during error recovery:", e)
        );
      }
      if (isTranscribing) {
        stopContinuousTranscription();
      }
      setIsTranscribing(false);
      isTogglingRef.current = false;
    }
  }, [
    isCapturing,
    isTranscribing,
    startCapture,
    stopCapture,
    transcribeBuffer,
    addLastTranscriptionToQueue,
    startContinuousTranscription,
    stopContinuousTranscription,
    setLastTranscription,
    setActivePanel,
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

  // Define setupKeyboardShortcuts function
  const setupKeyboardShortcuts = useCallback((callbacks: any) => {
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
  }, []);

  // Инициализация приложения
  // useEffect(() => {
  //   console.log("Initial useEffect running");

  //   const init = async () => {
  //     setIsLoading(true);
  //     debugLog("App", "Initializing application");

  //     try {
  //       // We don't auto-start audio capture anymore
  //       // Just initialize other components
  //       debugLog("App", "Application initialized successfully");
  //     } catch (error) {
  //       debugLog("App", "Failed to initialize application", error);
  //       console.error("Failed to initialize application:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   init();

  //   // Setup additional keyboard shortcuts
  //   const cleanupKeyboardShortcuts = setupKeyboardShortcuts({
  //     onToggleCapture: toggleCaptureAndTranscription,
  //     onAddLastText: () => {
  //       debugLog("App", "Add last text shortcut triggered from keyboard event");
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
  //   });

  //   return () => {
  //     debugLog("App", "Cleaning up on unmount");
  //     // Make sure to stop any ongoing processes
  //     if (isCapturing) {
  //       stopCapture();
  //     }
  //     if (isTranscribing) {
  //       stopContinuousTranscription();
  //     }
  //     // Reset toggle state
  //     isTogglingRef.current = false;

  //     if (typeof cleanupKeyboardShortcuts === "function") {
  //       cleanupKeyboardShortcuts();
  //     }
  //   };
  // }, [
  //   toggleCaptureAndTranscription,
  //   addLastTranscriptionToQueue,
  //   addScreenshotToQueue,
  //   handleSendToLLM,
  //   clearQueue,
  //   setupKeyboardShortcuts,
  //   isCapturing,
  //   isTranscribing,
  //   stopCapture,
  //   stopContinuousTranscription,
  // ]);

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

    // Remove the duplicate keyboard shortcut setup - IMPORTANT
    // We'll rely entirely on the useHotkeys hook

    return () => {
      debugLog("App", "Cleaning up on unmount");
      // Make sure to stop any ongoing processes
      if (isCapturing) {
        stopCapture();
      }
      if (isTranscribing) {
        stopContinuousTranscription();
      }
      // Reset toggle state
      isTogglingRef.current = false;
    };
  }, [isCapturing, isTranscribing, stopCapture, stopContinuousTranscription]);

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
