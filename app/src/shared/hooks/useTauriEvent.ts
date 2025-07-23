import { useEffect, useRef } from 'react';
import { listen, Event, UnlistenFn } from '@tauri-apps/api/event';

type EventCallback<T = any> = (event: Event<T>) => void;

export function useTauriEvent<T = any>(
  eventName: string,
  handler: EventCallback<T>,
  deps: React.DependencyList = []
): void {
  const savedHandler = useRef<EventCallback<T>>();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    let unlisten: UnlistenFn | null = null;

    const setupListener = async () => {
      unlisten = await listen<T>(eventName, (event) => {
        if (savedHandler.current) {
          savedHandler.current(event);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, ...deps]);
}

export function useTauriEvents<T = any>(
  events: Array<{ name: string; handler: EventCallback<T> }>,
  deps: React.DependencyList = []
): void {
  const savedHandlers = useRef<Map<string, EventCallback<T>>>(new Map());

  useEffect(() => {
    events.forEach(({ name, handler }) => {
      savedHandlers.current.set(name, handler);
    });
  }, [events]);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setupListeners = async () => {
      for (const { name } of events) {
        const unlisten = await listen<T>(name, (event) => {
          const handler = savedHandlers.current.get(name);
          if (handler) {
            handler(event);
          }
        });
        unlisteners.push(unlisten);
      }
    };

    setupListeners();

    return () => {
      unlisteners.forEach(unlisten => unlisten());
    };
  }, [events.map(e => e.name).join(','), ...deps]);
}