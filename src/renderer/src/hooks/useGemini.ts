import { useState, useEffect, useCallback, useRef } from 'react'

// Конфигурация API Gemini
interface GeminiConfig {
  apiKey: string
  apiUrl: string
  model: string
  maxTokens: number
  temperature: number
  topP: number
  topK: number
}

export function useGemini() {
  const [config, setConfig] = useState<GeminiConfig | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedResponse, setGeneratedResponse] = useState<string>('')
  const [streamingChunks, setStreamingChunks] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Ref для хранения полного ответа во время стриминга
  const responseRef = useRef<string>('')
  
  // Загружаем конфигурацию при монтировании компонента
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const loadedConfig = await window.api.gemini.loadConfig()
        setConfig(loadedConfig)
      } catch (err) {
        setError(`Ошибка при загрузке конфигурации Gemini: ${err instanceof Error ? err.message : String(err)}`)
        console.error('Ошибка при загрузке конфигурации Gemini:', err)
      }
    }

    loadConfig()

    // Получение текущего статуса генерации
    const getGenerationStatus = async () => {
      try {
        const status = await window.api.gemini.getGenerationStatus()
        setIsGenerating(status.isGenerating || false)
      } catch (err) {
        console.error('Ошибка при получении статуса генерации:', err)
      }
    }

    getGenerationStatus()

    // Слушаем события от основного процесса
    const removeGenerationChunkListener = window.api.gemini.onGenerationChunk(({ chunk }) => {
      setStreamingChunks(prev => [...prev, chunk])
      responseRef.current += chunk
    })

    const removeGenerationStatusListener = window.api.gemini.onGenerationStatus((status) => {
      if (status.status === 'completed') {
        setIsGenerating(false)
        if (status.result) {
          setGeneratedResponse(status.result)
        } else {
          setGeneratedResponse(responseRef.current)
        }
      } else if (status.status === 'started') {
        setIsGenerating(true)
        setStreamingChunks([])
        responseRef.current = ''
      } else if (status.status === 'error') {
        setIsGenerating(false)
        setError(status.error || 'Произошла ошибка при генерации ответа')
      } else if (status.status === 'stopped') {
        setIsGenerating(false)
      }
    })

    return () => {
      // Отписываемся от событий при размонтировании
      removeGenerationChunkListener()
      removeGenerationStatusListener()
    }
  }, [])

  // Обновление конфигурации Gemini
  const updateConfig = useCallback(async (newConfig: Partial<GeminiConfig>) => {
    try {
      const result = await window.api.gemini.saveConfig(newConfig)
      
      if (result.success) {
        setConfig(result.config)
        return true
      } else {
        throw new Error(result.error || 'Не удалось обновить конфигурацию Gemini')
      }
    } catch (err) {
      setError(`Ошибка при обновлении конфигурации Gemini: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Ошибка при обновлении конфигурации Gemini:', err)
      return false
    }
  }, [])

  // Генерация ответа
  const generateResponse = useCallback(async ({ 
    texts, 
    images, 
    streaming = true 
  }: { 
    texts: string[], 
    images: string[], 
    streaming?: boolean 
  }) => {
    try {
      if (isGenerating) {
        throw new Error('Генерация уже выполняется')
      }
      
      setIsGenerating(true)
      setError(null)
      setStreamingChunks([])
      responseRef.current = ''
      
      const result = await window.api.gemini.generateResponse({ texts, images, streaming })
      
      if (!result.success) {
        throw new Error(result.error || 'Не удалось сгенерировать ответ')
      }
      
      // Если не используется стриминг, сразу устанавливаем результат
      if (!streaming && result.result) {
        setGeneratedResponse(result.result)
      }
      
      return result.result
    } catch (err) {
      setIsGenerating(false)
      const errorMessage = `Ошибка при генерации ответа: ${err instanceof Error ? err.message : String(err)}`
      setError(errorMessage)
      console.error('Ошибка при генерации ответа:', err)
      return null
    }
  }, [isGenerating])

  // Остановка генерации
  const stopGeneration = useCallback(async () => {
    try {
      if (!isGenerating) {
        return true
      }
      
      const result = await window.api.gemini.stopGeneration()
      
      if (!result.success) {
        throw new Error(result.error || 'Не удалось остановить генерацию')
      }
      
      return true
    } catch (err) {
      setError(`Ошибка при остановке генерации: ${err instanceof Error ? err.message : String(err)}`)
      console.error('Ошибка при остановке генерации:', err)
      return false
    }
  }, [isGenerating])

  return {
    config,
    isGenerating,
    generatedResponse,
    streamingChunks,
    error,
    updateConfig,
    generateResponse,
    stopGeneration
  }
}