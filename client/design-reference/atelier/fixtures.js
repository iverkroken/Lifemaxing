// Fictional design-study fixtures. No connection to owner data or the API.
export const areas = [
  {
    key: 'fitness',
    name: 'Health & Fitness',
    short: 'Fitness',
    icon: 'barbell',
    note: 'Energi til livet du vil leve.',
    color: 'sage'
  },
  {
    key: 'university',
    name: 'University',
    short: 'University',
    icon: 'book-open',
    note: 'Plass til å lære. Rom til å tenke.',
    color: 'blue'
  },
  {
    key: 'career',
    name: 'Work & Career',
    short: 'Career',
    icon: 'briefcase',
    note: 'Bygg noe du er stolt av.',
    color: 'blue'
  },
  {
    key: 'travel',
    name: 'Travel',
    short: 'Travel',
    icon: 'map-trifold',
    note: 'Nye perspektiver begynner her.',
    color: 'blue'
  }
]
export const tasks = [
  {
    id: 'mission',
    title: 'Gi prosjektet en tydelig retning',
    area: 'career',
    minutes: 45,
    detail: 'Samle innsikten og skisser de tre viktigste prioriteringene.',
    planned: true
  },
  {
    id: 'chapter',
    title: 'Les kapittelet om organisasjonskultur',
    area: 'university',
    minutes: 30,
    planned: true
  },
  {
    id: 'movement',
    title: 'En rolig styrkeøkt',
    area: 'fitness',
    minutes: 40,
    planned: true
  },
  {
    id: 'weekend',
    title: 'Finn en togrute for helgeturen',
    area: 'travel',
    minutes: 15,
    planned: true
  },
  {
    id: 'notes',
    title: 'Rydd i notatene fra forelesningen',
    area: 'university',
    minutes: 15,
    planned: true
  },
  {
    id: 'review',
    title: 'Send tilbakemelding på prosjektutkastet',
    area: 'career',
    minutes: 20,
    planned: true,
    done: true
  },
  {
    id: 'tickets',
    title: 'Sammenlign to mulige reisedatoer',
    area: 'travel',
    minutes: 15,
    planned: false
  },
  {
    id: 'seminar',
    title: 'Forbered spørsmål til seminaret',
    area: 'university',
    minutes: 20,
    planned: false
  },
  {
    id: 'stretch',
    title: 'Lag et enkelt mobilitetsprogram',
    area: 'fitness',
    minutes: 20,
    planned: false
  }
]
export const habits = [
  {
    id: 'read',
    title: 'Les i 15 minutter',
    note: 'Et lite rom for nye tanker',
    area: 'university',
    week: [true, true, false, true, false, true, false]
  },
  {
    id: 'walk',
    title: 'Gå en tur',
    note: 'Litt bevegelse. Litt frisk luft.',
    area: 'fitness',
    week: [true, false, true, true, true, false, true],
    done: true
  },
  {
    id: 'reflect',
    title: 'Avslutt arbeidsdagen',
    note: 'Hva tar du med deg videre?',
    area: 'career',
    week: [true, true, true, false, true, false, false]
  }
]
export const goals = [
  { title: 'En jevn treningsrytme', area: 'fitness' },
  { title: 'Fullfør semesterprosjektet', area: 'university' },
  { title: 'Et tydeligere prosjektforslag', area: 'career' }
]
export const busyTasks = [
  ...tasks.filter((t) => t.planned),
  ...[
    'Skriv et sammendrag av forskningsartikkelen',
    'Gå gjennom referanselisten',
    'Velg eksempler til presentasjonen',
    'Sorter prosjektets åpne spørsmål',
    'Lag en enkel pakkeliste',
    'Undersøk en tursti ved reisemålet',
    'Avtal neste gjennomgang',
    'Planlegg ukens treningsøkter',
    'Skriv første utkast til konklusjon',
    'Se gjennom tilbakemeldingene',
    'Finn avgangstider for søndag',
    'Forbered morgendagens arbeidsøkt'
  ].map((title, i) => ({
    id: `busy-${i}`,
    title,
    area: areas[i % 4].key,
    minutes: [15, 25, 40][i % 3],
    planned: true
  }))
]
export const progression = {
  level: 8,
  rank: 'Bronze',
  totalXp: 6200,
  intoLevel: 600,
  nextLevel: 1200
}
