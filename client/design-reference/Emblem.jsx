// Original LIFEMAXING vector studies. These are presentation symbols, not rank rules.
const silhouettes = [
  'M24 16H72V65L48 82 24 65Z',
  'M48 10 77 26V65L48 86 19 65V26Z',
  'M48 8 80 30 72 70 48 88 24 70 16 30Z',
  'M48 7 61 23 79 23 79 61 65 77 48 89 31 77 17 61V23H35Z',
  'M48 5 85 31 76 71 48 91 20 71 11 31 30 22Z',
  'M29 9H67L84 34 76 68 48 91 20 68 12 34Z',
  'M26 10H70L91 39 71 68 48 91 25 68 5 39Z',
  'M48 4 65 22 83 13 79 54 66 78 48 92 30 78 17 54 13 13 31 22Z',
  'M48 3 62 20 86 9 81 43 91 51 72 73 48 93 24 73 5 51 15 43 10 9 34 20Z',
  'M48 2 63 21 88 7 81 37 94 48 78 66 71 84 56 83 48 95 40 83 25 84 18 66 2 48 15 37 8 7 33 21Z',
]
export function Emblem({ index = 0, size = 80 }) {
  return <svg width={size} height={size} viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d={silhouettes[index]} fill="currentColor" fillOpacity=".08" />
    <path d="M48 21 64 48 48 75 32 48Z" />
    <path d="M48 21V75M32 48H64" strokeOpacity=".5" />
    {index > 2 && <path d="M25 32V59L48 80 71 59V32" />}
    {index > 6 && <path d="m19 25 7 24m51-24-7 24M39 14l9 7 9-7" />}
  </svg>
}
