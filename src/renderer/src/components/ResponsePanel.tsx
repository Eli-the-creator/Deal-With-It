import React, { useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Copy, StopCircle, Send, Sparkles } from 'lucide-react'

// Интерфейс пропсов компонента
interface ResponsePanelProps {
  response: string
  streamingChunks: string[]
  isGenerating: boolean
  onStopGeneration: () => Promise<boolean>
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
  streamingChunks,
  isGenerating,
  onStopGeneration
}) => {
  // Ref для контейнера с ответом
  const responseContainerRef = useRef<HTMLDivElement>(null)
  
  // Автоматическая прокрутка вниз при получении новых чанков
  useEffect(() => {
    if (responseContainerRef.current && isGenerating) {
      responseContainerRef.current.scrollTop = responseContainerRef.current.scrollHeight
    }
  }, [streamingChunks, isGenerating])
  
  // Копирование ответа в буфер обмена
  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response)
    }
  }
  
  // Если нет ответа и не идет генерация, отображаем сообщение-подсказку
  if (!response && !isGenerating && streamingChunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <div className="mb-4">
          <Sparkles className="w-10 h-10" />
        </div>
        <p className="text-center">
          Здесь будет отображаться ответ от модели.
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      {/* Заголовок панели */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Ответ</h3>
        {isGenerating && (
          <div className="flex items-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
            <span className="text-xs text-muted-foreground">Генерация...</span>
          </div>
        )}
      </div>
      
      {/* Контейнер с ответом */}
      <div 
        ref={responseContainerRef}
        className="flex-1 p-3 rounded-md border bg-card overflow-y-auto"
      >
        {/* Для отображения используем либо полный ответ, либо потоковые чанки */}
        <p className="whitespace-pre-wrap break-words">
          {isGenerating 
            ? streamingChunks.join('') 
            : response}
        </p>
        
        {/* Анимированный курсор при генерации */}
        {isGenerating && (
          <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1"></span>
        )}
      </div>
      
      {/* Кнопки действий */}
      <div className="flex justify-between mt-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCopyResponse}
          disabled={!response && streamingChunks.length === 0}
        >
          <Copy size={14} className="mr-1" />
          Копировать
        </Button>
        
        {isGenerating ? (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onStopGeneration}
          >
            <StopCircle size={14} className="mr-1" />
            Остановить
          </Button>
        ) : (
          <Button 
            variant="default" 
            size="sm" 
            disabled
          >
            <Send size={14} className="mr-1" />
            Отправить новый запрос
          </Button>
        )}
      </div>
    </div>
  )
}