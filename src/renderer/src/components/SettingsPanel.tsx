import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Save, Settings as SettingsIcon } from 'lucide-react'

export const SettingsPanel: React.FC = () => {
  // Состояние для настроек API
  const [apiKey, setApiKey] = useState<string>('')
  const [maxTokens, setMaxTokens] = useState<number>(2048)
  const [temperature, setTemperature] = useState<number>(0.7)
  
  // Состояние для настроек аудио
  const [captureMicrophone, setCaptureMicrophone] = useState<boolean>(true)
  const [captureSystemAudio, setCaptureSystemAudio] = useState<boolean>(true)
  const [language, setLanguage] = useState<'ru' | 'en' | 'pl'>('ru')
  
  // Загрузка сохраненных настроек при монтировании компонента
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Загружаем настройки API Gemini
        const geminiConfig = await window.api.gemini.loadConfig()
        if (geminiConfig) {
          setApiKey(geminiConfig.apiKey || '')
          setMaxTokens(geminiConfig.maxTokens || 2048)
          setTemperature(geminiConfig.temperature || 0.7)
        }
        
        // Загружаем настройки аудио
        const audioStatus = await window.api.audio.getCaptureStatus()
        if (audioStatus && audioStatus.settings) {
          setCaptureMicrophone(audioStatus.settings.captureMicrophone)
          setCaptureSystemAudio(audioStatus.settings.captureSystemAudio)
        }
      } catch (error) {
        console.error('Ошибка при загрузке настроек:', error)
      }
    }
    
    loadSettings()
  }, [])
  
  // Сохранение настроек API
  const saveApiSettings = async () => {
    try {
      await window.api.gemini.saveConfig({
        apiKey,
        maxTokens,
        temperature
      })
    } catch (error) {
      console.error('Ошибка при сохранении настроек API:', error)
    }
  }
  
  // Сохранение настроек аудио
  const saveAudioSettings = async () => {
    try {
      await window.api.audio.updateAudioSettings({
        captureMicrophone,
        captureSystemAudio
      })
    } catch (error) {
      console.error('Ошибка при сохранении настроек аудио:', error)
    }
  }
  
  return (
    <div className="p-4 h-full overflow-y-auto">
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="audio">Аудио</TabsTrigger>
        </TabsList>
        
        {/* Настройки API */}
        <TabsContent value="api" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Настройки API Gemini</CardTitle>
              <CardDescription>
                Настройте параметры API для генерации ответов
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API ключ</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Введите API ключ Gemini"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Получите API ключ на сайте Google AI Studio
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="max-tokens">Максимальное количество токенов: {maxTokens}</Label>
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
                  Максимальная длина генерируемого ответа
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="temperature">Температура: {temperature.toFixed(1)}</Label>
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
                  Влияет на случайность ответов: ниже - более предсказуемые, выше - более креативные
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveApiSettings}>
                <Save size={14} className="mr-1" />
                Сохранить
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Настройки аудио */}
        <TabsContent value="audio" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Настройки аудио</CardTitle>
              <CardDescription>
                Настройте параметры захвата и распознавания аудио
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="capture-microphone">Запись с микрофона</Label>
                  <p className="text-xs text-muted-foreground">
                    Включить запись с микрофона устройства
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
                  <Label htmlFor="capture-system-audio">Запись системного звука</Label>
                  <p className="text-xs text-muted-foreground">
                    Включить запись системного звука (требуются дополнительные разрешения)
                  </p>
                </div>
                <Switch
                  id="capture-system-audio"
                  checked={captureSystemAudio}
                  onCheckedChange={setCaptureSystemAudio}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="language">Язык распознавания</Label>
                <select
                  id="language"
                  className="w-full p-2 rounded-md border border-input bg-background"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'ru' | 'en' | 'pl')}
                >
                  <option value="ru">Русский</option>
                  <option value="en">Английский</option>
                  <option value="pl">Польский</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Выберите язык для распознавания речи
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveAudioSettings}>
                <Save size={14} className="mr-1" />
                Сохранить
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}