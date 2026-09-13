import styles from './ProgressPage.module.css'

// Six original emblems for the six existing ranks. No new rank rules.
const shapes = {
  Bronze: 'M48 10 80 29v38L48 86 16 67V29Z',
  Silver: 'M48 8 82 28v40L48 88 14 68V28Zm0 13L25 34v27l23 14 23-14V34Z',
  Gold: 'M48 7 60 30 86 33 67 52 71 79 48 67 25 79 29 52 10 33 36 30Z',
  Platinum: 'M48 8 81 28v40L48 88 15 68V28Zm0 18 19 22-19 22-19-22Z',
  Diamond: 'M26 16h44l19 26-41 46L7 42Zm0 0 22 72 22-72M7 42h82M26 16l22 26 22-26',
  Apex: 'm10 68 19-40 19 25 19-37 19 52Zm13 12h51M29 28l19-20 19 8M48 53v15',
}
export function RankBadge({ rank }) {
  return <span className={styles.rankBadge} data-rank={rank} aria-hidden="true">
    <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d={shapes[rank] || shapes.Bronze} /><circle cx="48" cy="48" r="5" /></svg>
  </span>
}
