import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface LicenseExpirationPickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  minDate?: Date;
  className?: string;
  placeholder?: string;
}

const MONTHS = [
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

export function LicenseExpirationPicker({
  value,
  onChange,
  disabled = false,
  minDate = new Date(),
  className,
  placeholder = 'Select expiration date',
}: LicenseExpirationPickerProps) {
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(
    value ? value.getMonth().toString() : undefined
  );
  const [selectedYear, setSelectedYear] = useState<string | undefined>(
    value ? value.getFullYear().toString() : undefined
  );

  // Generate year options (current year to +15 years for medical licenses)
  const years = Array.from({ length: 16 }, (_, i) => {
    const year = currentYear + i;
    return { value: year.toString(), label: year.toString() };
  });

  // Update parent when month or year changes
  useEffect(() => {
    if (selectedMonth !== undefined && selectedYear !== undefined) {
      const month = parseInt(selectedMonth);
      const year = parseInt(selectedYear);
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const newDate = new Date(year, month, lastDayOfMonth);
      onChange(newDate);
    } else {
      onChange(undefined);
    }
  }, [selectedMonth, selectedYear, onChange]);

  // Sync internal state with external value changes
  useEffect(() => {
    if (value) {
      setSelectedMonth(value.getMonth().toString());
      setSelectedYear(value.getFullYear().toString());
    }
  }, [value]);

  const handlePresetClick = (yearsToAdd: number) => {
    const today = new Date();
    const futureDate = new Date(today.getFullYear() + yearsToAdd, today.getMonth(), today.getDate());
    const month = futureDate.getMonth().toString();
    const year = futureDate.getFullYear().toString();

    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleClear = () => {
    setSelectedMonth(undefined);
    setSelectedYear(undefined);
    onChange(undefined);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Split Month/Year Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Month
          </label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-12 text-base"
              aria-label="Select month"
            >
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem
                  key={month.value}
                  value={month.value}
                  className="text-base py-3"
                >
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Year
          </label>
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-12 text-base"
              aria-label="Select year"
            >
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem
                  key={year.value}
                  value={year.value}
                  className="text-base py-3"
                >
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground block">
          Quick select (common license durations)
        </label>
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(1)}
            disabled={disabled}
            className="h-10 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Set expiration to 1 year from now"
          >
            +1Y
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(3)}
            disabled={disabled}
            className="h-10 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Set expiration to 3 years from now"
          >
            +3Y
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(5)}
            disabled={disabled}
            className="h-10 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Set expiration to 5 years from now"
          >
            +5Y
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePresetClick(10)}
            disabled={disabled}
            className="h-10 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Set expiration to 10 years from now"
          >
            +10Y
          </Button>
        </div>
      </div>

      {/* Selected Date Display */}
      {selectedMonth !== undefined && selectedYear !== undefined && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-md border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {MONTHS[parseInt(selectedMonth)].label} {selectedYear}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="h-7 text-xs hover:bg-background"
            aria-label="Clear selected date"
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
