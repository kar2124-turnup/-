import React, { useState, useEffect } from 'react';

// Fix: Implement the useLocalState hook to manage state persistence in localStorage.
// This file was previously empty, causing a module resolution error.
// Fix: The return type uses React.Dispatch and React.SetStateAction, so the React namespace must be imported.
export function useLocalState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, (error as Error).message);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, (error as Error).message);
      }
    }
  }, [key, value]);

  return [value, setValue];
}