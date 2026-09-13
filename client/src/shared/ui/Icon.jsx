// A small shared stroke icon set; decorative icons always accompany a text label.
const paths = {
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  signOut: 'M9 4H4v16h5m5-12 4 4-4 4m-5-4h13',
  shield: 'M12 3 3 7v5c0 5 5 8 9 10 4-2 9-5 9-10V7l-9-4Zm-4 9 3 3 5-6',
  fitness: 'm3 8 5-5m8 18 5-5M5 5l14 14M2 11l9-9m2 20 9-9',
  university: 'm2 9 10-5 10 5-10 5-10-5Zm4 3v6c4 3 8 3 12 0v-6m4-3v8',
  career: 'M4 7h16v14H4zM8 7V3h8v4M4 12h16m-10 0v3h4v-3',
  finance: 'M3 5h18v15H3zM3 9h18m-6 4h6m-5 3h1',
  home: 'm2 11 10-8 10 8M5 9v12h14V9m-10 12v-7h6v7',
  style: 'm8 3-6 4 3 6 3-2v10h8V11l3 2 3-6-6-4c0 4-8 4-8 0Z',
  food: 'M4 3v6c0 3 6 3 6 0V3M7 3v19M19 22V3c-5 3-5 10 0 10',
  creative: 'm4 17-1 4 4-1L21 6l-3-3L4 17Zm10-10 3 3',
  travel: 'm3 10 7 2 2-9 3-1 1 10 6 3v3l-7-2-3 6-2-1 1-6-8-2v-3Z',
  personal: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-3a8 8 0 0 1 16 0v3',
  focus: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M9 8l7 4-7 4V8Z',
  progress: 'M4 20V14m8 6V9m8 11V4',
  activity: 'M4 6h16M4 12h16M4 18h10',
  rewards: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C4 8 5 1 9 3l3 5Zm0 0c8 0 7-7 3-5l-3 5Z',
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
