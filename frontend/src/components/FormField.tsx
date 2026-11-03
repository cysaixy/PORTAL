interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  multiline?: boolean;
  rows?: number;
}

export function FormField({ label, type = 'text', value, onChange, placeholder, required, error, multiline, rows = 3 }: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-semibold text-[#1B1F3B] mb-1">
        {label} {required && <span className="text-[#C8161D]">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-3 py-2 rounded-[8px] border border-[#E8E2DE] text-navy focus-visible:ring-2 focus-visible:ring-[#6B0A0F] focus-visible:border-transparent ${
            error ? 'border-[#C8161D]' : ''
          }`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 rounded-[8px] border border-[#E8E2DE] text-navy focus-visible:ring-2 focus-visible:ring-[#6B0A0F] focus-visible:border-transparent ${
            error ? 'border-[#C8161D]' : ''
          }`}
        />
      )}
      {error && <p className="text-[11px] text-[#C8161D] mt-1">{error}</p>}
    </div>
  );
}
