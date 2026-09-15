// ============================================================================
// Reusable validated inputs, used everywhere the relevant field appears.
//
// MaskedInput fixes React's controlled-input "bailout" bug: when a sanitizer
// returns the SAME value the state already holds (e.g. typing "a" into an empty
// phone field -> ""), React skips the re-render and never resets the DOM, so the
// invalid character stays visible. Writing the sanitized value straight back to
// the DOM element in the handler guarantees the field can never show bad input.
//
// NumberInput uses a native number input (browsers reject alphabetic keys) and
// additionally blocks exponent/sign keys, so numeric fields can't take strings.
// ============================================================================
import { type InputHTMLAttributes } from 'react';
import { toNumber } from '../logic/validation';

type MaskedProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  sanitize: (v: string) => string;
  onValue: (v: string) => void;
};

export function MaskedInput({ value, sanitize, onValue, ...rest }: MaskedProps) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => {
        const v = sanitize(e.target.value);
        e.currentTarget.value = v; // force DOM to the sanitized value (beats the bailout)
        onValue(v);
      }}
    />
  );
}

type NumberProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max'> & {
  value: number;
  onValue: (n: number) => void;
  allowDecimal?: boolean;
  min?: number;
  max?: number;
};

export function NumberInput({ value, onValue, allowDecimal = true, min, max, ...rest }: NumberProps) {
  const clamp = (n: number) => {
    let x = n;
    if (min !== undefined && x < min) x = min;
    if (max !== undefined && x > max) x = max;
    return x;
  };
  return (
    <input
      {...rest}
      type="number"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      step={allowDecimal ? 'any' : 1}
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : ''}
      onKeyDown={(e) => {
        // Block exponent/plus (and minus when negatives aren't allowed).
        if (e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault();
        if (e.key === '-' && (min === undefined || min >= 0)) e.preventDefault();
        if (!allowDecimal && e.key === '.') e.preventDefault();
      }}
      onChange={(e) => onValue(clamp(toNumber(e.target.value, min ?? 0)))}
    />
  );
}
