// Joint: separate parts becoming one coherent system. Locked flat geometry.
// Decorative: the adjacent uppercase wordmark supplies the accessible name.
export function BrandMark({ size = 32, color = 'var(--color-brand-ruby)' }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" fill={color} stroke="none" aria-hidden="true" focusable="false">
    <path d="M7 2H25Q28 2 28 5V13H17Q15 13 15 15V17H4V5Q4 2 7 2Z" />
    <path d="M4 20H16Q18 20 18 18V16H28V27Q28 30 25 30H7Q4 30 4 27Z" />
  </svg>
}
