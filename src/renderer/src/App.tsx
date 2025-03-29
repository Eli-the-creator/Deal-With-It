import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "./components/ui/button";
import { useAudioCapture } from "./hooks/useAudioCapture";
import { useTranscription } from "./hooks/useTranscription";
import { useQueue } from "./hooks/useQueue";
import { useGemini } from "./hooks/useGemini";
import { useHotkeys } from "./hooks/useHotkeys";

// Components
import { MainPanel } from "./components/MainPanel";
import { TranscriptionPanel } from "./components/TranscriptionPanel";
import { QueuePanel } from "./components/QueuePanel";
import { ResponsePanel } from "./components/ResponsePanel";
import { SettingsPanel } from "./components/SettingsPanel";

// Import or create DebugPanel component if defined
let DebugPanel: React.FC<{ isVisible: boolean }>;
try {
  // Dynamic import to prevent errors if component doesn't exist
  DebugPanel = require("./components/DebugPanel").DebugPanel;
} catch (error) {
  // If component isn't found, create a fallback
  DebugPanel = ({ isVisible }) =>
    isVisible ? (
      <div className="fixed bottom-4 right-4 bg-background/80 p-2 rounded border">
        Debug panel unavailable
      </div>
    ) : null;
  console.warn("DebugPanel component not found, using fallback");
}

// Simple debugLog implementation if utilities don't load
const debugLog = (scope: string, message: string, data?: any) => {
  if (data) {
    console.log(`[${scope}] ${message}`, data);
  } else {
    console.log(`[${scope}] ${message}`);
  }
};

// Error Boundary to catch rendering errors
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

// UI states
type UIMode = "compact" | "full";
type ActivePanel = "transcription" | "queue" | "response" | "settings" | null;

const App: React.FC = () => {
  console.log("App component rendering");

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [uiMode, setUIMode] = useState<UIMode>("full");
  const [activePanel, setActivePanel] = useState<ActivePanel>("transcription");

  // REMOVED: The isVisible state is no longer needed as it was tied to screen sharing detection
  // The app will always be visible to the user but invisible to screen capture

  const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(true); // Set to true for debugging
  const isTogglingRef = useRef<boolean>(false);

  // Initialize hooks for working with services
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
      // STATE 1: Currently not capturing or transcribing - we need to start
      if (!isCapturing && !isTranscribing) {
        debugLog("App", "Starting audio capture for DeepGram transcription");

        // Start capturing audio
        startCapture()
          .then((success) => {
            if (success) {
              debugLog("App", "Audio capture started successfully");

              // Set active panel to transcription
              setActivePanel("transcription");

              // Set transcribing state BEFORE starting continuous transcription
              setIsTranscribing(true);

              // With DeepGram, we're only capturing audio now, not doing continuous transcription
              // We just need to set up monitoring of the audio buffer
              console.log(
                "Audio capture started, collecting data for DeepGram transcription..."
              );

              // Start a lightweight continuous transcription system
              // This doesn't actually transcribe during recording, just monitors
              setTimeout(() => {
                startContinuousTranscription(2000, "en");
                debugLog("App", "DeepGram monitoring started");
                isTogglingRef.current = false;
              }, 1000);
            } else {
              debugLog("App", "Failed to start audio capture");
              isTogglingRef.current = false;
            }
          })
          .catch((error) => {
            console.error("Error starting capture:", error);
            isTogglingRef.current = false;
          });
      }
      // STATE 2: Currently capturing and transcribing - we need to stop and add to queue
      else if (isCapturing && isTranscribing) {
        debugLog("App", "Stopping audio capture and sending to DeepGram");

        // First stop continuous transcription monitoring
        stopContinuousTranscription();
        debugLog("App", "Audio monitoring stopped");

        // Wait a moment to finalize audio capture
        setTimeout(() => {
          // Now do the actual DeepGram transcription of the entire recording
          debugLog("App", "Sending audio to DeepGram for transcription");

          transcribeBuffer("en") // Or language of choice
            .then((finalResult) => {
              debugLog(
                "App",
                "DeepGram transcription completed",
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
                        "Setting DeepGram transcription",
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
              console.error("Error in DeepGram transcription:", error);
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

  // Handling queue submission to Gemini
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

  // Register hotkey handlers
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

    // REMOVED: We don't need to check for screen sharing status anymore
    // The window is natively resistant to screen capture

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

  // Show loading indicator while app initializes
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">
          Initializing application...
        </p>
      </div>
    );
  }

  // REMOVED: We don't need to conditionally render based on isVisible anymore
  // The app is always visible to the user but invisible to screen capture

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
      {/* Main control panel */}
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

      {/* Active panel content */}
      <div className="flex-1 overflow-hidden">
        {uiMode === "full" && (
          <>
            {/* Transcription panel */}
            {activePanel === "transcription" && (
              <TranscriptionPanel
                lastTranscription={lastTranscription}
                isCapturing={isCapturing}
                onAddToQueue={addLastTranscriptionToQueue}
                isTranscribing={isTranscribing}
              />
            )}

            {/* Queue panel */}
            {activePanel === "queue" && (
              <QueuePanel
                queue={queue}
                onRemoveItem={removeFromQueue}
                onClearQueue={clearQueue}
                onSendToLLM={handleSendToLLM}
              />
            )}

            {/* Response panel */}
            {activePanel === "response" && (
              <ResponsePanel
                response={generatedResponse}
                streamingChunks={streamingChunks}
                isGenerating={isGenerating}
                onStopGeneration={stopGeneration}
              />
            )}

            {/* Settings panel */}
            {activePanel === "settings" && <SettingsPanel />}
          </>
        )}
      </div>

      {/* Mini control panel for compact mode */}
      {uiMode === "compact" && (
        <div className="p-2 flex flex-col gap-2">
          <Button
            size="sm"
            variant={isCapturing ? "destructive" : "default"}
            onClick={toggleCaptureAndTranscription}>
            {isCapturing
              ? isTranscribing
                ? "Stop+Add"
                : "Stop"
              : "Start Recording"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={addLastTranscriptionToQueue}
            disabled={!lastTranscription}>
            Add Text
          </Button>

          <Button size="sm" variant="outline" onClick={addScreenshotToQueue}>
            Screenshot
          </Button>

          <Button
            size="sm"
            variant="default"
            onClick={handleSendToLLM}
            disabled={queue.length === 0 || isGenerating}>
            Send
          </Button>
        </div>
      )}

      {/* Status indicator at bottom of window */}
      <div className="px-4 py-2 text-xs text-muted-foreground border-t">
        <div className="flex justify-between">
          <span>
            {isCapturing
              ? isTranscribing
                ? "Recording and transcribing... (CMD+I to stop and add to queue)"
                : "Recording..."
              : "Recording stopped"}
          </span>
          <span>Queue items: {queue.length}</span>
        </div>
      </div>

      {/* Debug Panel - only visible in development */}
      {DebugPanel && <DebugPanel isVisible={isDebugPanelVisible} />}
    </div>
  );
};

export default App;
