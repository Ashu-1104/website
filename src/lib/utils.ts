export function cn(...args: Array<string | false | undefined | null>) {
  return args.filter(Boolean).join(' ')
}

// Alias for backwards compatibility
export const cx = cn;
