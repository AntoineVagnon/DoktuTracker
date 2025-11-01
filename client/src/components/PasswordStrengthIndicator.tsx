import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;

    // Length check
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 15; // lowercase
    if (/[A-Z]/.test(password)) score += 15; // uppercase
    if (/[0-9]/.test(password)) score += 15; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 15; // special characters

    // Determine label and color
    let label = '';
    let color = '';

    if (score < 40) {
      label = 'Weak';
      color = 'bg-red-500';
    } else if (score < 70) {
      label = 'Medium';
      color = 'bg-yellow-500';
    } else {
      label = 'Strong';
      color = 'bg-green-500';
    }

    return { score, label, color };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full transition-all duration-300', strength.color)}
          style={{ width: `${strength.score}%` }}
        />
      </div>
      <p className={cn('text-sm font-medium', {
        'text-red-600': strength.label === 'Weak',
        'text-yellow-600': strength.label === 'Medium',
        'text-green-600': strength.label === 'Strong',
      })}>
        Password strength: {strength.label}
      </p>
    </div>
  );
}
