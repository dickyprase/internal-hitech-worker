'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { IconCalendar } from '@tabler/icons-react';
import { useState } from 'react';
import { id } from 'date-fns/locale';
import type { Locale } from 'date-fns';

interface DatePickerFieldProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  disabled,
  id
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant='outline'
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <IconCalendar className='mr-2 h-4 w-4' />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          locale={id as any}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
