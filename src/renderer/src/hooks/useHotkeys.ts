import { useState, useEffect, useCallback } from "react";

// Интерфейс для колбэков горячих клавиш
interface HotkeyCallbacks {
  onAddLastText?: () => void;
  onAddScreenshot?: () => void;
  onSendQueue?: () => void;
  onClearQueue?: () => void;
  onToggleCollapse?: () => void;
  onToggleCapture?: () => void;
}

export function useHotkeys(callbacks: HotkeyCallbacks) {
  const [hotkeys, setHotkeys] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Загружаем список горячих клавиш при монтировании компонента
  useEffect(() => {
    const loadHotkeys = async () => {
      try {
        const hotkeysMap = await window.api.hotkeys.getHotkeys();
        setHotkeys(hotkeysMap);
      } catch (err) {
        setError(
          `Ошибка при загрузке горячих клавиш: ${err instanceof Error ? err.message : String(err)}`
        );
        console.error("Ошибка при загрузке горячих клавиш:", err);
      }
    };

    loadHotkeys();

    // Слушаем события горячих клавиш от основного процесса
    // const removeHotkeyTriggeredListener = window.api.hotkeys.onHotkeyTriggered((action) => {
    //   switch (action) {
    //     case 'add-last-text':
    //       callbacks.onAddLastText?.()
    //       break
    //     case 'add-screenshot':
    //       callbacks.onAddScreenshot?.()
    //       break
    //     case 'send-queue':
    //       callbacks.onSendQueue?.()
    //       break
    //     case 'clear-queue':
    //       callbacks.onClearQueue?.()
    //       break
    //     case 'toggle-collapse':
    //       callbacks.onToggleCollapse?.()
    //       break
    //     default:
    //       console.warn(`Неизвестное действие горячей клавиши: ${action}`)
    //   }
    // })

    const removeHotkeyTriggeredListener = window.api.hotkeys.onHotkeyTriggered(
      (action) => {
        switch (action) {
          case "add-last-text":
            callbacks.onAddLastText?.();
            break;
          case "add-screenshot":
            callbacks.onAddScreenshot?.();
            break;
          case "send-queue":
            callbacks.onSendQueue?.();
            break;
          case "clear-queue":
            callbacks.onClearQueue?.();
            break;
          case "toggle-collapse":
            callbacks.onToggleCollapse?.();
            break;
          case "toggle-capture":
            callbacks.onToggleCapture?.();
            break;
          default:
            console.warn(`Неизвестное действие горячей клавиши: ${action}`);
        }
      }
    );

    return () => {
      // Отписываемся от событий при размонтировании
      removeHotkeyTriggeredListener();
    };
  }, [
    // callbacks.onAddLastText,
    // callbacks.onAddScreenshot,
    // callbacks.onSendQueue,
    // callbacks.onClearQueue,
    // callbacks.onToggleCollapse,

    callbacks.onAddLastText,
    callbacks.onAddScreenshot,
    callbacks.onSendQueue,
    callbacks.onClearQueue,
    callbacks.onToggleCollapse,
    callbacks.onToggleCapture,
  ]);

  // Получаем описание горячей клавиши по ключу
  const getHotkeyDescription = useCallback(
    (key: string): string => {
      return hotkeys[key] || "Не назначено";
    },
    [hotkeys]
  );

  return {
    hotkeys,
    getHotkeyDescription,
    error,
  };
}
