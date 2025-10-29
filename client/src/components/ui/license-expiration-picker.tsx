import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface LicenseExpirationPickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  minDate?: Date;
  className?: string;
  placeholder?: string;
}

export function LicenseExpirationPicker({
  value,
  onChange,
  disabled = false,
  minDate = new Date(),
  className,
  placeholder = 'Select expiration date',
}: LicenseExpirationPickerProps) {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    value ? value.getMonth().toString() : ''
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    value ? value.getFullYear().toString() : ''
  );

  // Get translated month names
  const MONTHS = [
    { value: '0', label: t('doctors.signup.step2.license_months.january') },
    { value: '1', label: t('doctors.signup.step2.license_months.february') },
    { value: '2', label: t('doctors.signup.step2.license_months.march') },
    { value: '3', label: t('doctors.signup.step2.license_months.april') },
    { value: '4', label: t('doctors.signup.step2.license_months.may') },
    { value: '5', label: t('doctors.signup.step2.license_months.june') },
    { value: '6', label: t('doctors.signup.step2.license_months.july') },
    { value: '7', label: t('doctors.signup.step2.license_months.august') },
    { value: '8', label: t('doctors.signup.step2.license_months.september') },
    { value: '9', label: t('doctors.signup.step2.license_months.october') },
    { value: '10', label: t('doctors.signup.step2.license_months.november') },
    { value: '11', label: t('doctors.signup.step2.license_months.december') },
  ];

  // Generate year options (current year to +15 years for medical licenses)
  const years = Array.from({ length: 16 }, (_, i) => {
    const year = currentYear + i;
    return { value: year.toString(), label: year.toString() };
  });

  // Update parent when month or year changes
  useEffect(() => {
    if (selectedMonth && selectedYear) {
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

  const handlePresetClick = (yearsToAdd: number, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const today = new Date();
    const futureDate = new Date(today.getFullYear() + yearsToAdd, today.getMonth(), today.getDate());
    const month = futureDate.getMonth().toString();
    const year = futureDate.getFullYear().toString();

    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setSelectedMonth('');
    setSelectedYear('');
    onChange(undefined);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Split Month/Year Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('doctors.signup.step2.license_month_label')}
          </label>
          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-12 text-base"
              aria-label={t('doctors.signup.step2.license_month_label')}
            >
              <SelectValue placeholder={t('doctors.signup.step2.license_month_placeholder')} />
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
            {t('doctors.signup.step2.license_year_label')}
          </label>
          <Select
            value={selectedYear}
            onValueChange={setSelectedYear}
            disabled={disabled}
          >
            <SelectTrigger
              className="h-12 text-base"
              aria-label={t('doctors.signup.step2.license_year_label')}
            >
              <SelectValue placeholder={t('doctors.signup.step2.license_year_placeholder')} />
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
          {t('doctors.signup.step2.license_quick_select_label')}
        </label>
        <div className="grid grid-cols-4 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => handlePresetClick(1, e)}
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
            onClick={(e) => handlePresetClick(3, e)}
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
            onClick={(e) => handlePresetClick(5, e)}
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
            onClick={(e) => handlePresetClick(10, e)}
            disabled={disabled}
            className="h-10 text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Set expiration to 10 years from now"
          >
            +10Y
          </Button>
        </div>
      </div>

      {/* Selected Date Display */}
      {selectedMonth && selectedYear && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-md border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {MONTHS[parseInt(selectedMonth)]?.label} {selectedYear}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => handleClear(e)}
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
