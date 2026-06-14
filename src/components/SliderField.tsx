type SliderFieldProps = {
  label: string;
  unit: string;
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
  value,
  min,
  max,
  inputMax = max,
  step = 1,
  hint,
  onChange,
}: SliderFieldProps) {
  const updateValue = (rawValue: string) => {
    const parsedValue = Number.parseFloat(rawValue);
    if (Number.isFinite(parsedValue)) onChange(parsedValue);
  };

  return (
    <div className="field range-field">
      <div className="field-label">
        {label} <span>{unit}</span>
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
          {value} {unit}
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
