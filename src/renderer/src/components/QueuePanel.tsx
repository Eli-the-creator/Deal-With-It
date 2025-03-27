import React from 'react'
import { Button } from './ui/button'
import { Trash2, Send, X, FileText, Image as ImageIcon, HelpCircle } from 'lucide-react'
import { QueueItem } from '../hooks/useQueue'

// Интерфейс пропсов компонента
interface QueuePanelProps {
  queue: QueueItem[]
  onRemoveItem: (id: string) => Promise<boolean>
  onClearQueue: () => Promise<boolean>
  onSendToLLM: () => void
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  queue,
  onRemoveItem,
  onClearQueue,
  onSendToLLM
}) => {
  // Отображение миниатюры для элемента очереди
  const renderItemThumbnail = (item: QueueItem) => {
    if (item.type === 'text') {
      return (
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-muted">
          <FileText size={16} />
        </div>
      )
    } else if (item.type === 'image') {
      return (
        <div className="flex-shrink-0 w-8 h-8 overflow-hidden rounded-md border">
          <img 
            src={`file://${item.content}`} 
            alt="Screenshot" 
            className="w-full h-full object-cover"
          />
        </div>
      )
    }
    
    return null
  }
  
  // Отображение содержимого элемента очереди
  const renderItemContent = (item: QueueItem) => {
    if (item.type === 'text') {
      return (
        <div className="flex-1 overflow-hidden">
          <p className="text-sm truncate">
            {item.content}
          </p>
          {item.isQuestion && (
            <div className="flex items-center mt-1">
              <HelpCircle size={12} className="text-blue-500 mr-1" />
              <span className="text-xs text-blue-500">Вопрос</span>
            </div>
          )}
        </div>
      )
    } else if (item.type === 'image') {
      return (
        <div className="flex-1">
          <p className="text-sm">Скриншот</p>
          <p className="text-xs text-muted-foreground truncate">
            {item.content.split('/').pop()}
          </p>
        </div>
      )
    }
    
    return null
  }
  
  // Если очередь пуста, отображаем сообщение-подсказку
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <div className="mb-4">
          <FileText className="w-10 h-10" />
        </div>
        <p className="text-center">
          Очередь запросов пуста. Добавьте текст или скриншот.
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full p-4 overflow-hidden">
      {/* Заголовок панели */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium">Очередь запросов</h3>
        <span className="text-xs text-muted-foreground">
          {queue.length} {queue.length === 1 ? 'элемент' : 
            queue.length > 1 && queue.length < 5 ? 'элемента' : 'элементов'}
        </span>
      </div>
      
      {/* Список элементов очереди */}
      <div className="flex-1 overflow-y-auto">
        {queue.map((item) => (
          <div 
            key={item.id}
            className="flex items-center p-2 rounded-md border mb-2 hover:bg-muted/50 transition-colors"
          >
            {renderItemThumbnail(item)}
            
            <div className="flex-1 mx-2 overflow-hidden">
              {renderItemContent(item)}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveItem(item.id)}
              className="h-7 w-7"
            >
              <X size={14} />
            </Button>
          </div>
        ))}
      </div>
      
      {/* Кнопки действий */}
      <div className="flex justify-between mt-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onClearQueue}
        >
          <Trash2 size={14} className="mr-1" />
          Очистить
        </Button>
        
        <Button 
          variant="default" 
          size="sm" 
          onClick={onSendToLLM}
        >
          <Send size={14} className="mr-1" />
          Отправить
        </Button>
      </div>
    </div>
  )
}