// A small shared stroke icon set; decorative icons always accompany a text label.
const paths = {
  today: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  tasks: 'm4 6 1.5 1.5L8 5m3 1h9M4 12h3m4 0h9M4 18h3m4 0h9',
  goals: 'M20 12a8 8 0 1 1-8-8m4 8a4 4 0 1 1-4-4m0 4L21 3m-5 0h5v5',
  habits: 'M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3',
  areas: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  inbox: 'M4 4h16l2 12v4H2v-4L4 4Zm-2 12h6l2 3h4l2-3h6',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  more: 'M4 6h16M4 12h16M4 18h16',
  leaf: 'M5 19C-1 7 12 2 21 3c0 10-4 18-13 16M3 22 16 9',
}

export function Icon({ name, size = 20, ...props }) {
  return <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name] || paths.areas} /></svg>
}
