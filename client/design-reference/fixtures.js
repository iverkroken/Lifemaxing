// Fictional presentation data only. Never imported by the application or sent to an API.
export const areas = [
  ['fitness', 'Helse og trening', 'Styrke, bevegelse og overskudd', 0],
  ['university', 'Studier', 'Rom for å forstå mer', 1],
  ['career', 'Arbeid og karriere', 'Arbeid du vil stå bak', 2],
  ['finance', 'Økonomi', 'Oversikt og bevisste valg', 3],
  ['home', 'Hjem og planter', 'Ta vare på det rundt deg', 4],
  ['style', 'Stil', 'Et uttrykk som er ditt', 5],
  ['food', 'Mat og matlaging', 'Gode måltider i hverdagen', 6],
  ['creative', 'Kreativt', 'Plass til å lage noe', 7],
  ['travel', 'Reise', 'Steder å være nysgjerrig på', 8],
  ['personal', 'Personlig', 'Det du vil gi plass til', 9],
].map(([key, name, description, artwork]) => ({ key, name, description, artwork }))

export const mission = { id: 'mission', title: 'Ferdigstill presentasjonen til prosjektgjennomgangen', area: 'career', minutes: 45, detail: 'Samle tre funn, velg eksemplene og skriv neste steg.', planned: true }
export const tasks = [
  mission,
  { id: 'chapter', title: 'Les kapittel 4 og noter to spørsmål til seminaret', area: 'university', minutes: 30, planned: true },
  { id: 'strength', title: 'Gjennomfør styrkeøkt A', area: 'fitness', minutes: 45, planned: true },
  { id: 'invoice', title: 'Kontroller fakturaen fra den fiktive verkstedavtalen', area: 'finance', minutes: 10, overdue: true, planned: true },
  { id: 'dinner', title: 'Planlegg tre middager og skriv handleliste', area: 'food', minutes: 15, planned: true },
  { id: 'plant', title: 'Vann plantene i stuen', area: 'home', minutes: 5, planned: true, done: true },
  { id: 'draft', title: 'Samle referanser til en ny fotoserie', area: 'creative', minutes: 20, planned: false },
  { id: 'walk', title: 'Velg en kort tur til helgen', area: 'travel', minutes: 15, planned: false },
  { id: 'wardrobe', title: 'Finn plagg som trenger reparasjon', area: 'style', minutes: 15, planned: false },
  { id: 'notes', title: 'Skriv ned tanker fra uken', area: 'personal', minutes: 10, planned: false },
  { id: 'budget', title: 'Gå gjennom neste måneds budsjettkategorier', area: 'finance', minutes: 20, planned: false },
  { id: 'review', title: 'Se over disposisjonen med vedlegg, alternative løsninger og spørsmål som må avklares før neste møte', area: 'career', minutes: 25, planned: false },
]
export const busyTasks = [
  ...tasks.map(task => ({ ...task, planned: true })),
  ...[
    ['email', 'Svar på tilbakemeldingen om prosjektet', 'career', 10],
    ['library', 'Lever biblioteksbøkene', 'university', 20],
    ['laundry', 'Sett på en vask', 'home', 5],
    ['route', 'Sammenlign to reiseruter', 'travel', 25],
    ['camera', 'Rydd og sikkerhetskopier øvingsbildene', 'creative', 20],
    ['appointment', 'Finn en ledig dag til en avtale', 'personal', 10],
  ].map(([id, title, area, minutes]) => ({ id, title, area, minutes, planned: true })),
]
export const habits = [
  { id: 'reading', title: 'Les i 15 minutter', area: 'university', cadence: '2 av 3 denne uken', done: true },
  { id: 'air', title: 'En tur ut i dagslys', area: 'fitness', cadence: 'Daglig', done: false },
  { id: 'close', title: 'Avslutt dagen med en kort refleksjon', area: 'personal', cadence: 'Daglig', done: false },
]
export const goals = [
  { area: 'career', title: 'En gjennomarbeidet prosjektportefølje' },
  { area: 'fitness', title: 'Etabler en jevn treningsrutine' },
  { area: 'university', title: 'Fullfør semesteroppgaven' },
  { area: 'creative', title: 'Lag en liten fotoserie' },
]
export const ranks = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger']
