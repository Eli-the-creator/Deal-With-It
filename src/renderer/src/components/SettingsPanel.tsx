import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Save, Settings as SettingsIcon } from "lucide-react";
import DeepGramConfig from "./DeepGramConfig";

export const SettingsPanel: React.FC = () => {
  // Состояние для настроек API
  const [apiKey, setApiKey] = useState<string>("");
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [temperature, setTemperature] = useState<number>(0.7);

  // Состояние для настроек аудио
  const [captureMicrophone, setCaptureMicrophone] = useState<boolean>(true);
  const [captureSystemAudio, setCaptureSystemAudio] = useState<boolean>(true);
  const [language, setLanguage] = useState<"ru" | "en" | "pl">("en");

  // Загрузка сохраненных настроек при монтировании компонента
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Загружаем настройки API Gemini
        const geminiConfig = await window.api.gemini.loadConfig();
        if (geminiConfig) {
          setApiKey(geminiConfig.apiKey || "");
          setMaxTokens(geminiConfig.maxTokens || 2048);
          setTemperature(geminiConfig.temperature || 0.7);
        }

        // Загружаем настройки аудио
        const audioStatus = await window.api.audio.getCaptureStatus();
        if (audioStatus && audioStatus.settings) {
          setCaptureMicrophone(audioStatus.settings.captureMicrophone);
          setCaptureSystemAudio(audioStatus.settings.captureSystemAudio);
        }
      } catch (error) {
        console.error("Ошибка при загрузке настроек:", error);
      }
    };

    loadSettings();
  }, []);

  // Сохранение настроек API
  const saveApiSettings = async () => {
    try {
      await window.api.gemini.saveConfig({
        apiKey,
        maxTokens,
        temperature,
      });
    } catch (error) {
      console.error("Ошибка при сохранении настроек API:", error);
    }
  };

  // Сохранение настроек аудио
  const saveAudioSettings = async () => {
    try {
      await window.api.audio.updateAudioSettings({
        captureMicrophone,
        captureSystemAudio,
      });
    } catch (error) {
      console.error("Ошибка при сохранении настроек аудио:", error);
    }
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="deepgram">DeepGram</TabsTrigger>
        </TabsList>

        {/* Настройки API */}
        <TabsContent value="api" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gemini API Settings</CardTitle>
              <CardDescription>
                Configure the API parameters for response generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter Gemini API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from Google AI Studio
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="max-tokens">
                    Maximum tokens: {maxTokens}
                  </Label>
                </div>
                <Slider
                  id="max-tokens"
                  min={256}
                  max={4096}
                  step={256}
                  value={[maxTokens]}
                  onValueChange={(values) => setMaxTokens(values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum length of generated response
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="temperature">
                    Temperature: {temperature.toFixed(1)}
                  </Label>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[temperature]}
                  onValueChange={(values) => setTemperature(values[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Affects response randomness: lower - more predictable, higher
                  - more creative
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveApiSettings}>
                <Save size={14} className="mr-1" />
                Save
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Настройки аудио */}
        <TabsContent value="audio" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audio Settings</CardTitle>
              <CardDescription>
                Configure audio capture and speech recognition settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="capture-microphone">
                    Microphone Recording
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable recording from device microphone
                  </p>
                </div>
                <Switch
                  id="capture-microphone"
                  checked={captureMicrophone}
                  onCheckedChange={setCaptureMicrophone}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="capture-system-audio">
                    System Audio Recording
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable system audio recording (requires additional
                    permissions)
                  </p>
                </div>
                <Switch
                  id="capture-system-audio"
                  checked={captureSystemAudio}
                  onCheckedChange={setCaptureSystemAudio}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Recognition Language</Label>
                <select
                  id="language"
                  className="w-full p-2 rounded-md border border-input bg-background"
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value as "ru" | "en" | "pl")
                  }>
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                  <option value="pl">Polish</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Select language for speech recognition
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveAudioSettings}>
                <Save size={14} className="mr-1" />
                Save
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* DeepGram Settings Tab */}
        <TabsContent value="deepgram" className="mt-4">
          <DeepGramConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};
