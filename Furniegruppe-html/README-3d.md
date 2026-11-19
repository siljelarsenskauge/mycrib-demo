# 3D-visningen i Stueplanleggeren

Dette er 3D-delen av prototypen: en stue der man kan flytte og rotere sofa, sofabord og teppe, og «skanne» inn tepper fra butikkvisningen.

## Filer

| Fil | Hva |
|---|---|
| `3d.html` | Hele 3D-visningen i én fil (ca. 3,7 MB). Trenger ingen andre filer. |
| `rom.json` | Felles mål for rommet, møblene og teppene. Bruk de samme tallene i 2D og 360°, så visningene ikke motsier hverandre. |

Legg filene i mappen `Furniegruppe-html`, ved siden av `Main.dc.html`.

Merk: Rommet i 3D-visningen og målene i `rom.json` er foreløpig et testrom (300 x 410 cm). Begge byttes ut med stua i leilighet B1 (ca. 440 x 412 cm) når den er bygget.

## Kobling mellom visningene

Øverst i 3D-visningen er det en velger: **2D · 3D · 360°**.

- **2D** går til `2d.html`, og **360°** går til `360.html`, i samme mappe.
- Finnes ikke siden ennå, viser 3D-visningen en kort melding i stedet for en feilside.
- Lenk tilbake til 3D fra de andre sidene med `<a href="3d.html">3D</a>`.

### Inni Furnie

Skal 3D-visningen vises inni Furnie (for eksempel når man velger 3D for Stue), brukes adressen `3d.html?embed=1`, for eksempel i en `<iframe>`. Da:

- skjules overskriften, velgeren 2D · 3D · 360° og bunnmenyen (Stue/Skann), fordi Furnie har sine egne
- skjules «Ta bilde»
- ligger ullteppet (160 x 230 cm) i rommet fra start, siden skannemenyen er skjult
- kan møbler og teppe flyttes og roteres som vanlig

Farger og skrift følger Furnie (Hanken Grotesk og #6D1A14) i begge variantene.

### Andre filnavn

Bruker dere andre filnavn for 2D og 360°, kan dere legge dette inn i `3d.html`, rett før `</head>`:

```html
<script>window.VISNINGER = { "2D": "plantegning.html", "360°": "panorama.html" };</script>
```

## Hva som virker og ikke virker her

- **Virker:** 3D-stua, flytting og rotering av møbler og teppe, skanning av tepper, velgeren og «Ta bilde» → «Lag i Gemini-appen» (gratis).
- **Ikke med:** KI-interiøreksperten. Den virker bare i versjonen på claude.ai, og knappen er derfor skjult her.
- **Virker ikke:** «Ta bilde» med automatisk KI-foto. Den trenger en egen server og viser en feilmelding. Bruk Gemini-veien.

## Publisere med GitHub Pages

1. Settings → Pages i repoet.
2. Under «Build and deployment», velg «Deploy from a branch», grenen `main` og mappen `/ (root)`.
3. Etter et minutt eller to ligger siden på `https://<brukernavn>.github.io/<repo>/3d.html`.

Test på mobil. 3D-scenen er tung, særlig på eldre telefoner.

## Endringer i 3D-visningen

`3d.html` er en ferdigbygget fil, og den er vanskelig å redigere for hånd. Endringer i 3D-modellen går via meg, så gi beskjed hvis noe skal endres.

Legg ikke API-nøkler eller passord i repoet, heller ikke om det er privat.
