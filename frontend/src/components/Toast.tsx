import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Icon } from './Icon';
import { apiErrorMessage } from './ui';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (messageOrError: unknown) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-3), { id, tone, message }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  const api: ToastApi = {
    success: (m) => push('success', m),
    info: (m) => push('info', m),
    error: (e) => push('error', typeof e === 'string' ? e : apiErrorMessage(e)),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto flex flex-col gap-2 sm:w-96 no-print" aria-live="polite">
          {items.map((t) => (
            <div
              key={t.id}
              className={clsx(
                'flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-pop animate-slide-up border',
                t.tone === 'success' && 'bg-white border-success-600/20',
                t.tone === 'error' && 'bg-white border-danger-600/30',
                t.tone === 'info' && 'bg-ink text-white border-ink'
              )}
              role={t.tone === 'error' ? 'alert' : 'status'}
            >
              <Icon
                name={t.tone === 'success' ? 'checkCircle' : t.tone === 'error' ? 'alert' : 'info'}
                size={18}
                className={clsx('shrink-0 mt-0.5', t.tone === 'success' && 'text-success-600', t.tone === 'error' && 'text-danger-600')}
              />
              <p className="flex-1">{t.message}</p>
              <button
                aria-label="Dismiss"
                className="opacity-60 hover:opacity-100"
                onClick={() => setItems((xs) => xs.filter((x) => x.id !== t.id))}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
