import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Save, Mic } from "lucide-react";

interface DeepGramConfigProps {
  className?: string;
}

const DeepGramConfig: React.FC<DeepGramConfigProps> = ({ className }) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Load saved API key from the main process
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const config = await window.api.deepgram.loadConfig();
        if (config && config.apiKey) {
          setApiKey(config.apiKey);
        }
      } catch (error) {
        console.error("Failed to load DeepGram API key:", error);
      }
    };

    loadApiKey();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMessage(null);

    try {
      // Save via IPC to main process
      const result = await window.api.deepgram.saveConfig({ apiKey });

      if (result && result.success) {
        // Show success message
        setSavedMessage("DeepGram API key saved successfully");
      } else {
        throw new Error(result?.error || "Failed to save API key");
      }

      // Clear message after 3 seconds
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (error) {
      console.error("Failed to save DeepGram API key:", error);
      setSavedMessage("Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="h-5 w-5" />
          DeepGram API Configuration
        </CardTitle>
        <CardDescription>
          Configure your DeepGram API for speech-to-text transcription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deepgram-api-key">API Key</Label>
          <Input
            id="deepgram-api-key"
            type="password"
            placeholder="Enter your DeepGram API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from the{" "}
            <a
              href="https://console.deepgram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline">
              DeepGram Console
            </a>
          </p>
        </div>

        {savedMessage && (
          <div
            className={`text-sm ${savedMessage.includes("Failed") ? "text-destructive" : "text-green-500"}`}>
            {savedMessage}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving || !apiKey.trim()}>
          <Save size={14} className="mr-1" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DeepGramConfig;
