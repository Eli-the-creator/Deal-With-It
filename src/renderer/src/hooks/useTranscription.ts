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

  // Function to transcribe current audio buffer with DeepGram
  const transcribeBuffer = useCallback(
    async (language: "ru" | "en" | "pl" = "en") => {
      // Don't start a new transcription if one is already in progress
      if (pendingTranscriptionRef.current) {
        console.log("Transcription already in progress, skipping new request");
        return null;
      }

      try {
        console.log(
          `Transcribing buffer with DeepGram API (language: ${language})`
        );
        pendingTranscriptionRef.current = true;
        setTranscriptionStatus({ status: "processing" });

        const result = await window.api.whisper.transcribeBuffer({ language });

        if (result) {
          console.log(`DeepGram transcription successful: "${result.text}"`);

          // Only update state if text is actually different to avoid unnecessary renders
          if (result.text !== lastTranscriptionTextRef.current) {
            lastTranscriptionTextRef.current = result.text;
            setLastTranscription(result);
          }

          setTranscriptionStatus({ status: "ready" });
          pendingTranscriptionRef.current = false;
          return result;
        } else {
          console.log("No transcription result returned from DeepGram");
          setTranscriptionStatus({ status: "ready" });
          pendingTranscriptionRef.current = false;
          return null;
        }
      } catch (err) {
        const errorMessage = `Error transcribing buffer with DeepGram: ${err instanceof Error ? err.message : String(err)}`;
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
    (intervalMs = 2000, language: "ru" | "en" | "pl" = "en") => {
      console.log(
        `Starting continuous transcription with DeepGram: ${intervalMs}ms interval in ${language} language`
      );

      // If a transcription interval is already running, stop it
      if (transcriptionIntervalRef.current) {
        clearInterval(transcriptionIntervalRef.current);
        transcriptionIntervalRef.current = null;
      }

      // Set active flag
      continuousTranscriptionActiveRef.current = true;

      // For DeepGram, we might not need to poll as frequently since we'll
      // transcribe the entire recording when stopped

      // Start interval for periodic status checks (not actual transcriptions)
      const interval = setInterval(() => {
        if (!continuousTranscriptionActiveRef.current) {
          // If no longer active, clear the interval
          clearInterval(interval);
          return;
        }

        console.log(
          "Audio capture active, collecting audio for DeepGram transcription"
        );
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

  // Function to stop continuous transcription and process results with DeepGram
  const stopContinuousTranscription = useCallback(() => {
    console.log("Stopping capture and processing transcription with DeepGram");
    continuousTranscriptionActiveRef.current = false;

    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
      transcriptionIntervalRef.current = null;
    }

    // With DeepGram, we'll transcribe the entire audio buffer once after stopping
    if (!pendingTranscriptionRef.current) {
      console.log("Processing final transcription with DeepGram");
      // Let the main process handle the API call
      // We don't explicitly call transcribeBuffer here as that will happen in App.tsx
    }
  }, []);

  // Set up event listeners and initial state
  useEffect(() => {
    console.log("Setting up DeepGram transcription listeners");

    const getLastTranscription = async () => {
      try {
        const result = await window.api.whisper.getLastTranscription();
        if (result) {
          console.log("Retrieved last transcription from DeepGram:", result);
          setLastTranscription(result);
          lastTranscriptionTextRef.current = result.text;
        }
      } catch (err) {
        setError(
          `Error getting last transcription from DeepGram: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Error getting last transcription:", err);
      }
    };

    getLastTranscription();

    // Set up event listeners
    const removeTranscriptionResultListener =
      window.api.whisper.onTranscriptionResult((result) => {
        console.log("Received DeepGram transcription result:", result);
        if (result && result.text !== lastTranscriptionTextRef.current) {
          setLastTranscription(result);
          lastTranscriptionTextRef.current = result.text;
        }
        pendingTranscriptionRef.current = false;
      });

    const removeWhisperStatusListener = window.api.whisper.onWhisperStatus(
      (status) => {
        console.log("DeepGram transcription service status changed:", status);
        setTranscriptionStatus(status);
      }
    );

    // Set up audio data listener
    const removeProcessAudioDataListener =
      window.api.whisper.onProcessAudioData((audioData) => {
        if (isListeningForTranscription) {
          console.log(
            `Received audio data for DeepGram processing: ${audioData.length} bytes`
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
