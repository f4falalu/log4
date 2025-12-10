/**
 * SearchInput Component
 * Debounced search input with clear functionality
 * Provides consistent search UX across the application
 */

import { Search, X } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Sync external value changes to local state
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set new timeout for debounced onChange
      const newTimeoutId = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);

      setTimeoutId(newTimeoutId);
    },
    [onChange, debounceMs, timeoutId]
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }, [onChange, timeoutId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
