import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { debugLog } from "../lib/utils";

interface DebugPanelProps {
  isVisible: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ isVisible }) => {
  const [hotkeys, setHotkeys] = useState<Record<string, string>>({});
  const [lastHotkeyTriggered, setLastHotkeyTriggered] =
    useState<string>("None");
  const [captureStatus, setCaptureStatus] = useState<{ isCapturing: boolean }>({
    isCapturing: false,
  });
  const [events, setEvents] = useState<{ time: string; event: string }[]>([]);

  // Load hotkeys when component mounts
  useEffect(() => {
    const loadHotkeys = async () => {
      try {
        const keys = await window.api.hotkeys.getHotkeys();
        setHotkeys(keys);
        debugLog("DebugPanel", "Loaded hotkeys", keys);
      } catch (error) {
        debugLog("DebugPanel", "Failed to load hotkeys", error);
      }
    };

    loadHotkeys();

    // Listen for hotkey events
    const hotkeyListener = window.api.hotkeys.onHotkeyTriggered((action) => {
      setLastHotkeyTriggered(action);
      addEvent(`Hotkey triggered: ${action}`);
      debugLog("DebugPanel", `Hotkey triggered: ${action}`);
    });

    // Get initial capture status
    const getCaptureStatus = async () => {
      try {
        const status = await window.api.audio.getCaptureStatus();
        setCaptureStatus(status);
        debugLog("DebugPanel", "Initial capture status", status);
      } catch (error) {
        debugLog("DebugPanel", "Failed to get capture status", error);
      }
    };

    getCaptureStatus();

    return () => {
      hotkeyListener();
    };
  }, []);

  // Helper to add events to the log
  const addEvent = (event: string) => {
    const time = new Date().toISOString().substr(11, 12);
    setEvents((prev) => [{ time, event }, ...prev].slice(0, 10));
  };

  // Test functions
  const testStartCapture = async () => {
    try {
      debugLog("DebugPanel", "Testing start capture");
      const result = await window.api.audio.startCapture();
      addEvent(`Start capture: ${result.success ? "Success" : "Failed"}`);
      const status = await window.api.audio.getCaptureStatus();
      setCaptureStatus(status);
    } catch (error) {
      debugLog("DebugPanel", "Error in test start capture", error);
      addEvent(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const testStopCapture = async () => {
    try {
      debugLog("DebugPanel", "Testing stop capture");
      const result = await window.api.audio.stopCapture();
      addEvent(`Stop capture: ${result.success ? "Success" : "Failed"}`);
      const status = await window.api.audio.getCaptureStatus();
      setCaptureStatus(status);
    } catch (error) {
      debugLog("DebugPanel", "Error in test stop capture", error);
      addEvent(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const testTranscription = async () => {
    try {
      debugLog("DebugPanel", "Testing transcription");
      addEvent("Requesting transcription...");
      const result = await window.api.whisper.transcribeBuffer({
        language: "ru",
      });
      addEvent(
        `Transcription: ${result ? result.text.substring(0, 20) + "..." : "No result"}`
      );
    } catch (error) {
      debugLog("DebugPanel", "Error in test transcription", error);
      addEvent(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // If the panel is not visible, don't render anything
  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 bg-background/80 backdrop-blur-sm shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex justify-between items-center">
          Debug Panel
          <Badge variant={captureStatus.isCapturing ? "default" : "outline"}>
            {captureStatus.isCapturing ? "Recording" : "Idle"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <p className="font-semibold">Registered Hotkeys:</p>
          <div className="grid grid-cols-2 gap-1 mt-1">
            {Object.entries(hotkeys).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span>{key}:</span>
                <span className="font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="font-semibold">Last hotkey triggered:</p>
          <Badge variant="outline" className="mt-1">
            {lastHotkeyTriggered}
          </Badge>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={captureStatus.isCapturing ? "default" : "outline"}
            onClick={testStartCapture}
            disabled={captureStatus.isCapturing}>
            Start Capture
          </Button>
          <Button
            size="sm"
            variant={captureStatus.isCapturing ? "destructive" : "outline"}
            onClick={testStopCapture}
            disabled={!captureStatus.isCapturing}>
            Stop Capture
          </Button>
          <Button size="sm" variant="outline" onClick={testTranscription}>
            Test Transcription
          </Button>
        </div>

        <Separator />

        <div>
          <p className="font-semibold">Event Log:</p>
          <div className="mt-1 max-h-32 overflow-y-auto bg-muted/50 rounded-md p-1">
            {events.length === 0 ? (
              <p className="italic text-muted-foreground">No events yet</p>
            ) : (
              events.map((event, i) => (
                <div key={i} className="flex">
                  <span className="font-mono text-muted-foreground">
                    {event.time}
                  </span>
                  <span className="ml-2">{event.event}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
