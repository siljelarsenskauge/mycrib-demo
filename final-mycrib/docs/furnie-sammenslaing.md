# Sammenslåing med Furnie (gruppas prototype)

Kilde: github.com/siljelarsenskauge/Furnie. Synne har kommentert skjermbildene i Figma (siden «Furnie (gruppa) – sammenligning»), 15.10.2026.
Prinsipp: Furnies funksjonalitet der den er bedre, Synnes design og designsystem overalt.

| Område | Synnes beslutning | Status i Figma | Kode |
|---|---|---|---|
| Tittel på hjemskjermen | Hennes font i tittelen: «FURNIE» i Hanken Grotesk | Ny variabel `font/brand` og tekststil Display/Brand, brukt på 4 hjemskjermer | Kodet |
| Knapper øverst på hjem | «New room» (sekundær) først, så «Add item» (primær, åpner menyen). Tekst i Title/Small/Medium med store bokstaver. Skillelinje under. «Add» nede fjernes | Gjort på 4 hjemskjermer | Kodet |
| Rom på hjem | Synnes karusell med festede rom, og AI-chatter under | Uendret (Synnes) | Finnes |
| Innstillinger | Hennes oppbygging (Account, Residents, Home, Interior style, Settings) med Synnes designsystem | Ny skjerm «3 · Settings (from Furnie)» i Flyt 7 | Kodet (radene leder til «Coming in the next round») |
| Mine møbler | Droppes for nå. Eventuelt et bottom sheet senere | Synnes bottom sheet «My furniture» brukes | Finnes |
| Møbeldetalj | Ingen egen side. Synnes bottom sheet og logikk | Uendret (Synnes) | Finnes |
| 360°-rom | Synnes prototype for alt | Uendret | Finnes (Furnie-viseren er overført) |
| 3D | Hennes 3D-modell brukes i 3D-visningen | Ny skjerm «7b · 3D view (Furnie 3D model)» | Kodet: `3d.html?embed=1` i en iframe, bare for Living Room |
| 2D | Synnes design | Uendret | Finnes |
| Opprett rom | Synnes skjerm med én knapp til høyre per kilde. Ingen merkelapper eller trekkspill. Legg til forsidebilde | Knappen for forsidebilde er lagt til. Tekst som gikk utenfor kanten er rettet | Kodet |
| Skann rom | Kopier hennes skjerm | «2 · Scan the room (from Furnie)» er bygget om | Kodet (simulert) |
| Skann møbel (side) | Ingen egen side. Synnes nedtrekksmeny | Uendret («Check item»-menyen) | Finnes |
| Skanning av møbel | Kopier hennes skjerm for nå | «2a · Scan item (from Furnie)» er bygget om, med illustrasjonen hennes | Kodet (simulert) |

Spørsmål til gruppa:
- `3d.html` er ferdigbygget, og endringer går via Silje. Er det greit at den bygges inn med en iframe (`?embed=1`), slik README-en hennes beskriver?
- Hvilket repo og hvilken gren skal sammenslåingen skje i?
| Oppmåling | Furnies veiviser i 4 steg | 5 skjermer i Flyt 6 | Kodet (rektangulære rom: «Add corner» og «Delete wall» kommer senere) |
| Produktlenke | Nytt valg i menyene | «2e · Product link» | Kodet (simulert henting) |
