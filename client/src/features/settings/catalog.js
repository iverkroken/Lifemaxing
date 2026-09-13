// Reviewed interface copy: English | Norwegian Bokmål | Swedish | Danish.
// Keys are source copy, never user content or server error messages.
const rows = `
ledgerEntry|{amount} XP · {kind}|{amount} XP · {kind}|{amount} XP · {kind}
ledgerContext|{kind} · {date} · regler v{version}|{kind} · {date} · regler v{version}|{kind} · {date} · regler v{version}
areaCount_tasks|{count} oppgaver|{count} uppgifter|{count} opgaver
areaCount_tasksOne|{count} oppgave|{count} uppgift|{count} opgave
areaCount_goals|{count} mål|{count} mål|{count} mål
areaCount_goalsOne|{count} mål|{count} mål|{count} mål
areaCount_habits|{count} vaner|{count} vanor|{count} vaner
areaCount_habitsOne|{count} vane|{count} vana|{count} vane
activeAreaCountOne|{count} aktivt område|{count} aktivt område|{count} aktivt område
taskCountOne|{count} oppgave · {status}|{count} uppgift · {status}|{count} opgave · {status}
levelsRemainingOne|{count} nivå igjen|{count} nivå kvar|{count} niveau tilbage
weekLegend|Forklaring av ukestatus|Förklaring av veckostatus|Forklaring af ugestatus
captureDateHint|Velg dato for «Legg til denne dagen». «Legg i innboksen» lagrer alltid uten dato.|Välj datum för «Lägg till denna dag». «Lägg i inkorgen» sparar alltid utan datum.|Vælg dato for «Tilføj til denne dag». «Tilføj til indbakken» gemmer altid uden dato.
dayStatus|{done} av {total} oppgaver fullført|{done} av {total} uppgifter slutförda|{done} af {total} opgaver fuldført
taskCount|{count} oppgaver · {status}|{count} uppgifter · {status}|{count} opgaver · {status}
historyCount|Fullførte og endrede planer · {count}|Slutförda och ändrade planer · {count}|Fuldførte og ændrede planer · {count}
% from baseline toward target|% fra startverdi mot mål|% från utgångsvärde mot mål|% fra startværdi mod mål
Focus minutes · lifetime|Fokusminutter · totalt|Fokusminuter · totalt|Fokusminutter · i alt
Habit completions · lifetime|Fullførte vaner · totalt|Slutförda vanor · totalt|Fuldførte vaner · i alt
Tasks completed · lifetime|Fullførte oppgaver · totalt|Slutförda uppgifter · totalt|Fuldførte opgaver · i alt
How does this work?|Hvordan fungerer dette?|Hur fungerar det här?|Hvordan fungerer det?
Reset filters|Nullstill filtre|Återställ filter|Nulstil filtre
⌘ / Ctrl K|⌘ / Ctrl K|⌘ / Ctrl K|⌘ / Ctrl K
Level 1 starts at 0 XP. The next level needs 500 XP, then each transition needs 100 more. Bronze 1–9 · Silver 10–19 · Gold 20–29 · Platinum 30–39 · Diamond 40–49 · Apex 50+. Rules v1.|Nivå 1 starter på 0 XP. Neste nivå krever 500 XP, deretter krever hver overgang 100 mer. Bronse 1–9 · Sølv 10–19 · Gull 20–29 · Platina 30–39 · Diamant 40–49 · Apex 50+. Regler v1.|Nivå 1 börjar vid 0 XP. Nästa nivå kräver 500 XP, därefter kräver varje övergång 100 mer. Brons 1–9 · Silver 10–19 · Guld 20–29 · Platina 30–39 · Diamant 40–49 · Apex 50+. Regler v1.|Niveau 1 starter ved 0 XP. Næste niveau kræver 500 XP, derefter kræver hver overgang 100 mere. Bronze 1–9 · Sølv 10–19 · Guld 20–29 · Platin 30–39 · Diamant 40–49 · Apex 50+. Regler v1.
Tiny 10 · Small 25 · Medium 50 · Large 100 · Epic 200 XP.|Bitteliten 10 · Liten 25 · Middels 50 · Stor 100 · Episk 200 XP.|Mycket liten 10 · Liten 25 · Medelstor 50 · Stor 100 · Episk 200 XP.|Meget lille 10 · Lille 25 · Mellem 50 · Stor 100 · Episk 200 XP.
Tiny and Small tasks share a 50 XP daily cap. Habits share 75 XP per scheduled local day. Reopening reverses the exact award; completing again creates a new cycle.|Bittesmå og små oppgaver deler en dagsgrense på 50 XP. Vaner deler 75 XP per planlagt lokal dag. Gjenåpning tilbakefører nøyaktig tildelt XP; ny fullføring starter en ny syklus.|Mycket små och små uppgifter delar en dagsgräns på 50 XP. Vanor delar 75 XP per planerad lokal dag. Återöppning återför exakt tilldelade XP; nytt slutförande startar en ny cykel.|Meget små og små opgaver deler en dagsgrænse på 50 XP. Vaner deler 75 XP pr. planlagt lokal dag. Genåbning tilbagefører præcis den tildelte XP; ny fuldførelse starter en ny cyklus.
Paused|Pauset|Pausad|På pause
Running|Pågår|Pågår|I gang
Low|Lav|Låg|Lav
Normal|Normal|Normal|Normal
High|Høy|Hög|Høj
Tiny|Bitteliten|Mycket liten|Meget lille
Small|Liten|Liten|Lille
Medium|Middels|Medelstor|Mellem
Large|Stor|Stor|Stor
Epic|Episk|Episk|Episk
Bronze|Bronse|Brons|Bronze
Silver|Sølv|Silver|Sølv
Gold|Gull|Guld|Guld
Platinum|Platina|Platina|Platin
Diamond|Diamant|Diamant|Diamant
Apex|Apex|Apex|Apex
Award|Tildeling|Tilldelning|Tildeling
Reversal|Tilbakeføring|Återföring|Tilbageførsel
pageCount|Side {page} av {total}|Sida {page} av {total}|Side {page} af {total}
levelReached|Nivå {level} nådd · {rank}.|Nivå {level} nådd · {rank}.|Niveau {level} nået · {rank}.
levelNumber|Nivå {level}|Nivå {level}|Niveau {level}
xpToward|{current} / {total} XP mot nivå {level}|{current} / {total} XP mot nivå {level}|{current} / {total} XP mod niveau {level}
loadingSection|Laster {label}…|Läser in {label}…|Indlæser {label}…
unavailableSection|Kunne ikke laste {label}.|Kunde inte läsa in {label}.|Kunne ikke indlæse {label}.
goalLink|Mål: {title}|Mål: {title}|Mål: {title}
minutesCount|{count} min|{count} min|{count} min
plannedOn|Planlagt {date}|Planerat {date}|Planlagt {date}
dueOn|Frist {date}|Förfaller {date}|Frist {date}
overdueOn|Forfalt {date}|Försenad {date}|Overskredet {date}
historyFor|Historikk og innstillinger for {title}|Historik och inställningar för {title}|Historik og indstillinger for {title}
weeklyCount|{count} / {target} denne uken|{count} / {target} denna vecka|{count} / {target} denne uge
Target reached|Målet er nådd|Målet är nått|Målet er nået
Scheduled for this date|Planlagt denne datoen|Planerat detta datum|Planlagt denne dato
scheduleFrom|Fra {date} og videre|Från {date} och framåt|Fra {date} og frem
scheduleUntil|Fra {from} til før {to}|Från {from} till före {to}|Fra {from} til før {to}
targetDateValue|Måldato {date}|Måldatum {date}|Måldato {date}
baselineValue|Startverdi {value} {unit}|Utgångsvärde {value} {unit}|Startværdi {value} {unit}
currentValue|Nåværende verdi ({unit})|Aktuellt värde ({unit})|Aktuel værdi ({unit})
goalDirection|{direction} mot {value} {unit}|{direction} mot {value} {unit}|{direction} mod {value} {unit}
goalPercent|{percent} % fra startverdi mot mål|{percent} % från utgångsvärde mot mål|{percent} % fra startværdi mod mål
goalMeter|{title}: {percent} % fra startverdi mot mål|{title}: {percent} % från utgångsvärde mot mål|{title}: {percent} % fra startværdi mod mål
lastUpdate|Sist oppdatert {date}|Senast uppdaterat {date}|Senest opdateret {date}
claimedOn|Hentet {date}|Hämtad {date}|Hentet {date}
unlocksAt|Tilgjengelig på nivå {level}|Tillgänglig på nivå {level}|Tilgængelig på niveau {level}
levelsRemaining|{count} nivåer igjen|{count} nivåer kvar|{count} niveauer tilbage
doneCount|{done} av {total} utført|{done} av {total} klara|{done} af {total} udført
focusStatus|Fokusøkten din er {status}.|Din fokussession är {status}.|Din fokussession er {status}.
activeAreaCount|{count} aktive områder|{count} aktiva områden|{count} aktive områder
originalRecord|Opprinnelig registrering (engelsk)|Ursprunglig registrering (engelska)|Oprindelig registrering (engelsk)
event_TaskCompleted|Oppgave fullført|Uppgift slutförd|Opgave fuldført
event_TaskReopened|Oppgave gjenåpnet|Uppgift återöppnad|Opgave genåbnet
event_HabitCompleted|Vane fullført|Vana slutförd|Vane fuldført
event_HabitReversed|Vaneregistrering korrigert|Vanregistrering korrigerad|Vaneregistrering rettet
event_GoalProgressRecorded|Målfremgang registrert|Målframsteg registrerat|Målfremskridt registreret
event_GoalCompleted|Mål fullført|Mål slutfört|Mål fuldført
event_LevelReached|Nytt nivå nådd|Ny nivå nådd|Nyt niveau nået
event_RewardClaimed|Belønning hentet|Belöning hämtad|Belønning hentet
event_FocusCompleted|Fokus fullført|Fokus slutfört|Fokus fuldført
event_FocusStopped|Fokus stoppet|Fokus stoppat|Fokus stoppet
event_FocusCancelled|Fokus avbrutt|Fokus avbrutet|Fokus annulleret
event_MissionChanged|Hovedoppgave endret|Huvuduppgift ändrad|Hovedopgave ændret
error_credentials|Innlogging mislyktes. Kontroller e-post og passord, eller vent noen minutter før du prøver igjen.|Inloggningen misslyckades. Kontrollera e-post och lösenord, eller vänta några minuter innan du försöker igen.|Login mislykkedes. Kontrollér e-mail og adgangskode, eller vent et par minutter, før du prøver igen.
error_secure|Forespørselen kunne ikke bekreftes sikkert. Last siden på nytt og prøv igjen.|Förfrågan kunde inte verifieras säkert. Ladda om sidan och försök igen.|Forespørgslen kunne ikke bekræftes sikkert. Genindlæs siden, og prøv igen.
error_expired|Økten er utløpt. Logg inn igjen.|Sessionen har gått ut. Logga in igen.|Sessionen er udløbet. Log ind igen.
error_denied|Tilgang ble avvist. Last siden på nytt og prøv igjen.|Åtkomst nekades. Ladda om sidan och försök igen.|Adgang blev afvist. Genindlæs siden, og prøv igen.
error_missing|Fant ikke innholdet. Gå tilbake til listen og prøv igjen.|Innehållet hittades inte. Gå tillbaka till listan och försök igen.|Indholdet blev ikke fundet. Gå tilbage til listen, og prøv igen.
error_conflict|Handlingen passer ikke med gjeldende status. Last inn de nyeste dataene og kontroller dato, plan eller fullføring før du prøver igjen.|Åtgärden stämmer inte med aktuell status. Läs in senaste data och kontrollera datum, schema eller slutförande innan du försöker igen.|Handlingen passer ikke med den aktuelle status. Indlæs de nyeste data, og kontrollér dato, plan eller fuldførelse, før du prøver igen.
error_rate|For mange forespørsler. Vent et minutt og prøv igjen.|För många förfrågningar. Vänta en minut och försök igen.|For mange forespørgsler. Vent et minut, og prøv igen.
error_validation|Kunne ikke lagre. Kontroller påkrevde felt, tallgrenser og datoer. Planendringer må begynne i fremtiden.|Kunde inte spara. Kontrollera obligatoriska fält, talgränser och datum. Schemaändringar måste börja i framtiden.|Kunne ikke gemme. Kontrollér påkrævede felter, talgrænser og datoer. Planændringer skal begynde i fremtiden.
error_server|Tjenesten er midlertidig utilgjengelig. Prøv igjen om litt.|Tjänsten är tillfälligt otillgänglig. Försök igen om en stund.|Tjenesten er midlertidigt utilgængelig. Prøv igen om lidt.
error_connection|Kunne ikke koble til tjenesten. Sjekk tilkoblingen og prøv igjen.|Kunde inte ansluta till tjänsten. Kontrollera anslutningen och försök igen.|Kunne ikke oprette forbindelse til tjenesten. Kontrollér forbindelsen, og prøv igen.
field_email|Skriv inn en gyldig e-postadresse.|Ange en giltig e-postadress.|Indtast en gyldig e-mailadresse.
field_required|Fyll ut dette feltet med en gyldig verdi.|Fyll i fältet med ett giltigt värde.|Udfyld feltet med en gyldig værdi.
field_number|Skriv inn et gyldig tall mellom {min} og {max}.|Ange ett giltigt tal mellan {min} och {max}.|Indtast et gyldigt tal mellem {min} og {max}.
field_length|Teksten er for lang. Forkort den og prøv igjen.|Texten är för lång. Korta ned den och försök igen.|Teksten er for lang. Forkort den, og prøv igen.
area_fitness|Helse og trening|Hälsa och träning|Sundhed og træning
area_university|Universitet|Universitet|Universitet
area_career|Arbeid og karriere|Arbete och karriär|Arbejde og karriere
area_finance|Økonomi|Ekonomi|Økonomi
area_home|Hjem og planter|Hem och växter|Hjem og planter
area_style|Stil|Stil|Stil
area_food|Mat og matlaging|Mat och matlagning|Mad og madlavning
area_creative|Kreativitet|Kreativitet|Kreativitet
area_travel|Reise|Resor|Rejser
area_personal|Personlig|Personligt|Personligt
Energy, movement and feeling well.|Energi, bevegelse og velvære.|Energi, rörelse och välmående.|Energi, bevægelse og velvære.
Learning, curiosity and academic life.|Læring, nysgjerrighet og studieliv.|Lärande, nyfikenhet och studieliv.|Læring, nysgerrighed og studieliv.
Meaningful work and what comes next.|Meningsfullt arbeid og veien videre.|Meningsfullt arbete och vägen framåt.|Meningsfuldt arbejde og vejen videre.
Clarity and intention with money.|Oversikt og bevisste pengevalg.|Överblick och medvetna val med pengar.|Overblik og bevidste valg med penge.
Care for the spaces you call home.|Omsorg for stedene du kaller hjem.|Omsorg om platserna du kallar hem.|Omsorg for de steder, du kalder hjem.
How you choose to express yourself.|Slik du velger å uttrykke deg.|Hur du väljer att uttrycka dig.|Sådan vælger du at udtrykke dig.
Nourishment and the joy of cooking.|Næring og matglede.|Näring och matglädje.|Næring og madglæde.
Ideas, experiments and things you make.|Ideer, eksperimenter og ting du skaper.|Idéer, experiment och saker du skapar.|Idéer, eksperimenter og ting, du skaber.
Places to discover and experiences to plan.|Steder å oppdage og opplevelser å planlegge.|Platser att upptäcka och upplevelser att planera.|Steder at opdage og oplevelser at planlægge.
The things that are simply yours.|Det som er helt ditt eget.|Det som är helt ditt eget.|Det, der er helt dit eget.
(required)| (påkrevd)| (obligatoriskt)| (påkrævet)
A few minutes of something meaningful is enough to begin.|Noen minutter med noe meningsfullt er nok til å begynne.|Några minuter med något meningsfullt räcker för att börja.|Et par minutter med noget meningsfuldt er nok til at begynde.
A little context, a clear next step…|Litt sammenheng, et tydelig neste steg…|Lite sammanhang, ett tydligt nästa steg…|Lidt sammenhæng, et tydeligt næste skridt…
A meaningful part of your life.|En meningsfull del av livet ditt.|En meningsfull del av ditt liv.|En meningsfuld del af dit liv.
A personal space to turn plans into action and preserve your progress over time.|Et personlig sted for å gjøre planer til handling og ta vare på fremgangen over tid.|En personlig plats för att omsätta planer i handling och bevara dina framsteg över tid.|Et personligt sted til at omsætte planer til handling og bevare dine fremskridt over tid.
A place for everything on your mind. Choose a day to turn a thought into a commitment.|Et sted for alt du tenker på. Velg en dag for å gjøre en tanke til en plan.|En plats för allt du tänker på. Välj en dag för att göra en tanke till en plan.|Et sted til alt det, du tænker på. Vælg en dag for at gøre en tanke til en plan.
A place to begin|Et sted å begynne|En plats att börja|Et sted at begynde
A routine to repeat.|En rutine å gjenta.|En rutin att upprepa.|En rutine at gentage.
Access to this workspace was denied.|Tilgang til arbeidsområdet ble avvist.|Åtkomst till arbetsytan nekades.|Adgang til arbejdsområdet blev afvist.
Active|Aktiv|Aktiv|Aktiv
Active focus time|Aktiv fokustid|Aktiv fokustid|Aktiv fokustid
Active habit|Aktiv vane|Aktiv vana|Aktiv vane
Activity|Aktivitet|Aktivitet|Aktivitet
Activity history|Aktivitetshistorikk|Aktivitetshistorik|Aktivitetshistorik
Activity type|Aktivitetstype|Aktivitetstyp|Aktivitetstype
Add a goal|Legg til et mål|Lägg till ett mål|Tilføj et mål
Add a habit|Legg til en vane|Lägg till en vana|Tilføj en vane
Add a task|Legg til en oppgave|Lägg till en uppgift|Tilføj en opgave
Add commitment|Legg til i planen|Lägg till i planen|Tilføj til planen
Add to Inbox|Legg i innboksen|Lägg i inkorgen|Tilføj til indbakken
Add to this day|Legg til denne dagen|Lägg till denna dag|Tilføj til denne dag
All activity|All aktivitet|All aktivitet|Al aktivitet
All activity →|All aktivitet →|All aktivitet →|Al aktivitet →
All areas|Alle områder|Alla områden|Alle områder
All habits →|Alle vaner →|Alla vanor →|Alle vaner →
All tasks|Alle oppgaver|Alla uppgifter|Alle opgaver
All unarchived|Alle uarkiverte|Alla oarkiverade|Alle ikke-arkiverede
An outcome to work toward.|Et resultat å arbeide mot.|Ett resultat att arbeta mot.|Et resultat at arbejde hen imod.
Application|Applikasjon|Applikation|Applikation
Archive goal|Arkiver mål|Arkivera mål|Arkivér mål
Archive habit|Arkiver vane|Arkivera vana|Arkivér vane
Archive reward|Arkiver belønning|Arkivera belöning|Arkivér belønning
Archive task|Arkiver oppgave|Arkivera uppgift|Arkivér opgave
Archive this goal|Arkiver dette målet|Arkivera detta mål|Arkivér dette mål
Archive this habit|Arkiver denne vanen|Arkivera denna vana|Arkivér denne vane
Archived|Arkivert|Arkiverad|Arkiveret
Archived goals|Arkiverte mål|Arkiverade mål|Arkiverede mål
Archived habits|Arkiverte vaner|Arkiverade vanor|Arkiverede vaner
Archived rewards|Arkiverte belønninger|Arkiverade belöningar|Arkiverede belønninger
Archived routine|Arkivert rutine|Arkiverad rutin|Arkiveret rutine
Archived · your plan is preserved.|Arkivert · planen din er bevart.|Arkiverad · din plan är bevarad.|Arkiveret · din plan er bevaret.
At your own pace|I ditt eget tempo|I din egen takt|I dit eget tempo
Back to LIFEMAXING|Tilbake til LIFEMAXING|Tillbaka till LIFEMAXING|Tilbage til LIFEMAXING
Baseline value|Startverdi|Utgångsvärde|Startværdi
Cancel plan|Avbryt plan|Avbryt plan|Annullér plan
Cancel session|Avbryt økt|Avbryt session|Annullér session
Cancelled · historical plan retained|Avbrutt · historisk plan bevart|Avbruten · historisk plan bevarad|Annulleret · historisk plan bevaret
Capture a task|Registrer en oppgave|Lägg till en uppgift|Tilføj en opgave
Capture a task, then choose when to do it. Add a routine or a goal when you need one.|Registrer en oppgave og velg når du vil gjøre den. Legg til en rutine eller et mål ved behov.|Lägg till en uppgift och välj när du vill göra den. Lägg till en rutin eller ett mål vid behov.|Tilføj en opgave, og vælg, hvornår du vil gøre den. Tilføj en rutine eller et mål efter behov.
Capture → organize → commit|Registrer → organiser → planlegg|Lägg till → ordna → planera|Tilføj → organisér → planlæg
Change future schedule|Endre fremtidig plan|Ändra framtida schema|Skift fremtidig plan
Change mission|Bytt hovedoppgave|Byt huvuduppgift|Skift hovedopgave
Changes saved.|Endringene er lagret.|Ändringarna har sparats.|Ændringerne er gemt.
Check again|Kontroller igjen|Kontrollera igen|Kontrollér igen
Checking your connection…|Kontrollerer tilkoblingen…|Kontrollerar anslutningen…|Kontrollerer forbindelsen…
Checking your session…|Kontrollerer økten…|Kontrollerar sessionen…|Kontrollerer sessionen…
Checking your workspace…|Kontrollerer arbeidsområdet…|Kontrollerar arbetsytan…|Kontrollerer arbejdsområdet…
Choose a future day after the latest schedule start. Existing dates retain their schedule.|Velg en fremtidig dag etter siste planstart. Eksisterende datoer beholder planen.|Välj en framtida dag efter senaste schemastart. Befintliga datum behåller sitt schema.|Vælg en fremtidig dag efter seneste planstart. Eksisterende datoer beholder deres plan.
Choose a main task or add a commitment for this day.|Velg en hovedoppgave eller legg en oppgave til denne dagen.|Välj en huvuduppgift eller lägg till en uppgift för denna dag.|Vælg en hovedopgave, eller tilføj en opgave til denne dag.
Choose a meaningful outcome. Track it with numbers or simply record what changed.|Velg et meningsfullt resultat. Følg det med tall eller noter hva som endret seg.|Välj ett meningsfullt resultat. Följ det med siffror eller anteckna vad som förändrades.|Vælg et meningsfuldt resultat. Følg det med tal, eller notér, hvad der ændrede sig.
Choose a mission|Velg en hovedoppgave|Välj en huvuduppgift|Vælg en hovedopgave
Choose a planned date to move a task out of Inbox.|Velg en plandato for å flytte oppgaven ut av innboksen.|Välj ett planerat datum för att flytta uppgiften ur inkorgen.|Vælg en planlagt dato for at flytte opgaven ud af indbakken.
Choose an active task|Velg en aktiv oppgave|Välj en aktiv uppgift|Vælg en aktiv opgave
Choose an area to work in. Edit its name, order or active status as your priorities change.|Velg et område å arbeide med. Endre navn, rekkefølge eller aktiv status når prioriteringene endres.|Välj ett område att arbeta med. Ändra namn, ordning eller aktiv status när dina prioriteringar förändras.|Vælg et område at arbejde med. Skift navn, rækkefølge eller aktiv status, når dine prioriteter ændrer sig.
Choose an existing task or add something new. Your other work is still in Tasks.|Velg en eksisterende oppgave eller legg til noe nytt. Resten finner du under Oppgaver.|Välj en befintlig uppgift eller lägg till något nytt. Resten finns under Uppgifter.|Vælg en eksisterende opgave, eller tilføj noget nyt. Resten findes under Opgaver.
Choose something meaningful to you. Claim it once you reach this level; no XP is spent.|Velg noe som betyr noe for deg. Hent belønningen når du når nivået; ingen XP brukes.|Välj något som betyder något för dig. Hämta belöningen när du når nivån; inga XP förbrukas.|Vælg noget, der betyder noget for dig. Hent belønningen, når du når niveauet; ingen XP bruges.
Choose the task to do first.|Velg oppgaven du vil gjøre først.|Välj uppgiften du vill göra först.|Vælg den opgave, du vil gøre først.
Choose what deserves your attention right now.|Velg hva som fortjener oppmerksomheten din nå.|Välj vad som förtjänar din uppmärksamhet just nu.|Vælg, hvad der fortjener din opmærksomhed lige nu.
Choose your next action. Plan it, complete it, or pick up where you left off.|Velg neste handling. Planlegg den, fullfør den eller fortsett der du slapp.|Välj nästa handling. Planera den, slutför den eller fortsätt där du slutade.|Vælg næste handling. Planlæg den, fuldfør den, eller fortsæt, hvor du slap.
Claim reward|Hent belønning|Hämta belöning|Hent belønning
Claimed|Hentet|Hämtad|Hentet
Clear mission|Fjern hovedoppgave|Ta bort huvuduppgift|Fjern hovedopgave
Close dialog|Lukk dialog|Stäng dialog|Luk dialog
Commit to this day|Planlegg denne dagen|Planera denna dag|Planlæg denne dag
Complete|Fullfør|Slutför|Fuldfør
Complete mission|Fullfør hovedoppgave|Slutför huvuduppgift|Fuldfør hovedopgave
Complete task|Fullfør oppgave|Slutför uppgift|Fuldfør opgave
Complete task & finish|Fullfør oppgave og økt|Slutför uppgift och session|Fuldfør opgave og session
Complete your daily routines, then review or adjust what comes next.|Gjør dagens rutiner og se over eller juster det som kommer.|Gör dagens rutiner och granska eller justera det som kommer.|Udfør dagens rutiner, og gennemgå eller tilpas det næste.
Completed|Fullført|Slutförd|Fuldført
Completed & changed plans ·|Fullførte og endrede planer ·|Slutförda och ändrade planer ·|Fuldførte og ændrede planer ·
Completed work, corrections, focus and claimed rewards will appear here.|Fullført arbeid, korrigeringer, fokus og hentede belønninger vises her.|Slutfört arbete, korrigeringar, fokus och hämtade belöningar visas här.|Fuldført arbejde, rettelser, fokus og hentede belønninger vises her.
Completion and progress|Fullføring og fremgang|Slutförande och framsteg|Fuldførelse og fremskridt
Completion date|Fullføringsdato|Slutförandedatum|Fuldførelsesdato
Completion log|Fullføringslogg|Slutförandelogg|Fuldførelseslog
Connect it to your life|Knytt det til livet ditt|Koppla det till ditt liv|Knyt det til dit liv
Connected|Tilkoblet|Ansluten|Forbundet
Connection status|Tilkoblingsstatus|Anslutningsstatus|Forbindelsesstatus
Create|Opprett|Skapa|Opret
Create a goal|Opprett et mål|Skapa ett mål|Opret et mål
Create a habit|Opprett en vane|Skapa en vana|Opret en vane
Create goal|Opprett mål|Skapa mål|Opret mål
Create habit|Opprett vane|Skapa vana|Opret vane
Create reward|Opprett belønning|Skapa belöning|Opret belønning
Create task|Opprett oppgave|Skapa uppgift|Opret opgave
Create task with details →|Opprett oppgave med detaljer →|Skapa uppgift med detaljer →|Opret opgave med detaljer →
Create your next action, or adjust the filters to find earlier work.|Opprett neste handling, eller juster filtrene for å finne tidligere arbeid.|Skapa nästa handling eller justera filtren för att hitta tidigare arbete.|Opret næste handling, eller tilpas filtrene for at finde tidligere arbejde.
Creates a daily commitment. Leave empty for Inbox.|Legger oppgaven i dagsplanen. La stå tomt for innboksen.|Lägger uppgiften i dagsplanen. Lämna tomt för inkorgen.|Tilføjer opgaven til dagsplanen. Lad feltet stå tomt for indbakken.
Current focus|Nåværende fokus|Aktuellt fokus|Aktuelt fokus
Current goals|Nåværende mål|Aktuella mål|Aktuelle mål
Current habits|Nåværende vaner|Aktuella vanor|Aktuelle vaner
Current rewards|Nåværende belønninger|Aktuella belöningar|Aktuelle belønninger
Daily Mission|Dagens hovedoppgave|Dagens huvuduppgift|Dagens hovedopgave
Daily commitments|Dagsplan|Dagsplan|Dagsplan
Daily habit awards share a 75 XP cap.|Dagens vaner deler en grense på 75 XP.|Dagens vanor delar en gräns på 75 XP.|Dagens vaner deler en grænse på 75 XP.
Daily habits and progress|Dagens vaner og fremgang|Dagens vanor och framsteg|Dagens vaner og fremskridt
Daily plan|Dagsplan|Dagsplan|Dagsplan
Daily practice|Daglig praksis|Daglig övning|Daglig praksis
Database|Database|Databas|Database
Decrease|Reduser|Minska|Reducér
Define a reward|Definer en belønning|Definiera en belöning|Definér en belønning
Define a reward and the level that makes it available.|Definer en belønning og nivået som gjør den tilgjengelig.|Definiera en belöning och nivån som gör den tillgänglig.|Definér en belønning og det niveau, der gør den tilgængelig.
Define the action|Definer handlingen|Definiera handlingen|Definér handlingen
Define the next useful action.|Definer neste nyttige handling.|Definiera nästa användbara handling.|Definér næste nyttige handling.
Description|Beskrivelse|Beskrivning|Beskrivelse
Details|Detaljer|Detaljer|Detaljer
Direction|Retning|Riktning|Retning
Direction and progress|Retning og fremgang|Riktning och framsteg|Retning og fremskridt
Display name|Visningsnavn|Visningsnamn|Visningsnavn
Due|Frist|Förfaller|Frist
Due date|Fristdato|Förfallodatum|Fristdato
Earlier plans & due dates|Tidligere planer og frister|Tidigare planer och förfallodatum|Tidligere planer og frister
Edit Life Area|Rediger livsområde|Redigera livsområde|Redigér livsområde
Edit goal|Rediger mål|Redigera mål|Redigér mål
Edit habit|Rediger vane|Redigera vana|Redigér vane
Edit reward|Rediger belønning|Redigera belöning|Redigér belønning
Email|E-post|E-post|E-mail
Empty day|Tom dag|Tom dag|Tom dag
End without completing|Avslutt uten å fullføre|Avsluta utan att slutföra|Afslut uden at fuldføre
Estimate (minutes)|Anslag (minutter)|Uppskattning (minuter)|Estimat (minutter)
Every day|Hver dag|Varje dag|Hver dag
Every step has a place|Hvert steg har sin plass|Varje steg har sin plats|Hvert skridt har sin plads
Explore your habits|Utforsk vanene dine|Utforska dina vanor|Udforsk dine vaner
Find a task|Finn en oppgave|Hitta en uppgift|Find en opgave
Find a task to focus on|Finn en oppgave å fokusere på|Hitta en uppgift att fokusera på|Find en opgave at fokusere på
Find an action…|Finn en handling…|Hitta en handling…|Find en handling…
Find the tasks, goals and routines that belong to each part of your life.|Finn oppgavene, målene og rutinene som hører til hver del av livet ditt.|Hitta uppgifterna, målen och rutinerna som hör till varje del av ditt liv.|Find de opgaver, mål og rutiner, der hører til hver del af dit liv.
Finish session|Avslutt økt|Avsluta session|Afslut session
Focus|Fokus|Fokus|Fokus
Focus on this task|Fokuser på oppgaven|Fokusera på uppgiften|Fokusér på opgaven
Focus started.|Fokus startet.|Fokus startat.|Fokus startet.
Focus task|Fokusoppgave|Fokusuppgift|Fokusopgave
Focus updated.|Fokus oppdatert.|Fokus uppdaterat.|Fokus opdateret.
For today|For i dag|För idag|Til i dag
From|Fra|Från|Fra
From intention to action|Fra intensjon til handling|Från avsikt till handling|Fra intention til handling
Future schedule saved.|Fremtidig plan lagret.|Framtida schema sparat.|Fremtidig plan gemt.
Get started|Kom i gang|Kom igång|Kom i gang
Give this action a place in your day.|Gi handlingen plass i dagen din.|Ge handlingen plats i din dag.|Giv handlingen plads i din dag.
Go to today|Gå til i dag|Gå till idag|Gå til i dag
Goal|Mål|Mål|Mål
Goal list|Målliste|Mållista|Målliste
Goal saved.|Mål lagret.|Mål sparat.|Mål gemt.
Goal state|Målstatus|Målstatus|Målstatus
Goal title|Måltittel|Måltitel|Måltitel
Goal type|Måltype|Måltyp|Måltype
Goal:|Mål:|Mål:|Mål:
Goals|Mål|Mål|Mål
Goals →|Mål →|Mål →|Mål →
Habit|Vane|Vana|Vane
Habit completion|Vanefullføring|Vana slutförd|Vane fuldført
Habit completions|Fullførte vaner|Slutförda vanor|Fuldførte vaner
Habit library|Vanebibliotek|Vanbibliotek|Vanebibliotek
Habit list|Vaneliste|Vanlista|Vaneliste
Habit saved.|Vane lagret.|Vana sparad.|Vane gemt.
Habit title|Vanetittel|Vantitel|Vanetitel
Habits|Vaner|Vanor|Vaner
Habits today|Vaner i dag|Vanor idag|Vaner i dag
Habits →|Vaner →|Vanor →|Vaner →
Hide password|Skjul passord|Dölj lösenord|Skjul adgangskode
High priority|Høy prioritet|Hög prioritet|Høj prioritet
In progress|Pågår|Pågår|I gang
Inactive|Inaktiv|Inaktiv|Inaktiv
Inactive routine|Inaktiv rutine|Inaktiv rutin|Inaktiv rutine
Inbox|Innboks|Inkorg|Indbakke
Increase|Øk|Öka|Øg
Keep me signed in on this device|Hold meg innlogget på denne enheten|Håll mig inloggad på den här enheten|Hold mig logget ind på denne enhed
Last recorded|Sist registrert|Senast registrerat|Senest registreret
Level|Nivå|Nivå|Niveau
Life Area|Livsområde|Livsområde|Livsområde
Life Area filter|Filtrer livsområde|Filtrera livsområde|Filtrér livsområde
Life Areas|Livsområder|Livsområden|Livsområder
Linked goal|Tilknyttet mål|Kopplat mål|Tilknyttet mål
Linked goal (outside this page)|Tilknyttet mål (utenfor denne siden)|Kopplat mål (utanför denna sida)|Tilknyttet mål (uden for denne side)
List pages|Listesider|Listsidor|Listesider
Loading|Laster|Läser in|Indlæser
Loading…|Laster…|Läser in…|Indlæser…
Log a scheduled day after you have done the habit.|Registrer en planlagt dag etter at du har utført vanen.|Registrera en planerad dag när du har gjort vanan.|Registrér en planlagt dag, når du har udført vanen.
Log completion|Registrer fullføring|Registrera slutförande|Registrér fuldførelse
Main navigation|Hovednavigasjon|Huvudnavigering|Hovednavigation
Make a plan|Lag en plan|Gör en plan|Lav en plan
Make room for something good|Gi plass til noe godt|Gör plats för något bra|Giv plads til noget godt
Make room for what matters.|Gi plass til det som betyr noe.|Gör plats för det som betyder något.|Giv plads til det, der betyder noget.
Measured · numeric progress|Målbart · fremgang i tall|Mätbart · numeriska framsteg|Målbart · fremskridt i tal
Mission completed.|Hovedoppgaven er fullført.|Huvuduppgiften är slutförd.|Hovedopgaven er fuldført.
Mobile navigation|Mobilnavigasjon|Mobilnavigering|Mobilnavigation
More destinations|Flere sider|Fler sidor|Flere sider
More details|Flere detaljer|Fler detaljer|Flere detaljer
Needs attention|Trenger oppmerksomhet|Behöver uppmärksamhet|Kræver opmærksomhed
New goal|Nytt mål|Nytt mål|Nyt mål
New habit|Ny vane|Ny vana|Ny vane
New reward|Ny belønning|Ny belöning|Ny belønning
New schedules begin on a future day. Your earlier routine stays on record.|Nye planer begynner en fremtidig dag. Den tidligere rutinen beholdes i historikken.|Nya scheman börjar en framtida dag. Den tidigare rutinen bevaras i historiken.|Nye planer begynder en fremtidig dag. Den tidligere rutine bevares i historikken.
New task|Ny oppgave|Ny uppgift|Ny opgave
Next|Neste|Nästa|Næste
No Life Areas are available for this account.|Ingen livsområder er tilgjengelige for denne kontoen.|Inga livsområden är tillgängliga för kontot.|Ingen livsområder er tilgængelige for denne konto.
No XP entries yet. Start with one useful action.|Ingen XP-registreringer ennå. Begynn med én nyttig handling.|Inga XP-poster ännu. Börja med en användbar handling.|Ingen XP-registreringer endnu. Begynd med én nyttig handling.
No active tasks. Add a task using Quick Add.|Ingen aktive oppgaver. Bruk Legg til for å opprette en.|Inga aktiva uppgifter. Använd Lägg till för att skapa en.|Ingen aktive opgaver. Brug Tilføj for at oprette en.
No area|Uten område|Utan område|Uden område
No goal|Uten mål|Utan mål|Uden mål
No habits are scheduled for this day.|Ingen vaner er planlagt denne dagen.|Inga vanor är planerade denna dag.|Ingen vaner er planlagt denne dag.
No habits scheduled for this day.|Ingen vaner planlagt denne dagen.|Inga vanor planerade denna dag.|Ingen vaner planlagt denne dag.
No matching tasks|Ingen passende oppgaver|Inga matchande uppgifter|Ingen matchende opgaver
No other tasks planned.|Ingen andre oppgaver er planlagt.|Inga andra uppgifter är planerade.|Ingen andre opgaver er planlagt.
No tasks in this view|Ingen oppgaver i denne visningen|Inga uppgifter i denna vy|Ingen opgaver i denne visning
No tasks match this search.|Ingen oppgaver passer søket.|Inga uppgifter matchar sökningen.|Ingen opgaver matcher søgningen.
No tasks planned for this day.|Ingen oppgaver er planlagt denne dagen.|Inga uppgifter är planerade denna dag.|Ingen opgaver er planlagt denne dag.
No updates yet. Add your first progress note.|Ingen oppdateringer ennå. Legg til ditt første fremgangsnotat.|Inga uppdateringar ännu. Lägg till din första framstegsanteckning.|Ingen opdateringer endnu. Tilføj din første fremskridtsnote.
Not configured|Ikke konfigurert|Inte konfigurerat|Ikke konfigureret
Nothing planned for this day|Ingenting planlagt denne dagen|Ingenting planerat denna dag|Intet planlagt denne dag
One session at a time. Pause whenever you need to. Focus minutes are recorded, but do not earn XP.|Én økt om gangen. Ta pause når du trenger det. Fokusminutter registreres, men gir ikke XP.|En session i taget. Pausa när du behöver. Fokusminuter registreras men ger inga XP.|Én session ad gangen. Hold pause efter behov. Fokusminutter registreres, men giver ikke XP.
One thing at a time|Én ting om gangen|En sak i taget|Én ting ad gangen
Open your tasks, habits and daily plan.|Åpne oppgavene, vanene og dagsplanen din.|Öppna dina uppgifter, vanor och din dagsplan.|Åbn dine opgaver, vaner og din dagsplan.
Organize → commit → complete|Organiser → planlegg → fullfør|Ordna → planera → slutför|Organisér → planlæg → fuldfør
Overdue|Forfalt|Försenad|Overskredet
Page|Side|Sida|Side
Page not found|Fant ikke siden|Sidan hittades inte|Siden blev ikke fundet
Password|Passord|Lösenord|Adgangskode
Pause focus|Sett fokus på pause|Pausa fokus|Sæt fokus på pause
Paused · time is not counting|Pauset · tiden telles ikke|Pausad · tiden räknas inte|På pause · tiden tæller ikke
Personal incentives, chosen by you.|Personlige belønninger du velger selv.|Personliga belöningar som du väljer själv.|Personlige belønninger, du selv vælger.
Plan a future rhythm|Planlegg en fremtidig rytme|Planera en framtida rytm|Planlæg en fremtidig rytme
Plan a task|Planlegg en oppgave|Planera en uppgift|Planlæg en opgave
Plan and do|Planlegg og gjør|Planera och gör|Planlæg og gør
Plan date|Plandato|Plandatum|Plandato
Plan this day|Planlegg denne dagen|Planera denna dag|Planlæg denne dag
Planned|Planlagt|Planerad|Planlagt
Planned date|Planlagt dato|Planerat datum|Planlagt dato
Planned in advance|Planlagt på forhånd|Planerat i förväg|Planlagt på forhånd
Planned on this day|Planlagt denne dagen|Planerat denna dag|Planlagt denne dag
Planned tasks|Planlagte oppgaver|Planerade uppgifter|Planlagte opgaver
Plans and completion history are preserved.|Planer og fullføringshistorikk beholdes.|Planer och slutförandehistorik bevaras.|Planer og fuldførelseshistorik bevares.
Previous|Forrige|Föregående|Forrige
Priority|Prioritet|Prioritet|Prioritet
Progress|Fremgang|Framsteg|Fremskridt
Progress history|Fremgangshistorikk|Framstegshistorik|Fremskridtshistorik
Progress note|Fremgangsnotat|Framstegsanteckning|Fremskridtsnote
Progress recorded.|Fremgang registrert.|Framsteg registrerat.|Fremskridt registreret.
Progress to next level|Fremgang mot neste nivå|Framsteg mot nästa nivå|Fremskridt mod næste niveau
Progress with intention|Fremgang med mening|Framsteg med mening|Fremskridt med mening
Qualitative progress|Kvalitativ fremgang|Kvalitativa framsteg|Kvalitative fremskridt
Qualitative · progress notes|Kvalitativt · fremgangsnotater|Kvalitativt · framstegsanteckningar|Kvalitativt · fremskridtsnoter
Quick Add|Legg til|Lägg till|Tilføj
Ready to claim|Klar til å hentes|Redo att hämtas|Klar til at hente
Recent activity|Nylig aktivitet|Senaste aktivitet|Seneste aktivitet
Recently done|Nylig utført|Nyligen gjort|Senest udført
Record an update|Registrer en oppdatering|Registrera en uppdatering|Registrér en opdatering
Record progress|Registrer fremgang|Registrera framsteg|Registrér fremskridt
Record where you are now. To correct an earlier update, add a new entry.|Registrer hvor du er nå. Legg til en ny registrering for å korrigere en tidligere oppdatering.|Registrera var du är nu. Lägg till en ny post för att korrigera en tidigare uppdatering.|Registrér, hvor du er nu. Tilføj en ny registrering for at rette en tidligere opdatering.
Recorded focus minutes|Registrerte fokusminutter|Registrerade fokusminuter|Registrerede fokusminutter
Reopen|Gjenåpne|Öppna igen|Genåbn
Reopen mission|Gjenåpne hovedoppgave|Öppna huvuduppgiften igen|Genåbn hovedopgave
Reopen task|Gjenåpne oppgave|Öppna uppgiften igen|Genåbn opgave
Resume focus|Fortsett fokus|Återuppta fokus|Genoptag fokus
Return to focus →|Tilbake til fokus →|Tillbaka till fokus →|Tilbage til fokus →
Reversed|Tilbakeført|Återförd|Tilbageført
Reward list|Belønningsliste|Belöningslista|Belønningsliste
Reward title|Belønningstittel|Belöningstitel|Belønningstitel
Rewards|Belønninger|Belöningar|Belønninger
Room for a small routine|Plass til en liten rutine|Plats för en liten rutin|Plads til en lille rutine
Save changes|Lagre endringer|Spara ändringar|Gem ændringer
Save future schedule|Lagre fremtidig plan|Spara framtida schema|Gem fremtidig plan
Save goal|Lagre mål|Spara mål|Gem mål
Save habit|Lagre vane|Spara vana|Gem vane
Save reward|Lagre belønning|Spara belöning|Gem belønning
Save task|Lagre oppgave|Spara uppgift|Gem opgave
Schedule history|Planhistorikk|Schemahistorik|Planhistorik
Schedule pattern|Planmønster|Schemamönster|Planmønster
Schedule starts|Planen starter|Schemat börjar|Planen starter
Schedules and completions stay in your history.|Planer og fullføringer beholdes i historikken.|Scheman och slutföranden bevaras i historiken.|Planer og fuldførelser bevares i historikken.
Search tasks|Søk i oppgaver|Sök bland uppgifter|Søg i opgaver
Selected task|Valgt oppgave|Vald uppgift|Valgt opgave
Selected weekdays|Valgte ukedager|Valda veckodagar|Valgte ugedage
Session recorded.|Økten er registrert.|Sessionen har registrerats.|Sessionen er registreret.
Set Daily Mission|Velg dagens hovedoppgave|Välj dagens huvuduppgift|Vælg dagens hovedopgave
Set your first goal|Sett ditt første mål|Sätt ditt första mål|Sæt dit første mål
Show password|Vis passord|Visa lösenord|Vis adgangskode
Show up, record it, and keep going.|Møt opp, registrer det og fortsett.|Dyk upp, registrera det och fortsätt.|Mød op, registrér det, og fortsæt.
Sign in|Logg inn|Logga in|Log ind
Skip to content|Hopp til innhold|Hoppa till innehåll|Spring til indhold
Something to look forward to|Noe å se frem til|Något att se fram emot|Noget at se frem til
Something you want to get done.|Noe du vil få gjort.|Något du vill få gjort.|Noget, du vil have gjort.
Sort order|Sorteringsrekkefølge|Sorteringsordning|Sorteringsrækkefølge
Start a session|Start en økt|Starta en session|Start en session
Start focus|Start fokus|Starta fokus|Start fokus
Start today or later. Future schedule changes preserve this initial plan.|Start i dag eller senere. Fremtidige planendringer bevarer denne opprinnelige planen.|Börja idag eller senare. Framtida schemaändringar bevarar denna ursprungliga plan.|Start i dag eller senere. Fremtidige planændringer bevarer denne oprindelige plan.
Start with one task|Begynn med én oppgave|Börja med en uppgift|Begynd med én opgave
Start with something small|Begynn med noe lite|Börja med något litet|Begynd med noget småt
Starting point · no updates yet|Utgangspunkt · ingen oppdateringer ennå|Utgångspunkt · inga uppdateringar ännu|Udgangspunkt · ingen opdateringer endnu
Stop session|Stopp økt|Stoppa session|Stop session
Stop to keep recorded focus time, or cancel to exclude it from your focus total. The session stays in history.|Stopp for å beholde registrert fokustid, eller avbryt for å utelate den fra totalen. Økten beholdes i historikken.|Stoppa för att behålla registrerad fokustid eller avbryt för att utesluta den från totalen. Sessionen bevaras i historiken.|Stop for at beholde registreret fokustid, eller annullér for at udelade den fra totalen. Sessionen bevares i historikken.
Target date|Måldato|Måldatum|Måldato
Target value|Målverdi|Målvärde|Målværdi
Task|Oppgave|Uppgift|Opgave
Task captured.|Oppgaven er registrert.|Uppgiften har lagts till.|Opgaven er tilføjet.
Task completion|Oppgavefullføring|Uppgift slutförd|Opgave fuldført
Task details|Oppgavedetaljer|Uppgiftsdetaljer|Opgavedetaljer
Task details →|Oppgavedetaljer →|Uppgiftsdetaljer →|Opgavedetaljer →
Task saved.|Oppgaven er lagret.|Uppgiften har sparats.|Opgaven er gemt.
Task size|Oppgavestørrelse|Uppgiftsstorlek|Opgavestørrelse
Task status|Oppgavestatus|Uppgiftsstatus|Opgavestatus
Task title|Oppgavetittel|Uppgiftstitel|Opgavetitel
Task to plan|Oppgave å planlegge|Uppgift att planera|Opgave at planlægge
Task views|Oppgavevisninger|Uppgiftsvyer|Opgavevisninger
Task workspace|Oppgaveområde|Uppgiftsyta|Opgaveområde
Tasks|Oppgaver|Uppgifter|Opgaver
Tasks completed|Fullførte oppgaver|Slutförda uppgifter|Fuldførte opgaver
Tasks →|Oppgaver →|Uppgifter →|Opgaver →
This goal is archived. Its progress history is preserved.|Målet er arkivert. Fremgangshistorikken er bevart.|Målet är arkiverat. Framstegshistoriken är bevarad.|Målet er arkiveret. Fremskridtshistorikken er bevaret.
This habit is archived. Its schedules and logs are preserved.|Vanen er arkivert. Planer og logger er bevart.|Vanan är arkiverad. Scheman och loggar är bevarade.|Vanen er arkiveret. Planer og logge er bevaret.
This page is not available.|Denne siden er ikke tilgjengelig.|Den här sidan är inte tillgänglig.|Denne side er ikke tilgængelig.
This routine is inactive. Edit the habit to start logging again.|Rutinen er inaktiv. Rediger vanen for å registrere igjen.|Rutinen är inaktiv. Redigera vanan för att registrera igen.|Rutinen er inaktiv. Redigér vanen for at registrere igen.
This task is already complete. You can finish this session without another XP award.|Oppgaven er allerede fullført. Du kan avslutte økten uten en ny XP-tildeling.|Uppgiften är redan slutförd. Du kan avsluta sessionen utan en ny XP-tilldelning.|Opgaven er allerede fuldført. Du kan afslutte sessionen uden en ny XP-tildeling.
This task is archived. End this session without completing the task.|Oppgaven er arkivert. Avslutt økten uten å fullføre oppgaven.|Uppgiften är arkiverad. Avsluta sessionen utan att slutföra uppgiften.|Opgaven er arkiveret. Afslut sessionen uden at fuldføre opgaven.
This task is archived. Its plans and completions are retained.|Oppgaven er arkivert. Planer og fullføringer er bevart.|Uppgiften är arkiverad. Planer och slutföranden är bevarade.|Opgaven er arkiveret. Planer og fuldførelser er bevaret.
Times per week|Ganger per uke|Gånger per vecka|Gange om ugen
Title|Tittel|Titel|Titel
Today|I dag|Idag|I dag
Today's habits|Dagens vaner|Dagens vanor|Dagens vaner
Too many requests. Wait a minute, then try again.|For mange forespørsler. Vent et minutt og prøv igjen.|För många förfrågningar. Vänta en minut och försök igen.|For mange forespørgsler. Vent et minut, og prøv igen.
Track the outcomes you care about and record your next step.|Følg resultatene du bryr deg om og registrer neste steg.|Följ resultaten du bryr dig om och registrera nästa steg.|Følg de resultater, du går op i, og registrér næste skridt.
Try again|Prøv igjen|Försök igen|Prøv igen
UTC|UTC|UTC|UTC
Unavailable|Utilgjengelig|Otillgänglig|Utilgængelig
Undo completion|Angre fullføring|Ångra slutförande|Fortryd fuldførelse
Unit|Enhet|Enhet|Enhed
Unlock at level|Tilgjengelig på nivå|Tillgänglig på nivå|Tilgængelig på niveau
Unstructured focus|Fokus uten oppgave|Fokus utan uppgift|Fokus uden opgave
Up to 30 days. Use only on a device you trust.|Opptil 30 dager. Bruk bare på en enhet du stoler på.|Upp till 30 dagar. Använd bara på en enhet du litar på.|Op til 30 dage. Brug kun på en enhed, du stoler på.
View progress →|Se fremgang →|Se framsteg →|Se fremskridt →
We could not check your session. Check your connection and try again.|Kunne ikke kontrollere økten. Sjekk tilkoblingen og prøv igjen.|Kunde inte kontrollera sessionen. Kontrollera anslutningen och försök igen.|Kunne ikke kontrollere sessionen. Kontrollér forbindelsen, og prøv igen.
We could not confirm the connection. Please check that the services are running and try again.|Kunne ikke bekrefte tilkoblingen. Kontroller at tjenestene kjører og prøv igjen.|Kunde inte bekräfta anslutningen. Kontrollera att tjänsterna körs och försök igen.|Kunne ikke bekræfte forbindelsen. Kontrollér, at tjenesterne kører, og prøv igen.
Weekdays|Ukedager|Veckodagar|Ugedage
Weekly target|Ukemål|Veckomål|Ugemål
What needs doing?|Hva må gjøres?|Vad behöver göras?|Hvad skal gøres?
What would you like to move toward?|Hva vil du arbeide mot?|Vad vill du arbeta mot?|Hvad vil du arbejde hen imod?
What you did, and the corrections along the way.|Det du gjorde og korrigeringene underveis.|Det du gjorde och korrigeringarna längs vägen.|Det du gjorde og rettelserne undervejs.
XP|XP|XP|XP
XP ledger · awards and corrections|XP-logg · tildelinger og korrigeringer|XP-logg · tilldelningar och korrigeringar|XP-log · tildelinger og rettelser
XP per completion|XP per fullføring|XP per slutförande|XP pr. fuldførelse
XP recognises completion. It is never spent, and time alone does not earn points.|XP anerkjenner fullføring. Det brukes aldri opp, og tid alene gir ikke poeng.|XP belönar slutförande. Det förbrukas aldrig, och tid i sig ger inga poäng.|XP anerkender fuldførelse. Det bruges aldrig op, og tid alene giver ikke point.
XP toward level|XP mot nivå|XP mot nivå|XP mod niveau
XP ·|XP ·|XP ·|XP ·
XP.|XP.|XP.|XP.
Your Inbox is clear|Innboksen er tom|Inkorgen är tom|Indbakken er tom
Your Inbox is clear. Capture an idea whenever it comes to mind.|Innboksen er tom. Registrer en idé når den dukker opp.|Inkorgen är tom. Lägg till en idé när den dyker upp.|Indbakken er tom. Tilføj en idé, når den dukker op.
Your actions leave a record|Handlingene dine etterlater spor|Dina handlingar lämnar spår|Dine handlinger efterlader spor
Your daily rhythm|Din daglige rytme|Din dagliga rytm|Din daglige rytme
Your day|Dagen din|Din dag|Din dag
Your direction|Retningen din|Din riktning|Din retning
Your earned XP, completed work and recorded focus, with the history behind them.|Opptjent XP, fullført arbeid og registrert fokus, med historikken bak.|Intjänade XP, slutfört arbete och registrerat fokus, med historiken bakom.|Optjent XP, fuldført arbejde og registreret fokus med historikken bag.
Your first entry starts here|Din første registrering begynner her|Din första registrering börjar här|Din første registrering begynder her
Your first goal|Ditt første mål|Ditt första mål|Dit første mål
Your first habit|Din første vane|Din första vana|Din første vane
Your first task|Din første oppgave|Din första uppgift|Din første opgave
Your focus session is|Fokusøkten din er|Din fokussession är|Din fokussession er
Your life, organised|Livet ditt, organisert|Ditt liv, organiserat|Dit liv, organiseret
Your main task for this day.|Din viktigste oppgave denne dagen.|Din viktigaste uppgift denna dag.|Din vigtigste opgave denne dag.
Your planned work and habits are complete for this day.|Planlagt arbeid og vaner er fullført for denne dagen.|Planerat arbete och vanor är slutförda för denna dag.|Planlagt arbejde og vaner er fuldført for denne dag.
Your progress history will be preserved.|Fremgangshistorikken din beholdes.|Din framstegshistorik bevaras.|Din fremskridtshistorik bevares.
Your progress →|Fremgangen din →|Dina framsteg →|Dine fremskridt →
Your progression|Utviklingen din|Din utveckling|Din udvikling
Your record|Historikken din|Din historik|Din historik
Your rewards →|Belønningene dine →|Dina belöningar →|Dine belønninger →
Your rhythm over time|Rytmen din over tid|Din rytm över tid|Din rytme over tid
Your routines|Rutinene dine|Dina rutiner|Dine rutiner
Your session expired. Sign in again to continue.|Økten din utløp. Logg inn igjen for å fortsette.|Din session har gått ut. Logga in igen för att fortsätta.|Din session er udløbet. Log ind igen for at fortsætte.
Your session is saved. Pause or finish when you are ready.|Økten din er lagret. Ta pause eller avslutt når du er klar.|Din session är sparad. Pausa eller avsluta när du är redo.|Din session er gemt. Hold pause, eller afslut, når du er klar.
Your updates will build an honest record of the journey.|Oppdateringene dine bygger en ærlig historikk over reisen.|Dina uppdateringar bygger en ärlig historik över resan.|Dine opdateringer skaber en ærlig historik over rejsen.
Your workspace could not be checked.|Kunne ikke kontrollere arbeidsområdet.|Arbetsytan kunde inte kontrolleras.|Arbejdsområdet kunne ikke kontrolleres.
active areas|aktive områder|aktiva områden|aktive områder
could not be loaded.|kunne ikke lastes.|kunde inte läsas in.|kunne ikke indlæses.
done|utført|klart|udført
min|min|min|min
of|av|av|af
reached ·|nådd ·|nådd ·|nået ·
task|oppgave|uppgift|opgave
tasks|oppgaver|uppgifter|opgaver
toward|mot|mot|mod
unplanned|uplanlagt|oplanerade|ikke planlagt
· rules v|· regler v|· regler v|· regler v
← All goals|← Alle mål|← Alla mål|← Alle mål
← All habits|← Alle vaner|← Alla vanor|← Alle vaner
← All tasks|← Alle oppgaver|← Alla uppgifter|← Alle opgaver
← Return to Today|← Tilbake til i dag|← Tillbaka till idag|← Tilbage til i dag
`

