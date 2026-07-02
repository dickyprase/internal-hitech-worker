'use client';

import { Input } from '@/components/ui/input';
import { formatRupiah, parseCurrency } from '@/lib/format';
import { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  disabled,
  id
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? formatRupiah(value).replace('Rp', '').trim() : ''
  );

  useEffect(() => {
    if (value === 0 && displayValue !== '') {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = parseCurrency(raw);
    setDisplayValue(numeric > 0 ? formatRupiah(numeric).replace('Rp', '').trim() : '');
    onChange(numeric);
  };

  return (
    <div className='relative'>
      <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm'>
        Rp
      </span>
      <Input
        id={id}
        type='text'
        inputMode='numeric'
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className='pl-9'
      />
    </div>
  );
}
