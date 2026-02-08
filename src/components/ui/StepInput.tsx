interface StepInputProps {
  step: number;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

export default function StepInput({
  step,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: StepInputProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Step number + Label */}
      <div className="flex items-center gap-3">
        <div className="w-[38px] h-[38px] rounded-full bg-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
          <span className="font-body font-bold text-white text-base">
            {step}
          </span>
        </div>
        <span className="font-body font-semibold text-[22px] text-black">
          {label}
        </span>
      </div>

      {/* Input */}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-[11px] border border-[var(--color-input-border)] bg-white px-4 font-body font-semibold text-[15px] text-[#505050]/40 placeholder:text-[#505050]/40 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
      />
    </div>
  );
}
