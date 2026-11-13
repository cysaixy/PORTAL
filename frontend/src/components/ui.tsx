import {
  ButtonHTMLAttributes,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { Icon, IconName } from './Icon';

// ============================================================================
// Buttons
// ============================================================================

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-800 text-white hover:bg-brand-900 shadow-sm',
  gold: 'bg-gold-400 text-ink hover:bg-gold-500 shadow-sm',
  secondary: 'bg-white text-ink border border-line hover:bg-canvas hover:border-line-strong shadow-card',
  ghost: 'text-ink-soft hover:bg-ink/5',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 shadow-sm',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, loading, className, children, disabled, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors whitespace-nowrap',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 14 : 16} /> : icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
});

export function IconButton({
  icon,
  label,
  className,
  tone = 'default',
  ...rest
}: { icon: IconName; label: string; tone?: 'default' | 'danger' } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        tone === 'danger' ? 'text-muted hover:bg-danger-50 hover:text-danger-600' : 'text-muted hover:bg-ink/5 hover:text-ink',
        className
      )}
      {...rest}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

// ============================================================================
// Surfaces
// ============================================================================

export function Card({ className, children, padded = true }: { className?: string; children: ReactNode; padded?: boolean }) {
  return (
    <div className={clsx('bg-white border border-line rounded-2xl shadow-card', padded && 'p-5 sm:p-6', className)}>{children}</div>
  );
}

