type SliderFieldProps = {
  label: string;
  unit: string;
  labelDetail?: string;
  formatValue?: (value: number) => string;
  value: number;
  min: number;
  max: number;
  inputMax?: number;
  step?: number;
  hint?: string;
  onChange: (value: number) => void;
};

export function SliderField({
  label,
  unit,
  labelDetail = unit,
  formatValue,
  value,
  min,
  max,
  inputMax = max,
  step = 1,
  hint,
  onChange,
}: SliderFieldProps) {
  const decimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
  const displayValue = formatValue ?? ((currentValue: number) => currentValue.toFixed(decimals));
  const updateValue = (rawValue: string) => {
    const parsedValue = Number.parseFloat(rawValue);
    if (Number.isFinite(parsedValue)) onChange(parsedValue);
  };

  return (
    <div className="field range-field">
      <div className="field-label">
        {label} <span>{labelDetail}</span>
      </div>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(event) => updateValue(event.target.value)}
        />
        <span className="slider-val">
          {displayValue(value)} {unit}
        </span>
      </div>
      <div className="input-wrap" style={{ marginTop: 6 }}>
        <input
          type="number"
          min={min}
          max={inputMax}
          step={step}
          value={value}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          onChange={(event) => updateValue(event.target.value)}
        />
        <span className="unit">{unit}</span>
      </div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
