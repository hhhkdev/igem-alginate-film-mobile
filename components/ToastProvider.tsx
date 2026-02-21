import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast } from "./Toast";

interface ToastContextType {
  showToast: (message: string, type?: "info" | "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    message: string;
    type: "info" | "success" | "error";
  }>({
    visible: false,
    message: "",
    type: "info",
  });

  const hideToast = useCallback(() => {
    setToastConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback(
    (message: string, type: "info" | "success" | "error" = "info") => {
      setToastConfig({ visible: true, message, type });

      // Auto hide after 3 seconds
      setTimeout(() => {
        hideToast();
      }, 3000);
    },
    [hideToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        visible={toastConfig.visible}
        message={toastConfig.message}
        type={toastConfig.type}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
