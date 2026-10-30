'use client';

interface ScaleInputProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  disabled?: boolean;
}

export default function ScaleInput({ label, value, onChange, lowLabel, highLabel, disabled }: ScaleInputProps) {
  return (
    <div role="group" aria-label={label}>
      <p className="font-serif text-2xl font-bold leading-tight text-gray-900 mb-3">{label}</p>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            disabled={disabled}
            aria-pressed={value === n}
            className={`h-12 rounded-xl font-bold text-xl border-2 transition-colors disabled:opacity-50 ${
              value === n
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-blue-50'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
