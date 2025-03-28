// import React from 'react'
// import { Button } from './ui/button'
// import { Mic, MicOff, Send, X, Settings, Expand, Minimize, Edit, Image, Trash2 } from 'lucide-react'

// // Типы для активной панели и режима интерфейса
// type UIMode = 'compact' | 'full'
// type ActivePanel = 'transcription' | 'queue' | 'response' | 'settings' | null

// // Интерфейс пропсов компонента
// interface MainPanelProps {
//   isCapturing: boolean
//   isGenerating: boolean
//   uiMode: UIMode
//   setUIMode: (mode: UIMode) => void
//   activePanel: ActivePanel
//   setActivePanel: (panel: ActivePanel) => void
//   queueSize: number
//   onToggleCapture: () => void
//   onSendToLLM: () => void
// }

// export const MainPanel: React.FC<MainPanelProps> = ({
//   isCapturing,
//   isGenerating,
//   uiMode,
//   setUIMode,
//   activePanel,
//   setActivePanel,
//   queueSize,
//   onToggleCapture,
//   onSendToLLM
// }) => {
//   // Переключение между панелями
//   const handlePanelChange = (panel: ActivePanel) => {
//     if (activePanel === panel) {
//       // Если уже выбрана эта панель, закрываем ее
//       setActivePanel(null)
//     } else {
//       // Иначе переключаемся на выбранную панель
//       setActivePanel(panel)
//     }
//   }

//   return (
//     <div className="p-2 bg-background/90 border-b flex justify-between items-center">
//       <div className="flex items-center gap-2">
//         {/* Кнопка записи аудио */}
//         <Button
//           size="icon"
//           variant={isCapturing ? "destructive" : "default"}
//           onClick={onToggleCapture}
//           title={isCapturing ? "Остановить запись" : "Начать запись"}
//         >
//           {isCapturing ? <MicOff size={16} /> : <Mic size={16} />}
//         </Button>

//         {/* Панель навигации (только в полном режиме) */}
//         {uiMode === 'full' && (
//           <div className="flex items-center gap-1">
//             <Button
//               size="sm"
//               variant={activePanel === 'transcription' ? "default" : "ghost"}
//               onClick={() => handlePanelChange('transcription')}
//               title="Транскрипция"
//               className="h-8 px-2"
//             >
//               <Edit size={14} className="mr-1" />
//               Текст
//             </Button>

//             <Button
//               size="sm"
//               variant={activePanel === 'queue' ? "default" : "ghost"}
//               onClick={() => handlePanelChange('queue')}
//               title="Очередь запросов"
//               className="h-8 px-2"
//             >
//               <Image size={14} className="mr-1" />
//               Очередь {queueSize > 0 && `(${queueSize})`}
//             </Button>

//             <Button
//               size="sm"
//               variant={activePanel === 'response' ? "default" : "ghost"}
//               onClick={() => handlePanelChange('response')}
//               title="Ответ"
//               className="h-8 px-2"
//             >
//               <Send size={14} className="mr-1" />
//               Ответ
//             </Button>

//             <Button
//               size="sm"
//               variant={activePanel === 'settings' ? "default" : "ghost"}
//               onClick={() => handlePanelChange('settings')}
//               title="Настройки"
//               className="h-8 px-2"
//             >
//               <Settings size={14} className="mr-1" />
//               Настройки
//             </Button>
//           </div>
//         )}
//       </div>

//       <div className="flex items-center gap-2">
//         {/* Кнопка отправки запроса */}
//         {uiMode === 'full' && (
//           <Button
//             size="sm"
//             variant="default"
//             onClick={onSendToLLM}
//             disabled={queueSize === 0 || isGenerating}
//             title="Отправить запрос"
//             className="h-8"
//           >
//             <Send size={14} className="mr-1" />
//             {isGenerating ? 'Генерация...' : 'Отправить'}
//           </Button>
//         )}

//         {/* Кнопка переключения режима отображения */}
//         <Button
//           size="icon"
//           variant="outline"
//           onClick={() => setUIMode(uiMode === 'full' ? 'compact' : 'full')}
//           title={uiMode === 'full' ? "Компактный режим" : "Полный режим"}
//           className="h-8 w-8"
//         >
//           {uiMode === 'full' ? <Minimize size={14} /> : <Expand size={14} />}
//         </Button>
//       </div>
//     </div>
//   )
// }