const english = {
  ledgerEntry: '{amount} XP · {kind}', ledgerContext: '{kind} · {date} · rules v{version}',
  areaCount_tasks: '{count} tasks', areaCount_tasksOne: '{count} task', areaCount_goals: '{count} goals', areaCount_goalsOne: '{count} goal', areaCount_habits: '{count} habits', areaCount_habitsOne: '{count} habit', activeAreaCountOne: '{count} active area',
  taskCountOne: '{count} task · {status}', levelsRemainingOne: '{count} level remaining',
  weekLegend: 'Week status legend',
  captureDateHint: 'Choose a date for “Add to this day”. “Add to Inbox” always saves without a date.', dayStatus: '{done} of {total} tasks completed',
  taskCount: '{count} tasks · {status}', historyCount: 'Completed & changed plans · {count}',
  pageCount: 'Page {page} of {total}', levelReached: 'Level {level} reached · {rank}.', levelNumber: 'Level {level}', xpToward: '{current} / {total} XP toward level {level}',
  loadingSection: 'Loading {label}…', unavailableSection: '{label} could not be loaded.', goalLink: 'Goal: {title}', minutesCount: '{count} min', plannedOn: 'Planned {date}', dueOn: 'Due {date}', overdueOn: 'Overdue {date}',
  historyFor: 'History and settings for {title}', weeklyCount: '{count} / {target} this week', scheduleFrom: 'From {date} onward', scheduleUntil: 'From {from} until {to} (exclusive)', targetDateValue: 'Target date {date}', baselineValue: 'Baseline {value} {unit}', currentValue: 'Current value ({unit})', goalDirection: '{direction} toward {value} {unit}', goalPercent: '{percent}% from baseline toward target', goalMeter: '{title}: {percent}% from baseline toward target', lastUpdate: 'Last updated {date}', claimedOn: 'Claimed {date}', unlocksAt: 'Unlocks at level {level}', levelsRemaining: '{count} levels remaining', doneCount: '{done} of {total} done', focusStatus: 'Your focus session is {status}.', activeAreaCount: '{count} active areas', originalRecord: 'Original record (English)',
  event_TaskCompleted: 'Task completed', event_TaskReopened: 'Task reopened', event_HabitCompleted: 'Habit completed', event_HabitReversed: 'Habit corrected', event_GoalProgressRecorded: 'Goal progress recorded', event_GoalCompleted: 'Goal completed', event_LevelReached: 'Level reached', event_RewardClaimed: 'Reward claimed', event_FocusCompleted: 'Focus completed', event_FocusStopped: 'Focus stopped', event_FocusCancelled: 'Focus cancelled', event_MissionChanged: 'Mission changed',
  error_credentials: 'Sign-in failed. Check your email and password, or wait a few minutes before trying again.', error_secure: 'The request could not be verified securely. Reload the page and try again.', error_expired: 'Your session expired. Sign in again.', error_denied: 'Access was denied. Reload the page and try again.', error_missing: 'This item could not be found. Return to the list and try again.', error_conflict: 'This action conflicts with the current state. Reload the latest data and check the date, schedule or completion before trying again.', error_rate: 'Too many requests. Wait a minute, then try again.', error_validation: 'Could not save. Check required fields, number limits and dates. Schedule changes must begin in the future.', error_server: 'The server is temporarily unavailable. Try again shortly.', error_connection: 'Could not reach the server. Check your connection and try again.',
  field_email: 'Enter a valid email address.', field_required: 'Enter a valid value in this field.', field_number: 'Enter a valid number between {min} and {max}.', field_length: 'This text is too long. Shorten it and try again.',
  area_fitness: 'Health & Fitness', area_university: 'University', area_career: 'Work & Career', area_finance: 'Finance', area_home: 'Home & Plants', area_style: 'Style', area_food: 'Food & Cooking', area_creative: 'Creative', area_travel: 'Travel', area_personal: 'Personal',
}

export const catalog = Object.fromEntries(rows.trim().split('\n').map(row => {
  const values = row.split('|')
  if (values.length !== 4 || values.some(value => !value.trim())) throw new Error('Incomplete interface translation')
  return [values[0], [english[values[0]] || values[0], ...values.slice(1)]]
}))
