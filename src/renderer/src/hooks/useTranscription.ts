import { useState, useEffect, useCallback } from 'react'

interface TranscriptionResult {
  text: string
  timestamp: number
  language: string
}

interface TranscriptionStatus {
  status: 'ready' | 'error' | 'processing'
  message?: string
}

export function useTranscription() {
  const [lastTranscription, setLastTranscription] = useState<TranscriptionResult | null>(null)
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>({
    status: 'ready'
  })
  const [error, setError] = useState<string | null>(null)
  const [transcriptionInterval, setTranscriptionIntervalState] = useState<NodeJS.Timeout | null>(null)

  // Получаем последнюю транскрипцию при монтировании компонента
  useEffect(() => {
    const getLastTranscription = async () => {
      try {
        const result = await window.api.whisper.getLastTranscription()
        if (result) {
          setLastTranscription(result)
        }
      } catch (err) {
        setError(`Ошибка при получении последней транскрипции: ${err instanceof Error ? err.message : String(err)}`)
        console.error('Ошибка при получении последней транскрипции:', err)
      }
    }

    getLastTranscription()

    // Слушаем события от основного процесса
    const removeTranscriptionResultListener = window.api.whisper.onTranscriptionResult((result) => {
      setLastTranscription(result)
    })

    const removeWhisperStatusListener = window.api.whisper.onWhisperStatus((status) => {
      setTranscriptionStatus(status)
    })

    return () => {
      // Отписываемся от событий при размонтировании
      removeTranscriptionResultListener()
      removeWhisperStatusListener()
      
      // Очищаем интервал транскрипции при размонтировании
      if (transcriptionInterval) {
        clearInterval(transcriptionInterval)
      }
    }
  }, [transcriptionInterval])

  // Запуск постоянной транскрипции с интервалом
  const startContinuousTranscription = useCallback((
    intervalMs = 3000, 
    language: 'ru' | 'en' | 'pl' = 'ru'
  ) => {
    // Если интервал уже запущен, останавливаем его
    if (transcriptionInterval) {
      clearInterval(transcriptionInterval)
    }
    
    // Сразу делаем первую транскрипцию
    transcribeBuffer(language)
    
    // Запускаем интервал
    const interval = setInterval(() => {
      transcribeBuffer(language)
    }, intervalMs)
    
    setTranscriptionIntervalState(interval)
    
    return () => {
      clearInterval(interval)
      setTranscriptionIntervalState(null)
    }
  }, [])

  // Остановка постоянной транскрипции
  const stopContinuousTranscription = useCallback(() => {
    if (transcriptionInterval) {
      clearInterval(transcriptionInterval)
      setTranscriptionIntervalState(null)
    }
  }, [transcriptionInterval])

  // Функция для транскрибирования текущего буфера аудио
  const transcribeBuffer = useCallback(async (language: 'ru' | 'en' | 'pl' = 'ru') => {
    try {
      setTranscriptionStatus({ status: 'processing' })
      
      const result = await window.api.whisper.transcribeBuffer({ language })
      
      if (result) {
        setLastTranscription(result)
      }
      
      setTranscriptionStatus({ status: 'ready' })
      return result
    } catch (err) {
      const errorMessage = `Ошибка при транскрибировании буфера: ${err instanceof Error ? err.message : String(err)}`
      setError(errorMessage)
      setTranscriptionStatus({ 
        status: 'error',
        message: errorMessage
      })
      console.error('Ошибка при транскрибировании буфера:', err)
      return null
    }
  }, [])

  return {
    lastTranscription,
    transcriptionStatus,
    error,
    transcribeBuffer,
    startContinuousTranscription,
    stopContinuousTranscription
  }
}