"use client";

import { useState, useEffect } from "react";

function useLocalStorage<T>(key: string, initialValue: T) {
  // Obter o valor inicial do localStorage ou usar o valor padrão
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      const parsedItem = item ? JSON.parse(item) : initialValue;

      // If the stored item is an array of polls, ensure each poll has a creator
      if (Array.isArray(parsedItem) && key === "polls") {
        return parsedItem.map((poll) => {
          if (!poll.creator) {
            return {
              ...poll,
              creator: {
                name: "Usuário Anônimo",
                avatarUrl: "https://www.gravatar.com/avatar/?d=mp",
              },
            };
          }
          // Ensure createdAt and creatorId exist for older polls
          if (!poll.createdAt) {
            poll.createdAt = Date.now();
          }
          if (!poll.creatorId) {
            poll.creatorId = "anonymous";
          }
          return poll;
        });
      }
      return parsedItem;
    } catch (error) {
      console.error("Error reading from localStorage", error);
      return initialValue;
    }
  });

  // Função wrapper para setStoredValue que também atualiza o localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error("Error writing to localStorage", error);
    }
  };

  return [storedValue, setValue] as const;
}

export default useLocalStorage;








