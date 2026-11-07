import React, { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }

const ToastCtx = createContext<{ toast: (message: string, kind?: ToastKind) => void }>({ toast: () => {} });

export const useToast = () => useContext(ToastCtx);

const kindStyles: Record<ToastKind, string> = {
  success: 'border-success/40 text-content',
  error: 'border-danger/40 text-content',
  info: 'border-primary/40 text-content',
};
const kindIcon: Record<ToastKind, React.ReactNode> = {
  success: <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20 text-success">✓</span>,
  error: <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger/20 text-danger">!</span>,
  info: <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">i</span>,
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[110] flex w-80 flex-col gap-2">
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-card ${kindStyles[t.kind]}`}
            >
              <span aria-hidden="true">{kindIcon[t.kind]}</span>
              <p className="text-sm text-content">{t.message}</p>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastCtx.Provider>
  );
};
