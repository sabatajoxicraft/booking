interface StatusChipProps {
  label: string
  variant?: 'confirmed' | 'pending' | 'cancelled'
}

export function StatusChip({ label, variant }: StatusChipProps) {
  const getVariantClass = (v?: string) => {
    switch (v) {
      case 'confirmed':
        return 'inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-foreground bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
      case 'pending':
        return 'inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-foreground bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
      case 'cancelled':
        return 'inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground'
      default:
        return 'inline-flex rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground'
    }
  }

  return (
    <span className={getVariantClass(variant)}>
      {label}
    </span>
  )
}
