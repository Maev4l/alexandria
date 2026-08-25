import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merges conditional classes and lets a caller's className win over a component default
// without specificity games.
export const cn = (...inputs) => twMerge(clsx(inputs));