export function CardHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Page-level toolbar: filters on the left, primary action on the right. */
export function Toolbar({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2 min-w-0">{children}</div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ============================================================================
// Status
// ============================================================================

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'brand' | 'gold';
const tones: Record<Tone, string> = {
  neutral: 'bg-ink/5 text-ink-soft',
  success: 'bg-success-50 text-success-700 ring-1 ring-inset ring-success-600/15',
  warn: 'bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-600/15',
  danger: 'bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-600/15',
  info: 'bg-info-50 text-info-700 ring-1 ring-inset ring-info-600/15',
  brand: 'bg-brand-50 text-brand-800 ring-1 ring-inset ring-brand-800/10',
  gold: 'bg-gold-100 text-gold-900 ring-1 ring-inset ring-gold-700/15',
};

export function Badge({ tone = 'neutral', children, icon, className }: { tone?: Tone; children: ReactNode; icon?: IconName; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', tones[tone], className)}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

const sheetTone: Record<string, Tone> = {
  Locked: 'success',
  Complete: 'info',
  'In progress': 'warn',
  'Not started': 'neutral',
};
export function SheetStatus({ status }: { status: string }) {
  return (
    <Badge tone={sheetTone[status] ?? 'neutral'} icon={status === 'Locked' ? 'lock' : undefined}>
      {status}
    </Badge>
  );
}

export function Progress({ value, max, tone = 'brand', className }: { value: number; max: number; tone?: 'brand' | 'success' | 'gold'; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const bar = { brand: 'bg-brand-800', success: 'bg-success-600', gold: 'bg-gold-400' }[tone];
  return (
    <div className={clsx('h-1.5 w-full rounded-full bg-ink/5 overflow-hidden', className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={clsx('h-full rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  children,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  tone?: 'default' | 'brand' | 'gold';
  children?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-5 shadow-card',
        tone === 'brand' && 'bg-brand-800 border-brand-800 text-white',
        tone === 'gold' && 'bg-gold-100 border-gold-200',
        tone === 'default' && 'bg-white border-line'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={clsx('text-xs font-semibold', tone === 'brand' ? 'text-brand-200' : 'text-muted')}>{label}</p>
        {icon && (
          <span
            className={clsx(
              'inline-flex h-8 w-8 items-center justify-center rounded-lg',
              tone === 'brand' ? 'bg-white/10 text-gold-400' : tone === 'gold' ? 'bg-white/60 text-gold-700' : 'bg-brand-50 text-brand-800'
            )}
          >
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <p className={clsx('mt-1 text-[28px] leading-tight font-extrabold tracking-tight tabular-nums', tone === 'brand' && 'text-gold-400')}>{value}</p>
      {hint && <p className={clsx('mt-1 text-xs', tone === 'brand' ? 'text-brand-200' : 'text-muted')}>{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return src ? (
    <img src={src} alt="" className={clsx('rounded-full object-cover bg-canvas', className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={clsx('inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-800 font-bold shrink-0', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || '?'}
    </span>
  );
}

// ============================================================================
// Feedback
// ============================================================================

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg className={clsx('animate-spin', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-ink/[0.06]', className)} />;
}

export function PageLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon = 'info',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas text-muted mb-3">
        <Icon name={icon} size={22} />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="text-xs text-muted mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="alert"
      title="Something went wrong"
      description={apiErrorMessage(error)}
      action={onRetry && <Button icon="refresh" onClick={onRetry}>Try again</Button>}
    />
  );
}

export function Alert({ tone = 'info', title, children, action }: { tone?: 'info' | 'warn' | 'danger' | 'success'; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const icon: IconName = tone === 'success' ? 'checkCircle' : tone === 'info' ? 'info' : 'alert';
  return (
    <div className={clsx('flex gap-3 rounded-xl px-4 py-3 text-sm', tones[tone])} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon} size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

// ============================================================================
// Forms
// ============================================================================

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink mb-1.5">
        {label}
        {required && <span className="text-brand-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger-600">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref
) {
  return <input ref={ref} className={clsx('input', invalid && 'input-error', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...rest },
  ref
) {
  return (
    <div className="relative">
      <select ref={ref} className={clsx('input appearance-none pr-9', invalid && 'input-error', className)} aria-invalid={invalid || undefined} {...rest}>
        {children}
      </select>
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea(
  { className, invalid, rows = 4, ...rest },
  ref
) {
  return <textarea ref={ref} rows={rows} className={clsx('input h-auto py-2', invalid && 'input-error', className)} {...rest} />;
});

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-success-600' : 'bg-ink/20'
      )}
    >
      <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={clsx('relative w-full sm:w-64', className)}>
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input pl-9"
      />
    </div>
  );
}

/** Pill-style single choice (tabs / filters). */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-lg bg-ink/5 p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-md font-semibold transition-colors whitespace-nowrap',
            size === 'sm' ? 'px-2.5 h-7 text-xs' : 'px-3 h-8 text-xs sm:text-sm',
            value === o.value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={clsx('rounded-full px-1.5 text-[10px] tabular-nums', value === o.value ? 'bg-brand-50 text-brand-800' : 'bg-ink/5')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Tables
// ============================================================================

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto -mx-5 sm:-mx-6', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-line text-xs text-muted">
      <span>
        {total.toLocaleString()} result{total === 1 ? '' : 's'}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <IconButton icon="chevronLeft" label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} />
          <span className="px-2 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <IconButton icon="chevronRight" label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Overlays
// ============================================================================

function useLockScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscape(open: boolean, onClose: () => void) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && ref.current();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const titleId = useId();
  useLockScroll(open);
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={clsx(
          'relative w-full bg-white sm:rounded-2xl rounded-t-2xl shadow-pop animate-slide-up flex flex-col max-h-[92vh]',
          { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size]
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-3">
          <div>
            <h3 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h3>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} className="-mr-2 -mt-1" />
        </div>
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto">{children}</div>
        {footer && <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 sm:px-6 py-4 border-t border-line bg-canvas/50 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function Drawer({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useLockScroll(open);
  useEscape(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white shadow-pop animate-slide-in flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-ink truncate">{title}</h3>
            {description && <div className="text-xs text-muted mt-0.5">{description}</div>}
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-line">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-ink-soft">{message}</div>
    </Modal>
  );
}

/** Small helper to manage confirm dialogs for a target item. */
export function useConfirm<T>() {
  const [target, setTarget] = useState<T | null>(null);
  return { target, ask: (t: T) => setTarget(t), close: () => setTarget(null), open: target !== null };
}

// ============================================================================
// Errors
// ============================================================================

export function apiErrorMessage(error: unknown): string {
  const e = error as any;
  const data = e?.response?.data;
  if (data?.details?.length) {
    return data.details.map((d: { message: string }) => d.message).join(' · ');
  }
  if (data?.error) return data.error;
  if (e?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the API running?';
  return e?.message ?? 'Unexpected error';
}

/** Map zod field errors from the API into { field: message }. */
export function fieldErrors(error: unknown): Record<string, string> {
  const details = (error as any)?.response?.data?.details as { field: string; message: string }[] | undefined;
  return Object.fromEntries((details ?? []).map((d) => [d.field, d.message]));
}
