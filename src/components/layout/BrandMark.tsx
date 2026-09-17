/**
 * The SSM One node mark: a primary node above two secondaries, joined by lines.
 * Colours come from the theme tokens so it reads on paper and on navy alike.
 */
export default function BrandMark({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="SSM One"
    >
      <line x1="12" y1="7" x2="6" y2="17" stroke="var(--ink-3)" strokeWidth="1.4" opacity="0.45" />
      <line x1="12" y1="7" x2="18" y2="17" stroke="var(--ink-3)" strokeWidth="1.4" opacity="0.45" />
      <circle cx="6" cy="17" r="3" fill="var(--ink-3)" />
      <circle cx="18" cy="17" r="3" fill="var(--ink-3)" />
      <circle cx="12" cy="7" r="4.2" fill="var(--ink-2)" />
      <circle cx="12" cy="7" r="1.7" fill="var(--ivory)" />
    </svg>
  )
}
