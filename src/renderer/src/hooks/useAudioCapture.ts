import { useState, useEffect, useCallback, useRef } from "react";

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

  // Ref to track ongoing operations
  const operationInProgressRef = useRef<boolean>(false);

  // Initialize audio capture when component mounts
  useEffect(() => {
    const initAudioCapture = async () => {
      try {
        console.log("Initializing audio capture in hook...");

        // Request audio sources list
        await window.api.audio.initAudioCapture();

        // Get current capture status
        const status = await window.api.audio.getCaptureStatus();
        setCaptureStatus(status);
        setIsCapturing(status?.isCapturing || false);
        console.log("Initial capture status:", status);
      } catch (err) {
        setError(
          `Error initializing audio capture: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Error initializing audio capture:", err);
      }
    };

    initAudioCapture();

    // Set up event listeners from main process
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
        if (!isCapturing && !operationInProgressRef.current) {
          startCapture(data.sourceId);
        }
      }
    );

    // Listen for stop-capture command from main process
    const removeStopCaptureListener = window.api.audio.onStopCapture(() => {
      console.log("Received stop-capture command from main process");
      if (isCapturing && !operationInProgressRef.current) {
        stopCapture();
      }
    });

    return () => {
      console.log("Cleaning up audio capture hook...");

      // Unsubscribe from events
      if (typeof removeAudioSourcesListener === "function")
        removeAudioSourcesListener();
      if (typeof removeAudioSettingsListener === "function")
        removeAudioSettingsListener();
      if (typeof removeStartCaptureListener === "function")
        removeStartCaptureListener();
      if (typeof removeStopCaptureListener === "function")
        removeStopCaptureListener();

      // Stop capture during cleanup if needed
      if (isCapturing) {
        console.log("Stopping audio capture during cleanup");
        window.api.audio.stopCapture().catch((err) => {
          console.error("Error stopping capture during cleanup:", err);
        });
      }

      // Cleanup MediaRecorder and AudioContext
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        console.log("Stopping MediaRecorder during cleanup");
        mediaRecorder.stop();
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      }

      if (audioContext) {
        console.log("Closing AudioContext during cleanup");
        audioContext.close().catch((err) => {
          console.error("Error closing AudioContext:", err);
        });
      }
    };
  }, [isCapturing]);

  // Function to send audio data to main process
  const sendAudioData = useCallback(
    (data: Uint8Array) => {
      if (isCapturing) {
        window.api.audio.sendAudioData(data);
      }
    },
    [isCapturing]
  );

  // Function to start audio capture
  const startCapture = useCallback(
    async (sourceId?: string) => {
      // Prevent multiple simultaneous operations
      if (operationInProgressRef.current || isCapturing) {
        console.log("Operation already in progress or already capturing");
        return isCapturing; // Return current state if already in progress
      }

      operationInProgressRef.current = true;

      try {
        console.log("Starting audio capture in renderer process...");

        // First, notify the main process we're starting capture
        // This ensures the buffer is ready in the main process
        console.log("Notifying main process about capture start");
        const result = await window.api.audio.startCapture(sourceId);

        if (!result.success) {
          throw new Error(
            result.error || "Failed to start audio capture in main process"
          );
        }

        // Create AudioContext if not already created
        let newAudioContext = audioContext;
        if (!newAudioContext) {
          newAudioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)({
            sampleRate: captureStatus?.settings.sampleRate || 16000,
          });
          setAudioContext(newAudioContext);
        }

        // Request media with appropriate constraints
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

        // Check permissions first
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("Audio permission granted");
        } catch (permError) {
          console.error("Failed to get audio permission:", permError);
          throw new Error("Audio permission denied");
        }

        // Get the actual stream with specified constraints
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Media stream obtained. Creating recorder...");

        // Clean up any previous MediaRecorder
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          console.log("Stopping previous MediaRecorder");
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }

        // Create MediaRecorder with the most compatible settings
        // Try several MIME types to find the most compatible one
        let mimeType = "audio/webm";
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          console.warn("No preferred MIME types supported, using default");
        }

        console.log(`Using MIME type: ${mimeType} for MediaRecorder`);
        const recorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          audioBitsPerSecond: 128000, // Use a higher bitrate for better quality
        });

        console.log("Recorder created with MIME type:", recorder.mimeType);

        // Set up data handler with better error handling and logging
        recorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            console.log(
              `Received audio chunk from MediaRecorder: ${event.data.size} bytes`
            );

            try {
              // Create a promise-based version of FileReader for better async handling
              const readAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> => {
                return new Promise((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as ArrayBuffer);
                  reader.onerror = reject;
                  reader.readAsArrayBuffer(blob);
                });
              };

              // Read the blob data as array buffer
              const arrayBuffer = await readAsArrayBuffer(event.data);
              const uint8Array = new Uint8Array(arrayBuffer);

              // Log before sending data
              console.log(
                `Sending audio data to main process: ${uint8Array.length} bytes`
              );

              // Send data to main process
              window.api.audio.sendAudioData(uint8Array);

              // Log after sending data
              console.log(`Successfully sent audio data to main process`);
            } catch (error) {
              console.error("Error processing audio data:", error);
            }
          } else {
            console.warn("Received empty audio chunk");
          }
        };

        // Set up event handlers
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
          setError(`MediaRecorder error: ${event.error}`);
          setIsCapturing(false);
        };

        // Start the MediaRecorder with very short timeslices for better responsiveness
        // This will deliver audio data more frequently for real-time transcription
        console.log(
          "Starting MediaRecorder with 200ms timeslices for better responsiveness"
        );
        recorder.start(200);
        setMediaRecorder(recorder);

        console.log("Audio capture successfully started in renderer");
        setIsCapturing(true);
        operationInProgressRef.current = false;
        return true;
      } catch (err) {
        const errorMessage = `Error starting audio capture: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMessage, err);
        setError(errorMessage);

        // Try to notify main process of failure
        try {
          await window.api.audio.stopCapture();
        } catch (stopErr) {
          console.error("Failed to stop capture after error:", stopErr);
        }

        setIsCapturing(false);
        operationInProgressRef.current = false;
        return false;
      }
    },
    [audioContext, captureStatus, sendAudioData, isCapturing]
  );

  // Function to stop audio capture
  const stopCapture = useCallback(async () => {
    // Prevent multiple simultaneous operations
    if (operationInProgressRef.current || !isCapturing) {
      console.log("Operation already in progress or not capturing");
      return !isCapturing; // Return current state if already in progress
    }

    operationInProgressRef.current = true;

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

        // Stop all tracks
        console.log("Stopping all tracks in the stream");
        const tracks = mediaRecorder.stream.getTracks();
        tracks.forEach((track) => {
          console.log(`Stopping track: ${track.kind}`);
          track.stop();
        });
      } else {
        console.log("MediaRecorder already inactive or not available");
      }

      // Clean up references
      setMediaRecorder(null);
      if (audioContext) {
        console.log("Closing AudioContext");
        await audioContext.close();
        setAudioContext(null);
      }

      if (!result.success && !result.notCapturing) {
        throw new Error(result.error || "Failed to stop audio capture");
      }

      setIsCapturing(false);
      console.log("Audio capture successfully stopped in renderer");
      operationInProgressRef.current = false;
      return true;
    } catch (err) {
      setError(
        `Error stopping audio capture: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error("Error stopping audio capture:", err);

      // Force capturing state to false even on error
      setIsCapturing(false);
      operationInProgressRef.current = false;
      return false;
    }
  }, [mediaRecorder, audioContext, isCapturing]);

  // Function to update audio capture settings
  const updateSettings = useCallback(
    async (newSettings: Partial<CaptureStatus["settings"]>) => {
      try {
        const result = await window.api.audio.updateAudioSettings(newSettings);
        return result;
      } catch (err) {
        setError(
          `Error updating audio settings: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Error updating audio settings:", err);
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
