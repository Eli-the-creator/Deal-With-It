import React, { useEffect, useState } from "react";
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

// Состояния интерфейса
type UIMode = "compact" | "full";
type ActivePanel = "transcription" | "queue" | "response" | "settings" | null;

const App: React.FC = () => {
  // Состояние UI
  const [uiMode, setUIMode] = useState<UIMode>("full");
  const [activePanel, setActivePanel] = useState<ActivePanel>("transcription");
  const [isVisible, setIsVisible] = useState(true);

  // Инициализация хуков для работы с сервисами
  const { isCapturing, startCapture, stopCapture, captureStatus } =
    useAudioCapture();

  const { lastTranscription, transcriptionStatus } = useTranscription();

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

  // Регистрация обработчиков горячих клавиш
  useHotkeys({
    onAddLastText: () => {
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

  // Автоматический запуск захвата аудио при запуске приложения
  useEffect(() => {
    const initCapture = async () => {
      await startCapture();
    };

    initCapture();

    return () => {
      stopCapture();
    };
  }, []);

  // Проверка демонстрации экрана
  useEffect(() => {
    const checkScreenSharing = async () => {
      const isSharing = await window.api.isScreenSharing();
      setIsVisible(!isSharing);
    };

    // Проверка каждые 5 секунд
    const interval = setInterval(checkScreenSharing, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Если приложение должно быть скрыто, рендерим пустой div
  if (!isVisible) {
    return <div className="hidden" />;
  }

  return (
    <div
      className={`h-screen flex flex-col bg-background/80 backdrop-blur-sm rounded-lg overflow-hidden
                    transition-all duration-300 ease-in-out

                    w-full`}>
      {/* Основная панель управления */}
      <MainPanel
        isCapturing={isCapturing}
        isGenerating={isGenerating}
        uiMode={uiMode}
        setUIMode={setUIMode}
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        queueSize={queue.length}
        onToggleCapture={() => (isCapturing ? stopCapture() : startCapture())}
        onSendToLLM={handleSendToLLM}
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
            onClick={() => (isCapturing ? stopCapture() : startCapture())}>
            {isCapturing ? "Стоп" : "Старт"}
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
          <span>{isCapturing ? "Запись..." : "Запись остановлена"}</span>
          <span>Элементов в очереди: {queue.length}</span>
        </div>
      </div>
    </div>
  );
};

export default App;
