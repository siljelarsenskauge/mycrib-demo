# MyCrib

MyCrib er en «ChatGPT for interiør»: en AI-chat der brukerens eget rom er konteksten. Man skanner rommet og møblene sine,
ser rommet i 360°, 3D og som plantegning, og spør interiøreksperten Fig om råd.

Prosjektet er laget i MIX301 ved Universitetet i Bergen. Dette repoet er en kopi av gruppas hovedrepo
([Furnie](https://github.com/siljelarsenskauge/Furnie), branch `stand`), satt opp som demo til standen.
Hele arbeidshistorikken ligger i Furnie.

**Prøv appen:** https://mycrib-demo-vp0s.netlify.app

- Appen er laget for mobil. På PC vises den i en telefonramme.
- På iPhone kan den legges til på hjemskjermen (Del → Legg til på Hjem-skjerm), og da åpnes den i fullskjerm.
- Start på nytt med alle data nullstilt: https://mycrib-demo-vp0s.netlify.app/#reset

## Stand-demoen

Ved oppstart viser appen fem små oppgaver, som Fig guider brukeren gjennom:

1. **Lag ditt eget rom:** skann et rom, se det i 360°, 3D og plantegning, og spør Fig hva den synes.
2. **Får et sofabord plass?:** legg til et sofabord og spør om det får plass foran sofaen.
3. **Legg til en sofa:** skann en sofa og snakk med Fig om den, helt fram til et «pimpet» rom i 360°.
4. **La naturen bestemme:** gi hele stua farger fra et naturbilde.
5. **Lag et moodboard:** bla i moodboards og finn inspirasjon.

AI-en er simulert: Fig svarer med skriptede replikker. Der brukeren skal skrive, skriver replikken seg selv når man
trykker i feltet, slik at demoen virker likt for alle og tastaturet ikke dekker skjermen.

## Innhold

| Mappe | Hva det er |
|---|---|
| `hifi-prototype/` | Appen: den høyoppløselige prototypen (React + TypeScript + Vite) |
| `hifi-prototype/reference/lofi-v2/` | Lo-fi-prototypen som hi-fi-versjonen bygger på |
| `hifi-prototype/docs/endringslogg.md` | Endringsloggen: hva som er gjort, foreslått og valgt underveis |
| `Furniegruppe-html/` | Tidligere HTML-eksporter med 3D-modellen og 360°-bildene av rommet |

## Kjør lokalt

Krever Node.js 18 eller nyere.

```bash
cd hifi-prototype
npm install
npm run dev
```

Åpne adressen Vite viser. `npm run build` lager en produksjonsversjon i `hifi-prototype/dist`.

## Teknisk

- React 18, TypeScript og Vite, med three.js til 3D og 360°.
- Ingen backend. Data lagres i nettleseren (`localStorage`).
- Publisert på Netlify (base `hifi-prototype`, build `npm run build`, publish `dist`), og kan installeres som en
  PWA.

## Om bruken av AI

Prototypen er utviklet i samarbeid med Claude Code (Anthropic) som kodeassistent og designpartner. Gruppa har tatt
designvalgene, mens AI-en har foreslått løsninger og skrevet mye av koden. Commits der AI-en har bidratt, er merket
med `Co-Authored-By: Claude`. Hvordan arbeidet med AI foregikk, står i endringsloggen.
