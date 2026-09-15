import { useState } from 'react'
import s from './atelier.module.css'

const iconFiles = import.meta.glob('./assets/icons/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default'
})
const images = import.meta.glob('./assets/*-*.webp', {
  eager: true,
  query: '?url',
  import: 'default'
})

export function Icon({ name, size = 20 }) {
  const raw = iconFiles[`./assets/icons/${name}.svg`]
  // Only vendored, reviewed SVG markup is used; no runtime or user-provided HTML.
  return (
    <span
      className={s.icon}
      style={{ width: size, height: size }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: raw || '' }}
    />
  )
}

export function Mark({ kind = 'fold', size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      className={s.mark}
    >
      {kind === 'fold' ? (
        <path d="M6 4h8v15L27 6v11L16 28H6Z" />
      ) : (
        <>
          <path d="M16 3a13 13 0 1 0 13 13h-5a8 8 0 1 1-8-8V3Z" />
          <path d="m20 3 9 0v9h-5V8h-4Z" />
        </>
      )}
    </svg>
  )
}

export function ObjectImage({ name, theme, className = '', eager = false }) {
  const [failed, setFailed] = useState(false)
  const src = images[`./assets/${name}-${theme}.webp`]
  return (
    <div className={`${s.object} ${className}`} aria-hidden="true">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width="768"
          height="768"
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={s.objectFallback}>
          {['fold', 'meridian'].includes(name) ? (
            <Mark kind={name} size={64} />
          ) : (
            <Icon
              name={
                {
                  fitness: 'barbell',
                  university: 'book-open',
                  career: 'briefcase',
                  travel: 'map-trifold'
                }[name]
              }
              size={48}
            />
          )}
        </span>
      )}
    </div>
  )
}

export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}) {
  return (
    <button {...props} className={`${s.button} ${s[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Eyebrow({ children }) {
  return <p className={s.eyebrow}>{children}</p>
}

export function ThemePreview({ theme, mark }) {
  return (
    <span
      className={s.themePreview}
      data-swatch-theme={theme}
      aria-hidden="true"
    >
      <span className={s.miniRail}>
        <Mark kind={mark} size={16} />
        <i />
        <i />
        <i />
      </span>
      <span className={s.miniPage}>
        <b />
        <span className={s.miniMission}>
          <i />
          <Mark kind={mark} size={26} />
        </span>
        <i />
        <i />
      </span>
    </span>
  )
}
