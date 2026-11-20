# Interiørapp v1 – høyoppløselig prototype

En «ChatGPT for interiør»: en AI-chat der brukerens faktiske rom er konteksten. Dette prosjektet er den
høyoppløselige versjonen av lo-fi-prototypen i `reference/lofi-v2/`.

Prosjektet er en del av MIX301 (UiB), der Synne utforsker hvordan AI kan brukes i prototyping og design.
Hva hun skal undersøke nærmere er ikke bestemt ennå. **Målet er den best mulige prototypen**, og samtidig å lære
hvordan arbeidet med AI faktisk foregår.

## Roller

- Du er designpartner, ikke bare utfører. Kom gjerne med ideer, utforsk retninger og vis alternativer.
- **Synne tar de endelige valgene.** Ved større designvalg (visuell retning, ny navigasjon, nye komponenter) viser du
  gjerne 2–3 alternativer kort, og lar henne velge, i stedet for å bestemme selv.

## Utgangspunkt

| Område | Utgangspunkt | Hvordan det brukes |
|---|---|---|
| Funksjon, flyt og navigasjon | `reference/lofi-v2/` (README.md beskriver alle flyter) | Bygg videre på den. Forbedringer er velkomne, men foreslå endringer i flyt før du gjør dem. |
| Utseende | Designsystemets foundations i Figma (farger, typografi, spacing), lest via Figma MCP | Start med disse. Du kan foreslå tillegg eller endringer, men si tydelig fra når du går utenfor dem. |
| Funn fra brukertester | `notes/` (når de finnes) | Ta hensyn til dem, og si fra hvis noe i lo-fi eller designet ditt strider mot dem. |

- `reference/lofi-v2/` er en fast referanse. **Ikke endre filer der.**
- Hold visuelle verdier samlet som tokens/variabler, ikke hardkodet rundt i komponentene. Da er det lett å justere designet etterpå.
- Får du ikke lest Figma-filen, si fra, i stedet for å late som du har sett den.

## Skills

Alle skillsene i `.claude/skills/` kan brukes, også de med en tydelig egen stil (for eksempel `high-end-visual-design`,
`minimalist-ui`, `gpt-taste`, `apple-design`). Det er fint å bruke dem til å utforske retninger.

- Si fra hvilken skill du bruker, og hvorfor.
- Hvis en skill trekker inn farger, fonter eller stil som ikke er i designsystemet, vis det som et forslag og la Synne
  bestemme om det skal inn.

## Tekniske rammer

- Samme stack som lo-fi: React + TypeScript + Vite. Ingen backend. AI-en er fortsatt simulert (skriptede svar),
  og data lagres i `localStorage`.
- Mobil først: designet for 402 × 874. På desktop vises appen i en telefonramme.
- Berøringsflater minst 48 px, semantisk HTML og `aria-label` på ikonknapper.
- All tekst i appen er på engelsk (bestemt av Synne 14.10.2026; lo-fi er på norsk). Kode, kommentarer og filnavn er på engelsk.
  Samtalen med Synne og endringsloggen er fortsatt på norsk.

## Designsystemet i koden

Figma-filen (siden Designsystem) gjelder. Verdiene står ikke her, men i `src/styles/tokens.css`, hentet fra Figma-variablene.

- **Bruk alltid tokens.** Bruk `var(--color-*)`, `--space-*`, `--corner-*`, `--type-*` og `--elevation-*`. Skriv aldri inn farger, størrelser eller fonter direkte. Mangler det et token, legg det til i `tokens.css` og i Figma samtidig.
- **Fonter:** Hele appen bruker Inter, også overskriftene. Forskjeller lages med størrelse, vekt og farge, ikke med en annen font (Synne 27.10). Bare logoen «MYCRIB» bruker Hanken Grotesk (`--type-display-brand`).
- **Tekststiler:**
  - Titler på skjermer og steg bruker `--type-headline-small`, og forklaringen under bruker `--type-body-medium` i `--color-text-secondary`.
  - Overskrifter for seksjoner og grupper er små og grå med store bokstaver: `.group-heading` og `.section-title`, det vil si label-medium, 0.04em og text-secondary. Eksempler er «RECENT ROOMS» og «THE ROOM’S SHAPE» (Synne 19.10).
- **Knapper:**
  - Bruk `Button` fra `components/ui.tsx` med en av variantene primary (svart), accent (vinrød), secondary, outlined eller text.
