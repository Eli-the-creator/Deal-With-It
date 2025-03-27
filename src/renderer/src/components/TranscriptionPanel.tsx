import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Plus, Copy, Mic, MicOff } from 'lucide-react'

// Интерфейс для результатов транскрипции
interface TranscriptionResult {
  text: string
  timestamp: number
  language: string
}

// Интерфейс пропсов компонента
interface TranscriptionPanelProps {
  lastTranscription: TranscriptionResult | null
  isCapturing: boolean
  onAddToQueue: () => Promise<any>
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  lastTranscription,
  isCapturing,
  onAddToQueue
}) => {
  // Состояние для отслеживания анимации транскрипции
  const [isNewTranscription, setIsNewTranscription] = useState(false)
  
  // Обработка новой транскрипции
  useEffect(() => {
    if (lastTranscription) {
      setIsNewTranscription(true)
      
      // Сбрасываем состояние анимации через 1 секунду
      const timeout = setTimeout(() => {
        setIsNewTranscription(false)
      }, 1000)
      
      return () => clearTimeout(timeout)
    }
  }, [lastTranscription])
  
  // Форматирование временной метки
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }
  
  // Копирование текста в буфер обмена
  const handleCopyText = () => {
    if (lastTranscription) {
      navigator.clipboard.writeText(lastTranscription.text)
    }
  }
  
  // Если нет транскрипции, отображаем сообщение-подсказку
  if (!lastTranscription) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <div className="mb-4">
          {isCapturing ? (
            <Mic className="w-10 h-10 animate-pulse" />
          ) : (
            <MicOff className="w-10 h-10" />
          )}
        </div>
        <p className="text-center">
          {isCapturing 
            ? "Идет запись... Говорите что-нибудь для распознавания."
            : "Нажмите кнопку записи для начала распознавания речи."}
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      {/* Заголовок панели */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Последняя транскрипция</h3>
        <span className="text-xs text-muted-foreground">
          {formatTimestamp(lastTranscription.timestamp)}
        </span>
      </div>
      
      {/* Текст транскрипции */}
      <div 
        className={`flex-1 p-3 rounded-md border bg-card overflow-y-auto transition-colors duration-300 ${
          isNewTranscription ? 'border-primary' : 'border-border'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">
          {lastTranscription.text}
        </p>
      </div>
      
      {/* Кнопки действий */}
      <div className="flex justify-between mt-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopyText}
        >
          <Copy size={14} className="mr-1" />
          Копировать
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          onClick={onAddToQueue}
        >
          <Plus size={14} className="mr-1" />
          Добавить в очередь
        </Button>
      </div>
      
      {/* Индикатор языка */}
      <div className="flex justify-end mt-2">
        <span className="text-xs text-muted-foreground">
          Язык: {lastTranscription.language.toUpperCase()}
        </span>
      </div>
    </div>
  )
}