import React from "react";
import { Button } from "./ui/button";
import {
  Mic,
  MicOff,
  Send,
  X,
  Settings,
  Expand,
  Minimize,
  Edit,
  Image,
  Trash2,
} from "lucide-react";

// Типы для активной панели и режима интерфейса
type UIMode = "compact" | "full";
type ActivePanel = "transcription" | "queue" | "response" | "settings" | null;

// Интерфейс пропсов компонента
interface MainPanelProps {
  isCapturing: boolean;
  isGenerating: boolean;
  uiMode: UIMode;
  setUIMode: (mode: UIMode) => void;
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  queueSize: number;
  onToggleCapture: () => void;
  onSendToLLM: () => void;
  isTranscribing?: boolean; // Added new prop to show transcription state
}

export const MainPanel: React.FC<MainPanelProps> = ({
  isCapturing,
  isGenerating,
  uiMode,
  setUIMode,
  activePanel,
  setActivePanel,
  queueSize,
  onToggleCapture,
  onSendToLLM,
  isTranscribing = false, // Default to false if not provided
}) => {
  // Переключение между панелями
  const handlePanelChange = (panel: ActivePanel) => {
    if (activePanel === panel) {
      // Если уже выбрана эта панель, закрываем ее
      setActivePanel(null);
    } else {
      // Иначе переключаемся на выбранную панель
      setActivePanel(panel);
    }
  };

  return (
    <div className="p-2 bg-background/90 border-b flex justify-between items-center">
      <div className="flex items-center gap-2">
        {/* Кнопка записи аудио */}
        <Button
          size="icon"
          variant={
            isCapturing
              ? isTranscribing
                ? "destructive"
                : "default"
              : "default"
          }
          onClick={onToggleCapture}
          title={
            isCapturing
              ? isTranscribing
                ? "Остановить запись и добавить в очередь"
                : "Остановить запись"
              : "Начать запись"
          }>
          {isCapturing ? <MicOff size={16} /> : <Mic size={16} />}
        </Button>

        {/* Панель навигации (только в полном режиме) */}
        {uiMode === "full" && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={activePanel === "transcription" ? "default" : "ghost"}
              onClick={() => handlePanelChange("transcription")}
              title="Транскрипция"
              className="h-8 px-2">
              <Edit size={14} className="mr-1" />
              Текст{" "}
              {isTranscribing && (
                <span className="ml-1 text-xs animate-pulse">●</span>
              )}
            </Button>

            <Button
              size="sm"
              variant={activePanel === "queue" ? "default" : "ghost"}
              onClick={() => handlePanelChange("queue")}
              title="Очередь запросов"
              className="h-8 px-2">
              <Image size={14} className="mr-1" />
              Очередь {queueSize > 0 && `(${queueSize})`}
            </Button>

            <Button
              size="sm"
              variant={activePanel === "response" ? "default" : "ghost"}
              onClick={() => handlePanelChange("response")}
              title="Ответ"
              className="h-8 px-2">
              <Send size={14} className="mr-1" />
              Ответ
            </Button>

            <Button
              size="sm"
              variant={activePanel === "settings" ? "default" : "ghost"}
              onClick={() => handlePanelChange("settings")}
              title="Настройки"
              className="h-8 px-2">
              <Settings size={14} className="mr-1" />
              Настройки
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Кнопка отправки запроса */}
        {uiMode === "full" && (
          <Button
            size="sm"
            variant="default"
            onClick={onSendToLLM}
            disabled={queueSize === 0 || isGenerating}
            title="Отправить запрос"
            className="h-8">
            <Send size={14} className="mr-1" />
            {isGenerating ? "Генерация..." : "Отправить"}
          </Button>
        )}

        {/* Кнопка переключения режима отображения */}
        <Button
          size="icon"
          variant="outline"
          onClick={() => setUIMode(uiMode === "full" ? "compact" : "full")}
          title={uiMode === "full" ? "Компактный режим" : "Полный режим"}
          className="h-8 w-8">
          {uiMode === "full" ? <Minimize size={14} /> : <Expand size={14} />}
        </Button>
      </div>
    </div>
  );
};
