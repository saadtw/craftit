"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let toastCount = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = ++toastCount;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => addToast(msg, "success", dur),
    error: (msg, dur) => addToast(msg, "error", dur),
    info: (msg, dur) => addToast(msg, "info", dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 min-w-[300px] max-w-sm rounded-xl px-4 py-3 shadow-lg transform transition-all duration-300 animate-in slide-in-from-right-8 fade-in ${
              t.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : t.type === "error"
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-white/[0.05] border border-white/10 text-white"
            } backdrop-blur-md`}
          >
            <div className="flex items-center gap-3">
              {t.type === "success" && (
                <span className="material-symbols-outlined text-lg">check_circle</span>
              )}
              {t.type === "error" && (
                <span className="material-symbols-outlined text-lg">error</span>
              )}
              {t.type === "info" && (
                <span className="material-symbols-outlined text-lg">info</span>
              )}
              <p className="text-sm font-semibold whitespace-pre-wrap">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => console.log("SUCCESS:", msg),
      error: (msg) => console.error("ERROR:", msg),
      info: (msg) => console.log("INFO:", msg),
    };
  }
  return context;
}
