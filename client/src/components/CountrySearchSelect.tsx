import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Country {
  code: string;
  name: string;
}

interface CountrySearchSelectProps {
  countries: Country[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  popularCountries?: string[]; // Country codes for popular countries
}

export function CountrySearchSelect({
  countries,
  value,
  onChange,
  placeholder = 'Select a country...',
  popularCountries = ['DE', 'AT', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL'],
}: CountrySearchSelectProps) {
  const [open, setOpen] = useState(false);

  const { popular, other } = useMemo(() => {
    const popularSet = new Set(popularCountries);
    const popular: Country[] = [];
    const other: Country[] = [];

    countries.forEach((country) => {
      if (popularSet.has(country.code)) {
        popular.push(country);
      } else {
        other.push(country);
      }
    });

    // Sort popular countries by the order in popularCountries array
    popular.sort((a, b) => {
      return popularCountries.indexOf(a.code) - popularCountries.indexOf(b.code);
    });

    return { popular, other };
  }, [countries, popularCountries]);

  const selectedCountry = countries.find((country) => country.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCountry ? selectedCountry.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search countries..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {popular.length > 0 && (
              <CommandGroup heading="Popular Countries">
                {popular.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.name}
                    onSelect={() => {
                      onChange(country.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === country.code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {country.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="All Countries">
              {other.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === country.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
