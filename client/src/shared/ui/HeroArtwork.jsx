import styles from './HeroArtwork.module.css'

// Shared cover geometry: size the original bytes in their displayed orientation.
export function HeroArtwork({ src, width, height, quarterTurn = false, viewport = false }) {
  return <div className={`${styles.artwork} ${quarterTurn ? styles.quarterTurn : styles.landscape} ${viewport ? styles.viewport : ''}`} aria-hidden="true"
    style={{ '--artwork-ratio': width / height, '--artwork-width': `${width / height * 100}cqh`, '--rotated-width': `${width / height * 100}cqw` }}>
    <img src={src} width={width} height={height} alt="" fetchPriority="high" />
  </div>
}
