import { createContext, useContext } from 'react'
import { catalog } from './catalog.js'
import { areaDetailCatalog } from '../areas/areaDetailCatalog.js'
import { accountCatalog } from '../auth/accountCatalog.js'
import { financeCatalog } from '../finance/financeCatalog.js'
import { planningSearchCatalog } from '../search/planningSearchCatalog.js'
import { dailyProgressCatalog } from '../today/dailyProgressCatalog.js'
import { deletionCatalog } from './deletionCatalog.js'
import { formatDate, localizedArea, errorKey } from './formatting.js'

// UI language is separate from regional formatting and historical time zones.
export const languages = [['en', 'English'], ['nb', 'Norsk bokmål'], ['sv', 'Svenska'], ['da', 'Dansk']]
export const messages = {
  ...catalog,
  ...areaDetailCatalog,
  ...accountCatalog,
  ...financeCatalog,
  ...planningSearchCatalog,
  ...dailyProgressCatalog,
  ...deletionCatalog,
  areaFilters: ['Filter', 'Filter', 'Filter', 'Filter'],
  areaSort: ['Sort by', 'Sorter etter', 'Sortera efter', 'Sortér efter'],
  areaStatus: ['Area status', 'Områdestatus', 'Områdesstatus', 'Områdestatus'],
  areaContent: ['Content', 'Innhold', 'Innehåll', 'Indhold'],
  areaAll: ['All', 'Alle', 'Alla', 'Alle'],
  areaFilled: ['With content', 'Med innhold', 'Med innehåll', 'Med indhold'],
  areaEmpty: ['Without content', 'Uten innhold', 'Utan innehåll', 'Uden indhold'],
  areaReset: ['Reset', 'Nullstill', 'Återställ', 'Nulstil'],
  areaNoResults: ['No areas match these filters. Reset to see all areas.', 'Ingen områder matcher filtrene. Nullstill for å se alle.', 'Inga områden matchar filtren. Återställ för att se alla.', 'Ingen områder matcher filtrene. Nulstil for at se alle.'],
  areaResults: ['{count} of {total} areas', '{count} av {total} områder', '{count} av {total} områden', '{count} af {total} områder'],
  areaCountHint: ['Counts include open tasks, active goals and active habits.', 'Tallene gjelder åpne oppgaver, aktive mål og aktive vaner.', 'Antal gäller öppna uppgifter, aktiva mål och aktiva vanor.', 'Antal omfatter åbne opgaver, aktive mål og aktive vaner.'],
  areaCountsUnavailable: ['Counts are unavailable. Count-based views will appear once they load.', 'Tallene er utilgjengelige. Antallsbaserte visninger kommer når de er lastet.', 'Antalen är inte tillgängliga. Antalsbaserade vyer visas när de har laddats.', 'Antal er ikke tilgængelige. Antalsbaserede visninger vises når de er indlæst.'],
  layoutApiUnavailable: ['Layout saving is unavailable in the running API. Restart the development API with the latest code, then retry.', 'Lagring av oppsett er utilgjengelig i API-et som kjører. Start utviklings-API-et på nytt med siste kode, og prøv igjen.', 'Layoutlagring saknas i det API som körs. Starta om utvecklings-API med senaste koden och försök igen.', 'Layoutlagring er ikke tilgængelig i det kørende API. Genstart udviklings-API med den nyeste kode og prøv igen.'],
  areaSort_custom: ['My layout', 'Eget oppsett', 'Min layout', 'Mit layout'],
  areaSort_name: ['Alphabetical A–Z', 'Alfabetisk A–Å', 'Alfabetiskt A–Ö', 'Alfabetisk A–Å'],
  'areaSort_tasks-desc': ['Most tasks', 'Flest oppgaver', 'Flest uppgifter', 'Flest opgaver'],
  'areaSort_tasks-asc': ['Fewest tasks', 'Færrest oppgaver', 'Färst uppgifter', 'Færrest opgaver'],
  'areaSort_goals-desc': ['Most goals', 'Flest mål', 'Flest mål', 'Flest mål'],
  'areaSort_goals-asc': ['Fewest goals', 'Færrest mål', 'Färst mål', 'Færrest mål'],
  'areaSort_habits-desc': ['Most habits', 'Flest vaner', 'Flest vanor', 'Flest vaner'],
  'areaSort_habits-asc': ['Fewest habits', 'Færrest vaner', 'Färst vanor', 'Færrest vaner'],
  layoutCancel: ["Cancel", "Avbryt", "Avbryt", "Annuller"],
  customizeLayout: ["Customize layout","Tilpass oppsett","Anpassa layout","Tilpas layout"],
  saveLayout: ["Save layout","Lagre oppsett","Spara layout","Gem layout"],
  dragArea: ["Drag to move","Dra for ? flytte","Dra f?r att flytta","Tr?k for at flytte"],
  moveEarlier: ["Move earlier","Flytt frem","Flytta fram","Flyt frem"],
  moveLater: ["Move later","Flytt bak","Flytta bak?t","Flyt tilbage"],
  layoutHint: ["Drag anywhere on a card (hold on touch) or use the move buttons. The wide card moves between complete desktop rows.","Dra hvor som helst p? kortet (hold inne p? ber?ringsskjerm) eller bruk flytteknappene. Det brede kortet flyttes mellom hele rader p? desktop.","Dra var som helst p? kortet (h?ll in p? peksk?rm) eller anv?nd flyttknapparna. Det breda kortet flyttas mellan hela rader p? datorn.","Tr?k hvor som helst p? kortet (hold p? ber?ringssk?rm) eller brug flytteknapperne. Det brede kort flyttes mellem hele r?kker p? computeren."],
  layoutDraft: ["Preview only until you save.","Forh?ndsvisning til du lagrer.","F?rhandsvisning tills du sparar.","Forh?ndsvisning indtil du gemmer."],
  layoutSaveFailed: ["Layout not saved. Your preview is kept; try again or cancel.","Oppsettet ble ikke lagret. Utkastet er beholdt; pr?v igjen eller avbryt.","Layouten sparades inte. F?rhandsvisningen finns kvar; f?rs?k igen eller avbryt.","Layout blev ikke gemt. Forh?ndsvisningen er bevaret; pr?v igen eller annuller."],
  areaMoved: ["{name}: position {position}.","{name}: plass {position}.","{name}: plats {position}.","{name}: plads {position}."],
  weekTitle: ['Your week', 'Uken din', 'Din vecka', 'Din uge'],
  weekHint: ['A record of your rhythm. Flexible weekly goals do not require specific weekdays.', 'En oversikt over rytmen din. Fleksible ukemål krever ikke bestemte ukedager.', 'En översikt över din rytm. Flexibla veckomål kräver inte bestämda veckodagar.', 'En oversigt over din rytme. Fleksible ugemål kræver ikke bestemte ugedage.'],
  weekDate: ['Week containing', 'Uke med dato', 'Vecka med datum', 'Uge med dato'],
  week_completed: ['Done', 'Utført', 'Klart', 'Udført'], week_corrected: ['Corrected', 'Korrigert', 'Korrigerad', 'Rettet'],
  week_planned: ['Planned', 'Planlagt', 'Planerat', 'Planlagt'], week_notPlanned: ['Rest', 'Fri', 'Vila', 'Fri'],
  week_flexible: ['Flexible', 'Fleksibel', 'Flexibel', 'Fleksibel'], week_future: ['Ahead', 'Fremtidig', 'Framöver', 'Fremtidig'],
  weeklyTargetCount: ['{count}/week', '{count}/uke', '{count}/vecka', '{count}/uge'],
  weekEmpty: ['No routines in this view. Create a habit or choose another area.', 'Ingen rutiner i denne visningen. Opprett en vane eller velg et annet område.', 'Inga rutiner i den här vyn. Skapa en vana eller välj ett annat område.', 'Ingen rutiner i denne visning. Opret en vane eller vælg et andet område.'],
  commandMenu: ['Quick actions', 'Hurtighandlinger', 'Snabbåtgärder', 'Hurtige handlinger'],
  findAction: ['Find an action or page', 'Finn en handling eller side', 'Hitta en åtgärd eller sida', 'Find en handling eller side'],
  commandHint: ['Ctrl/Cmd+K opens this menu outside text fields. Tab to browse; Enter to choose; Escape to close.', 'Ctrl/Cmd+K åpner menyen utenfor tekstfelt. Bla med Tab, velg med Enter og lukk med Escape.', 'Ctrl/Cmd+K öppnar menyn utanför textfält. Bläddra med Tab, välj med Enter och stäng med Escape.', 'Ctrl/Cmd+K åbner menuen uden for tekstfelter. Gennemse med Tab, vælg med Enter og luk med Escape.'],
  noActions: ['No matching actions. Try another word.', 'Ingen passende handlinger. Prøv et annet ord.', 'Inga matchande åtgärder. Prova ett annat ord.', 'Ingen matchende handlinger. Prøv et andet ord.'],
  create_task: ['Create a task', 'Opprett en oppgave', 'Skapa en uppgift', 'Opret en opgave'],
  create_habit: ['Create a habit', 'Opprett en vane', 'Skapa en vana', 'Opret en vane'],
  create_goal: ['Create a goal', 'Opprett et mål', 'Skapa ett mål', 'Opret et mål'],
  continueFocus: ['Continue focus', 'Fortsett fokus', 'Fortsätt fokusera', 'Fortsæt fokus'],
  paused: ['Paused', 'Pauset', 'Pausad', 'På pause'], running: ['Running', 'Pågår', 'Pågår', 'I gang'],
  taskDetails: ['Task details', 'Oppgavedetaljer', 'Uppgiftsdetaljer', 'Opgavedetaljer'],
  backToList: ['Back to list', 'Tilbake til listen', 'Tillbaka till listan', 'Tilbage til listen'],
  appearance: ['Appearance', 'Utseende', 'Utseende', 'Udseende'],
  appearanceHint: ['Make room for the way you work.', 'Gi plass til måten du arbeider på.', 'Gör plats för ditt sätt att arbeta.', 'Giv plads til din måde at arbejde på.'],
  theme: ['Theme', 'Tema', 'Tema', 'Tema'],
  light: ['Light', 'Lyst', 'Ljust', 'Lyst'], dark: ['Dark', 'Mørkt', 'Mörkt', 'Mørkt'], system: ['System', 'System', 'System', 'System'],
  density: ['Information density', 'Informasjonstetthet', 'Informationstäthet', 'Informationstæthed'],
  normal: ['Normal', 'Normal', 'Normal', 'Normal'], compact: ['Compact', 'Kompakt', 'Kompakt', 'Kompakt'],
  normalHint: ['Room to breathe between actions.', 'Luft mellom handlingene.', 'Luft mellan handlingarna.', 'Luft mellem handlingerne.'],
  compactHint: ['More work in view, with readable text.', 'Mer arbeid i oversikten, med lesbar tekst.', 'Mer arbete i vyn, med läsbar text.', 'Mere arbejde i oversigten, med læsbar tekst.'],
  saving: ['Saving…', 'Lagrer…', 'Sparar…', 'Gemmer…'],
  notSaved: ['Preview only. Changes could not be saved.', 'Bare forhåndsvisning. Endringene kunne ikke lagres.', 'Endast förhandsvisning. Ändringarna kunde inte sparas.', 'Kun forhåndsvisning. Ændringerne kunne ikke gemmes.'],
  appearanceAutoSave: ['Changes are saved automatically to your account.', 'Endringer lagres automatisk på kontoen din.', 'Ändringar sparas automatiskt på ditt konto.', 'Ændringer gemmes automatisk på din konto.'],
  interfaceHint: ['Interface language. Your own writing stays as you wrote it.', 'Grensesnittspråk. Dine egne tekster beholdes slik du skrev dem.', 'Gränssnittsspråk. Dina egna texter behålls som du skrev dem.', 'Grænsefladesprog. Dine egne tekster bevares, som du skrev dem.'],
  region: ['Regional format', 'Regionalformatering', 'Regionalt format', 'Regionalt format'],
  regionHint: ['How numbers and dates are displayed. This does not change your time zone.', 'Hvordan tall og datoer vises. Dette endrer ikke tidssonen din.', 'Hur tal och datum visas. Detta ändrar inte din tidszon.', 'Hvordan tal og datoer vises. Dette ændrer ikke din tidszone.'],
  zoneSearchHint: ['Search for a city or region. Earlier plans keep their original dates.', 'Søk etter en by eller region. Eldre planer beholder opprinnelige datoer.', 'Sök efter en stad eller region. Tidigare planer behåller sina ursprungliga datum.', 'Søg efter en by eller region. Tidligere planer beholder deres oprindelige datoer.'],
  invalidZone: ['Choose a valid time zone from the suggestions.', 'Velg en gyldig tidssone fra forslagene.', 'Välj en giltig tidszon bland förslagen.', 'Vælg en gyldig tidszone fra forslagene.'],
  settingsSaveError: ['Settings were not saved. Check the fields and try again.', 'Innstillingene ble ikke lagret. Kontroller feltene og prøv igjen.', 'Inställningarna sparades inte. Kontrollera fälten och försök igen.', 'Indstillingerne blev ikke gemt. Kontrollér felterne og prøv igen.'],
  settings: ['Settings', 'Innstillinger', 'Inställningar', 'Indstillinger'],
  today: ['Today', 'I dag', 'Idag', 'I dag'], tasks: ['Tasks', 'Oppgaver', 'Uppgifter', 'Opgaver'],
  goals: ['Goals', 'Mål', 'Mål', 'Mål'], habits: ['Habits', 'Vaner', 'Vanor', 'Vaner'],
  areas: ['Life Areas', 'Livsområder', 'Livsområden', 'Livsområder'], inbox: ['Inbox', 'Innboks', 'Inkorg', 'Indbakke'],
  focus: ['Focus', 'Fokus', 'Fokus', 'Fokus'], progress: ['Progress', 'Fremgang', 'Framsteg', 'Fremskridt'],
  activity: ['Activity', 'Aktivitet', 'Aktivitet', 'Aktivitet'], rewards: ['Rewards', 'Belønninger', 'Belöningar', 'Belønninger'],
  workspace: ['Your workspace', 'Arbeidsområdet ditt', 'Din arbetsyta', 'Dit arbejdsområde'],
  execution: ['Progress & execution', 'Fremgang og fokus', 'Framsteg och fokus', 'Fremskridt og fokus'],
  capture: ['Capture', 'Registrer', 'Lägg till', 'Tilføj'], quickAdd: ['Quick Add', 'Legg til', 'Lägg till', 'Tilføj'], more: ['More', 'Mer', 'Mer', 'Mere'],
  account: ['My account', 'Min konto', 'Mitt konto', 'Min konto'], preferences: ['Language & time', 'Språk og tid', 'Språk och tid', 'Sprog og tid'],
  security: ['Sessions & security', 'Økter og sikkerhet', 'Sessioner och säkerhet', 'Sessioner og sikkerhed'],
  settingsIntro: ['Manage your account, preferences and access.', 'Administrer konto, preferanser og tilgang.', 'Hantera konto, inställningar och åtkomst.', 'Administrer konto, indstillinger og adgang.'],
  privateAccount: ['Private account', 'Privat konto', 'Privat konto', 'Privat konto'],
  email: ['Email', 'E-post', 'E-post', 'E-mail'],
  accountHint: ['Your work and history belong to this account.', 'Arbeidet og historikken din tilhører denne kontoen.', 'Ditt arbete och din historik tillhör detta konto.', 'Dit arbejde og din historik tilhører denne konto.'],
  language: ['Language', 'Språk', 'Språk', 'Sprog'],
  timeZone: ['Time zone', 'Tidssone', 'Tidszon', 'Tidszone'],
  timeHint: ['Use an IANA identifier such as Europe/Oslo. Plans and habits follow your local day; earlier records retain their dates.', 'Bruk et IANA-navn som Europe/Oslo. Planer og vaner følger din lokale dag; eldre registreringer beholder datoene.', 'Använd ett IANA-namn som Europe/Stockholm. Planer och vanor följer din lokala dag; tidigare poster behåller sina datum.', 'Brug et IANA-navn som Europe/Copenhagen. Planer og vaner følger din lokale dag; tidligere poster beholder deres datoer.'],
  save: ['Save settings', 'Lagre innstillinger', 'Spara inställningar', 'Gem indstillinger'],
  saved: ['Settings saved.', 'Innstillinger lagret.', 'Inställningarna har sparats.', 'Indstillingerne er gemt.'],
  loadError: ['Settings could not be loaded.', 'Kunne ikke laste innstillinger.', 'Kunde inte läsa in inställningarna.', 'Kunne ikke indlæse indstillinger.'],
  loading: ['Loading settings…', 'Laster innstillinger…', 'Läser in inställningar…', 'Indlæser indstillinger…'],
  retry: ['Try again', 'Prøv igjen', 'Försök igen', 'Prøv igen'],
  sessionTitle: ['How your sessions work', 'Slik fungerer øktene dine', 'Så fungerar dina sessioner', 'Sådan fungerer dine sessioner'],
  sessionHint: ['Without Remember Me, sign-in lasts up to 12 hours. Remembered sign-in lasts up to 30 days from login. Sessions are not extended indefinitely.', 'Uten «Hold meg innlogget» varer innloggingen opptil 12 timer. Med valget varer den opptil 30 dager fra innlogging. Økter forlenges ikke ubegrenset.', 'Utan «Håll mig inloggad» varar inloggningen upp till 12 timmar. Med valet varar den upp till 30 dagar från inloggningen. Sessioner förlängs inte obegränsat.', 'Uden «Hold mig logget ind» varer login op til 12 timer. Med valget varer det op til 30 dage fra login. Sessioner forlænges ikke ubegrænset.'],
  deviceHint: ['Individual devices are not listed yet. You can end this session or revoke all existing sessions below.', 'Enkeltenheter vises ikke ennå. Du kan avslutte denne økten eller tilbakekalle alle eksisterende økter nedenfor.', 'Enskilda enheter visas inte ännu. Du kan avsluta denna session eller återkalla alla befintliga sessioner nedan.', 'Enkelte enheder vises ikke endnu. Du kan afslutte denne session eller tilbagekalde alle eksisterende sessioner nedenfor.'],
  danger: ['Session controls', 'Avslutt økter', 'Avsluta sessioner', 'Afslut sessioner'],
  signOut: ['Sign out', 'Logg ut', 'Logga ut', 'Log ud'],
  everywhere: ['Sign out everywhere', 'Logg ut overalt', 'Logga ut överallt', 'Log ud overalt'],
  confirmOut: ['Sign out of this device?', 'Logge ut av denne enheten?', 'Logga ut från den här enheten?', 'Log ud af denne enhed?'],
  confirmEverywhere: ['Sign out on all devices?', 'Logge ut på alle enheter?', 'Logga ut på alla enheter?', 'Log ud på alle enheder?'],
  outHint: ['You will need to sign in again on this device. Saved work and history are kept.', 'Du må logge inn igjen på denne enheten. Lagret arbeid og historikk beholdes.', 'Du behöver logga in igen på den här enheten. Sparat arbete och historik behålls.', 'Du skal logge ind igen på denne enhed. Gemt arbejde og historik bevares.'],
  everywhereHint: ['This signs you out here and revokes older sessions on other devices within one minute. Your account and saved work are kept.', 'Dette logger deg ut her og tilbakekaller eldre økter på andre enheter innen ett minutt. Kontoen og lagret arbeid beholdes.', 'Detta loggar ut dig här och återkallar äldre sessioner på andra enheter inom en minut. Kontot och sparat arbete behålls.', 'Dette logger dig ud her og tilbagekalder ældre sessioner på andre enheder inden for ét minut. Kontoen og gemt arbejde bevares.'],
  cancel: ['Stay signed in', 'Forbli innlogget', 'Fortsätt vara inloggad', 'Forbliv logget ind'],
  logoutError: ['Could not sign out. Check your connection and try again.', 'Kunne ikke logge ut. Sjekk tilkoblingen og prøv igjen.', 'Kunde inte logga ut. Kontrollera anslutningen och försök igen.', 'Kunne ikke logge ud. Kontrollér forbindelsen og prøv igen.'],
}
export function interfaceLanguage(locale = 'en-GB') {
  const code = locale.toLowerCase().split('-')[0]
  return code === 'no' || code === 'nn' ? 'nb' : ['nb', 'sv', 'da'].includes(code) ? code : 'en'
}
export function translate(locale, key, values = {}, formatLocale = locale) {
  const index = ['en', 'nb', 'sv', 'da'].indexOf(interfaceLanguage(locale))
  const singular = typeof values.count === 'number' && new Intl.PluralRules(locale).select(values.count) === 'one'
  const selectedKey = singular && messages[key + 'One'] ? key + 'One' : key
  const message = messages[selectedKey]?.[index] ?? messages[selectedKey]?.[0] ?? key
  return message.replace(/\{(\w+)\}/g, (match, name) => values[name] === undefined ? match : typeof values[name] === 'number' ? new Intl.NumberFormat(formatLocale).format(values[name]) : String(values[name]))
}
export const LanguageContext = createContext({ language: 'en', preferences: { uiLanguage: 'en', theme: 'system', density: 'normal' }, setPublicPreferences: () => {}, t: (key, values) => translate('en', key, values) })
export function useLanguage() {
  const context = useContext(LanguageContext)
  const { t, locale = 'en-GB', timeZone = 'UTC', language = 'en' } = context
  return { ...context, locale, timeZone,
    date: (value, options) => formatDate(value, locale, options),
    dateTime: value => value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(value)) : '',
    weekday: (day, short = false) => new Intl.DateTimeFormat(language, { weekday: short ? 'short' : 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day))),
    number: value => new Intl.NumberFormat(locale).format(value),
    areaName: area => localizedArea(area, t),
    errorMessage: error => t(errorKey(error)),
  }
}