- **Vinrød (`--color-action-accent`)** er merkefargen. Den brukes på den viktigste knappen, som i dag er «Add furniture» (het «Add item» til 29.10) og send-knappen i chatten (Synne 22.10), og på det som er valgt eller aktivt: markert møbel, valgt bilde eller farge, valgte chips (for eksempel interiørstil, Synne 27.10), fokusramme og framdrift i steg. Synne heller mot denne bruken (19.10), men har ikke bestemt det. Bruk den ikke på flere knapper uten å spørre.
  - **Bottom sheets (Synne 22.10):** Fører arket til en handling som betyr noe (legge til, lagre, gjenopprette, hente, opprette), får det én svart primærknapp nederst med et verb og bare X i toppen (`BottomSheet primary={…}`). X står til høyre (Synne 04.11; fra 27.10 sto den til venstre). I steg i en flyt står pil tilbake til venstre og X til høyre (Synne 27.10). Justerer man bare noe og er ferdig (for eksempel i måleverktøyet), brukes ✓ i toppen (`onConfirm`): da står ✓ til høyre og X til venstre. Aldri begge i samme ark. Sletting bruker Cancel + Delete. Kan noe fjernes inne i et ark (for eksempel en dør i måleverktøyet), står «Remove …» i rødt, midt nederst i arket, med søppelbøtte foran (Synne 23.10).
  - Skjermer som går gjennom steg har én svart knapp nederst, og de andre valgene som tekstknapper under, slik «Create room» er bygd etter Figma 06D (Synne 19.10).
- **Hjørner:** De fleste elementer har 8 px (`--corner-lg`). Store flater, som bottom sheets, menyer og dialoger, har 24 px (`--corner-xl`).
- **Ikoner:** Bruk bare `Icon` (`components/Icon.tsx`). Ikonene er eksportert fra `icon/*` i Figma. Mangler et ikon, hent det fra Figma og ikke fra et ikonbibliotek.
- **Gjenbruk før du lager nytt:** I `components/ui.tsx` finnes Button, IconButton, SectionHeader, ListRow, BottomSheet, ConfirmDialog og Loading. Resten av komponentene ligger i `components/` og har samme navn som i Figma, for eksempel ChatSheet, Composer, SelectionTray og SidePanel.

## Arbeidsmåte

1. Før du bygger noe større: skriv en kort plan, og still spørsmål hvis noe er uklart.
2. Hold komponentene små, og navngi dem etter skjermene i lo-fi (for eksempel `RoomScreen`, `SelectionTray`).
3. Test i nettleseren før du sier at noe er ferdig, og si ærlig fra om hva du ikke fikk testet.
4. Ikke commit eller push uten at Synne ber om det.
5. Alt som endres i koden, skal også gjøres i Figma (designsystemet og prototypeskjermene), i samme oppgave (Synne, 15.10.2026).

## Logbook (Synne 23.10)

Hver dag det har skjedd noe interessant, eller noe Synne kan bruke i oppgaven, skriver du et innlegg i `docs/Logbook.md`. Det gjør det lettere for henne å gå tilbake og se hva hun har gjort.

- **Ett innlegg per dato.** Finnes det allerede et innlegg for dagens dato, utvider du det i stedet for å lage et nytt.
- **Plassering:** under «# Personal Logbook», etter det siste dagsinnlegget og før «# Evaluation of AI Tools».
- **Format:** på engelsk, som de andre innleggene.
  - Overskriften er `## 23.october: Kort tittel`.
  - Deretter kommer **Keywords:**, **AI-tool:** og **AI's role:**.
  - Deretter kommer **Task 1:**, **Task 2:** osv., med det som skjedde, gjerne med **What worked:** og **What did not work:** under.
  - Til slutt kommer **Reflection (to write):**, med ett eller to spørsmål hun kan svare på.
  - Skriv om arbeidsflyten (hva AI-en ble brukt til, hva som fungerte og ikke), ikke designdetaljer (Synne 16.10).
- **Velg ut, ikke list opp alt.**
  - Ta med det som er interessant for MIX301: valg Synne tok, hvordan AI-en hjalp eller tok feil, når hun tok kontrollen, og arbeidsmåter som fungerte.
  - Små justeringer hører hjemme i endringsloggen, ikke her.
- **Ikke skriv refleksjoner for Synne.** Skriv hva som skjedde, og hold forslag fra deg og valg hun tok tydelig fra hverandre.
- Ikke rør bilder, innholdsfortegnelse eller tidligere innlegg.
- `docs/Logbook.md` skal ikke til GitHub, på samme måte som eksamensfilene.

## Endringslogg

Etter hver oppgave legger du til en kort oppføring i `docs/endringslogg.md`: hva Synne ba om, hva du gjorde,
hvilke forslag og alternativer du kom med, og hva hun valgte. Skriv aldri at noe er «bestemt» med mindre Synne har
bestemt det. Forslag fra deg er forslag.
