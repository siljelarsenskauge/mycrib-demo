# Interiørapp v1 – høyoppløselig prototype

Kodet versjon av Figma-prototypen («Prototype»-siden i Figma-filen). Appen er på engelsk. AI-en er fortsatt
simulert (skriptede svar), og tilstanden lagres i `localStorage`.

## Kjør lokalt

```bash
npm install
npm run dev
```

Åpne adressen Vite viser. På desktop vises appen i en telefonramme (402 × 874). På telefonen (samme Wi-Fi) åpner du
**Network**-adressen.

Nullstill til startdata: legg til `?reset=1` i adressen.

`node_modules` ligger i `node_modules.nosync` (med en snarvei som heter `node_modules`), slik at iCloud ikke
synkroniserer pakkene. Hvis `npm install` erstatter snarveien med en vanlig mappe, virker alt likevel.

## Runde 1: kjerneflyten

| Del | Hva som virker |
|---|---|
| Hjem («My Space») | Rom med bilde og pin (maks 4), chatter fra alle rom, [+ Add]: Scan item, Photos, My furniture → «Which room?» |
| Rom | Romvelger i toppbaren, 3D / Floor plan (2D) / Realistic, lagre versjon, angre, tips første gang |
| Chat | Skriv eller send vedlegg, [+]: Scan item, Photos (også ekte kamerarull), Inspiration, My furniture |
| Marker møbel | Trykk eller dra. Rød ContextChip i chatten, «Try others» ved møbelet → farger og lignende møbler |
| Sidepanel | New chat, chatter, lagrede versjoner (se og gjenopprett), moodboard |

## Senere runder

| Del | Hva som virker |
|---|---|
| Opprett rom | Stegvis (Figma 06D): navn → mål rommet (skann, plantegning eller egne mål) → «Does this look right?» → bilder → «… is ready» |
| Mål | Målverktøyet fra Furnie («Skriv inn mål»): form og størrelse, dører, vinduer og mer, sjekk og lagre |
| Rominnstillinger | Mål, skann, plantegning, bilder og instruksjoner til AI-en |
| 3D i stuen | 3D-modellen fra Furnie (`public/furnie/3d.html`) i fullskjerm |

Hele historikken står i `docs/endringslogg.md`.

## Simulert AI – eksempler

«I’m thinking about a new sofa» · vedlegg · «does it fit?» · «make it smaller/bigger» · «move it to the window» ·
«rotate it» · «make it dark brown» · «make it cosy» · «remove it» · «add the armchair».
De norske nøkkelordene fra lo-fi virker også.

## Struktur

```
src/
  state/       types, seed, geometry, mutations, ai, catalog, pins, store (kopiert fra lo-fi og oversatt)
  components/  én fil per Figma-komponent (ChatSheet, Composer, SelectionTray, SidePanel, AddMenu …)
  screens/     HomeScreen, RoomScreen, LaterScreen
  styles/      tokens.css (verdier fra Figma-variablene), app.css
public/rooms/  rombildene fra Figma
```
