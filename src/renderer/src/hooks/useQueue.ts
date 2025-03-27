import { useState, useEffect, useCallback } from 'react'

// Типы элементов очереди
export type QueueItemType = 'text' | 'image'

// Интерфейс элемента очереди
export interface QueueItem {
  id: string
  type: QueueItemType
  content: string // Для текста - сам текст, для изображения - путь к файлу
  timestamp: number
  isQuestion: boolean
}

export function useQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Получаем текущую очередь при монтировании компонента
  useEffect(() => {
    const getQueue = async () => {
      try {
        const currentQueue = await window.api.queue.getQueue()
        setQueue(currentQueue || [])
      } catch (err) {
        setError(`Ошибка при получении очереди: ${err instanceof Error ? err.message : String(err)}`)
        console.error('Ошибка при получении очереди:', err)
      }
    }

    getQueue()

    // Слушаем события обновления очереди от основного процесса
    const removeQueueUpdatedListener = window.api.queue.onQueueUpdated((updatedQueue) => {
      setQueue(updatedQueue)
    })

    return () => {
      // Отписываемся от событий при размонтировании
      removeQueueUpdatedListener()
    }
  }, [])

  // Добавление последней транскрипции в очередь
  const addLastTranscriptionToQueue = useCallback(async () => {
    try {
      const result = await window.api.queue.addLastTranscriptionToQueue()
      
      if (!result.success) {
        throw new Error(result.error || 'Не удалось добавить последнюю транскрипцию в очередь')
      }
      
      return result.item
    } catch (err) {
      setError(`Ошибка при добавлении транскрипции в очередь: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Ошибка при добавлении транскрипции в очередь:', err)
      return null
    }
  }, [])

  // Добавление скриншота в очередь
  const addScreenshotToQueue = useCallback(async () => {
    try {
      const result = await window.api.queue.addScreenshotToQueue()
      
      if (!result.success) {
        throw new Error(result.error || 'Не удалось добавить скриншот в очередь')
      }
      
      return result.item
    } catch (err) {
      setError(`Ошибка при добавлении скриншота в очередь: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Ошибка при добавлении скриншота в очередь:', err)
      return null
    }
  }, [])

  // Добавление содержимого буфера обмена в очередь
  const addClipboardToQueue = useCallback(async () => {
    try {
      const result = await window.api.queue.addClipboardToQueue()
      
      if (!result.success) {
        throw new Error(result.error || 'Не удалось добавить содержимое буфера обмена в очередь')
      }
      
      return result.item
    } catch (err) {
      setError(`Ошибка при добавлении содержимого буфера обмена в очередь: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Ошибка при добавлении содержимого буфера обмена в очередь:', err)
      return null
    }
  }, [])

  // Удаление элемента из очереди
  const removeFromQueue = useCallback(async (itemId: string) => {
    try {
      const result = await window.api.queue.removeFromQueue(itemId)
      
      if (!result.success) {
        throw new Error('Не удалось удалить элемент из очереди')
      }
      
      return true
    } catch (err) {
      setError(`Ошибка при удалении элемента из очереди: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Ошибка при удалении элемента из очереди:', err)
      return false
    }
  }, [])

  // Очистка всей очереди
  const clearQueue = useCallback(async () => {
    try {
      const result = await window.api.queue.clearQueue()
      
      if (!result.success) {
        throw new Error('Не удалось очистить очередь')
      }
      
      return true
    } catch (err) {
      setError(`Ошибка при очистке очереди: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Ошибка при очистке очереди:', err)
      return false
    }
  }, [])

  return {
    queue,
    error,
    addLastTranscriptionToQueue,
    addScreenshotToQueue,
    addClipboardToQueue,
    removeFromQueue,
    clearQueue
  }
}