'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProvinceReference } from '@/features/provinces/api';

interface ProvinceAutocompleteProps {
  value: string;
  references: ProvinceReference[];
  onChange: (value: string) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  placeholder?: string;
}

function normalizeLookupValue(value: string): string {
  return value
    .trim()
    .replace(/^(thành phố|thanh pho|tp\.?|tỉnh|tinh)\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function resolveCanonicalName(value: string, references: ProvinceReference[]): string {
  const normalized = normalizeLookupValue(value);
  if (!normalized) return '';

  const match = references.find(
    (reference) =>
      normalizeLookupValue(reference.name) === normalized ||
      normalizeLookupValue(reference.normalizedName) === normalized ||
      reference.aliases.some((alias) => normalizeLookupValue(alias) === normalized)
  );

  return match?.name ?? value.trim();
}

export function ProvinceAutocomplete({
  value,
  references,
  onChange,
  disabled = false,
  title,
  className,
  placeholder = 'Tìm tỉnh/thành...'
}: ProvinceAutocompleteProps) {
  const listId = `province-reference-${useId().replace(/:/g, '')}`;
  const options = references.flatMap((reference) => [
    { value: reference.name, label: reference.region },
    ...reference.aliases.map((alias) => ({
      value: alias,
      label: `${reference.name} • ${reference.region}`
    }))
  ]);

  return (
    <>
      <Input
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(resolveCanonicalName(event.target.value, references))}
        disabled={disabled}
        title={title}
        placeholder={placeholder}
        className={cn('h-8 text-[10px]', className)}
        autoComplete='off'
      />
      <datalist id={listId}>
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value} label={option.label} />
        ))}
      </datalist>
    </>
  );
}
