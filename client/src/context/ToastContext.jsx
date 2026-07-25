import React, { createContext, useContext, useState } from "react";
import { Check, AlertTriangle, X, Clock } from "lucide-react";

const ToastContext = createContext(null);

const TONE_COLORS = { success: "#2C8C82", warning: "#E0A458", error: "#D1453D", info: "#1B2733" };
const TONE_ICONS = { success: Check, warning: AlertTriangle, error: X, info: Clock };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  function notify(message, tone = "info") {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }
  function dismiss(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div style={{ position: "fixed", top: 18, right: 18, zIndex: 100, display: "flex", flexDirection: "column", gap: 8, maxWidth: 300 }}>
        {toasts.map((t) => {
          const Icon = TONE_ICONS[t.tone] || TONE_ICONS.info;
          const color = TONE_COLORS[t.tone] || TONE_COLORS.info;
          return (
            <div key={t.id} onClick={() => dismiss(t.id)} style={{
              background: "#fff", borderRadius: 8, padding: "10px 12px", cursor: "pointer",
              display: "flex", alignItems: "flex-start", gap: 8,
              borderLeft: `4px solid ${color}`, boxShadow: "0 8px 20px rgba(27,39,51,0.16)",
              fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#1B2733",
            }}>
              <Icon size={15} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
