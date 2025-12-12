// Fix: Removed the <reference types="vite/client" /> directive.
// It was causing a "Cannot find type definition file" error and is not necessary in this file.
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Firebase is initialized within the services/firebase.ts module,
// which is imported by other parts of the application.

// --- Global Error Handlers ---
// This is the definitive, two-part fix for the persistent "circular structure" error.
// It provides a complete safety net for both asynchronous and synchronous unhandled errors.

// 1. Asynchronous Error Handler (Promises)
window.addEventListener('unhandledrejection', event => {
  // Prevent the default browser action (which is to log the complex error and crash)
  event.preventDefault();
  
  const reason = event.reason;
  
  if (reason && typeof reason.message === 'string') {
    console.error("Caught Unhandled Promise Rejection:", {
      message: reason.message,
      code: (reason as any).code || 'N/A',
      stack: reason.stack || 'No stack available.',
    });
  } else {
    console.error("Caught Unhandled Promise Rejection with a non-Error object.");
    try {
      console.dir(reason);
    } catch (e) {
      console.error("Could not inspect the rejection reason.");
    }
  }
});

// 2. Synchronous Error Handler
window.onerror = function (message, source, lineno, colno, error) {
  // Log a safe, structured error message.
  console.error("Caught Global Unhandled Error:", {
    message: message,
    source: source,
    line: lineno,
    column: colno,
    // Safely access the error message if the error object exists
    errorMessage: error ? (error as Error).message : "N/A",
  });
  
  // Return true to prevent the browser's default error handling (the crash).
  return true;
};


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);