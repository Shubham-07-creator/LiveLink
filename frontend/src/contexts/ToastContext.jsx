import React, { createContext, useContext, useState, useCallback } from "react";
import Toast from "../components/ui/Toast";

const ToastContext = createContext({
  showToast: () => {},
  hideToast: () => {}
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info",
    autoHideDuration: 4000
  });

  const showToast = useCallback((message, severity = "info", autoHideDuration = 4000) => {
    setToast({
      open: true,
      message,
      severity,
      autoHideDuration
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        autoHideDuration={toast.autoHideDuration}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
}

export default ToastContext;
