"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { FiAlertTriangle, FiInfo, FiCheckCircle } from "react-icons/fi";

const DialogContext = createContext(null);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

export function DialogProvider({ children }) {
  const [dialogs, setDialogs] = useState([]);

  const openDialog = useCallback((type, config) => {
    return new Promise((resolve) => {
      const id = Date.now().toString() + Math.random().toString();
      const dialog = {
        id,
        type,
        ...config,
        resolve: (value) => {
          setDialogs((prev) => prev.filter((d) => d.id !== id));
          resolve(value);
        },
      };
      setDialogs((prev) => [...prev, dialog]);
    });
  }, []);

  const confirm = useCallback((title, message, options = {}) => {
    return openDialog("confirm", { title, message, ...options });
  }, [openDialog]);

  const prompt = useCallback((title, message, options = {}) => {
    return openDialog("prompt", { title, message, ...options });
  }, [openDialog]);

  const alert = useCallback((title, message, options = {}) => {
    return openDialog("alert", { title, message, ...options });
  }, [openDialog]);

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center sm:p-4">
        {dialogs.map((dialog) => (
          <DialogRenderer key={dialog.id} dialog={dialog} />
        ))}
      </div>
    </DialogContext.Provider>
  );
}

function DialogRenderer({ dialog }) {
  const [inputValue, setInputValue] = useState(dialog.defaultValue || "");
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (dialog.type === "prompt" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [dialog.type]);

  const handleClose = (value) => {
    setIsClosing(true);
    setTimeout(() => dialog.resolve(value), 200);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !dialog.disableBackdropClick) {
      handleClose(dialog.type === "prompt" ? null : false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleClose(dialog.type === "prompt" ? null : false);
    } else if (e.key === "Enter" && dialog.type === "prompt") {
      handleClose(inputValue);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`bg-[#0c0c11] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
        onKeyDown={handleKeyDown}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              dialog.type === "alert" ? "bg-red-500/10 text-red-500" :
              dialog.type === "confirm" ? "bg-amber-500/10 text-amber-500" :
              "bg-purple-500/10 text-purple-500"
            }`}>
              {dialog.type === "alert" ? <FiAlertTriangle className="w-5 h-5" /> :
               dialog.type === "confirm" ? <FiAlertTriangle className="w-5 h-5" /> :
               <FiInfo className="w-5 h-5" />}
            </div>
            <div className="flex-1 mt-1">
              <h3 className="text-lg font-black text-white tracking-tight leading-none mb-2">
                {dialog.title}
              </h3>
              {dialog.message && (
                <p className="text-slate-400 text-sm">{dialog.message}</p>
              )}
            </div>
          </div>

          {dialog.type === "prompt" && (
            <div className="mt-4">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={dialog.placeholder || "Enter value..."}
                className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-end gap-3">
          {dialog.type !== "alert" && (
            <button
              onClick={() => handleClose(dialog.type === "prompt" ? null : false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm font-bold uppercase tracking-wider transition-all"
            >
              {dialog.cancelText || "Cancel"}
            </button>
          )}
          <button
            onClick={() => handleClose(dialog.type === "prompt" ? inputValue : true)}
            className={`px-5 py-2 rounded-lg text-white text-sm font-bold uppercase tracking-wider shadow-lg transition-all ${
              dialog.type === "alert" ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" :
              dialog.type === "confirm" ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" :
              "bg-purple-500 hover:bg-purple-600 shadow-purple-500/20"
            }`}
          >
            {dialog.confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
