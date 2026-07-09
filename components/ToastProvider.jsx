"use client";
import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext({ toast: () => {} });

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ type = "info", title, message, duration = 4000 }) => {
    const id = ++_toastId;
    setToasts((t) => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const STYLES = {
    success: { bar: "bg-green-500",  icon: "ri-checkbox-circle-fill text-green-500", bg: "bg-white dark:bg-bgdark border-green-200 dark:border-green-800" },
    error:   { bar: "bg-red-500",    icon: "ri-close-circle-fill text-red-500",       bg: "bg-white dark:bg-bgdark border-red-200 dark:border-red-800" },
    warning: { bar: "bg-amber-500",  icon: "ri-alert-fill text-amber-500",            bg: "bg-white dark:bg-bgdark border-amber-200 dark:border-amber-800" },
    info:    { bar: "bg-sky-500",    icon: "ri-information-fill text-sky-500",        bg: "bg-white dark:bg-bgdark border-sky-200 dark:border-sky-800" },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: "360px" }}>
        {toasts.map((t) => {
          const s = STYLES[t.type] || STYLES.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border shadow-lg px-4 py-3 animate-fade-in ${s.bg}`}
              style={{ animation: "slideInRight 0.2s ease-out" }}
            >
              <i className={`${s.icon} text-xl flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-semibold text-gray-800 dark:text-white">{t.title}</p>}
                {t.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.message}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 flex-shrink-0"
              >
                <i className="ri-close-line text-sm" />
              </button>
              {/* Progress bar */}
              <div className={`absolute bottom-0 left-0 h-0.5 rounded-full ${s.bar}`} style={{ width: "100%", animation: "shrink 4s linear forwards" }} />
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
