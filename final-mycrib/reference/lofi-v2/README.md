# Rom – klikkbar prototype

Førsteutkast av en mobilapp der en AI-chat bruker brukerens faktiske rom som kontekst.
Alt er simulert: ingen ekte AI, ingen 3D og ingen backend. Tilstanden lagres i `localStorage`.

## Kjør lokalt

Krever Node 18 eller nyere.

```bash
npm install
npm run dev
```

Åpne http://localhost:5173. På desktop vises appen i en telefonramme (402 × 874).

## Åpne på telefon (samme nettverk)

`npm run dev` starter Vite med `--host`, så terminalen viser også en **Network**-adresse,
f.eks. `http://192.168.1.23:5173`. Åpne den adressen i nettleseren på telefonen.
Telefonen og maskinen må være på samme Wi-Fi. Hvis siden ikke laster, må du
tillate innkommende tilkoblinger for Node i brannmuren (macOS: Systeminnstillinger → Nettverk → Brannmur).

Tips: Legg siden til på hjemskjermen for å få fullskjerm uten adressefelt.

## For testleder

| Handling | Hvordan |
|---|---|
| Nullstille til startdata | Legg til `?reset=1` i adressen, f.eks. `http://192.168.1.23:5173/?reset=1` |
| Fortsette etter refresh | Skjer automatisk (localStorage, per nettleser/enhet) |

## Hovedflyt (oppgave til testpersoner)

1. Forside → «Stuen min»
2. Skriv «Jeg vurderer en ny sofa» (ny chat startes i sidepanelet: panel-ikonet øverst til høyre → «Ny chat»)
3. [+] → «Last opp bilde/screenshot» → velg et sofabilde → simulert gjenkjenning
4. Forhåndsvisning: «Sofa, 3-seter, 220 × 90 × 80 cm», med mål som kan endres
5. «Legg ved» → vedlegget vises i inputfeltet → valgfri tekst → send
6. AI-en legger sofaen rett inn i rommet og sier kort fra om at gangsonen mot spisebordet blir ca. 60 cm
7. Juster med tekst: «gjør den mindre», «flytt den til andre veggen», «gjør den mørk brun»
8. Eller trykk på et møbel. Det markeres, og over chatfeltet står det «Gjelder: Sofa» med bryteren «Chat | Forslag». «Forslag» viser farger og lignende møbler (ett trykk bytter), og «Chat» tar deg tilbake til chatten. Prompten gjelder da det markerte møbelet, f.eks. «gjør den blå», «roter den» eller «fjern den». Du flytter møbler ved å dra dem, både i 2D og 3D. Trykk på tomt gulv for å fjerne markeringen.
9. Alle endringer gjelder rommet med en gang. Angre-pilen nederst til venstre i romvisningen tar tilbake siste endring.
   Er brukeren fornøyd, trykker hen på den runde lagreknappen øverst til høyre i romvisningen (navnet er valgfritt) og kan utforske videre.
   I sidepanelet under «Lagrede versjoner» kan en versjon ses og gjenopprettes.
10. Bytt chat (sidepanelet → «Gardiner») → rommet viser den nye sofaen

**Hurtigflyt (f.eks. i butikk):** På forsiden trykker du på «Sjekk møbel» (kamera med skanneramme) nederst til høyre →
Scan møbel / Last opp bilde / Mine møbler → sjekk målene → «Velg rom» → velg rom.
Rommet åpnes i en ny chat med møbelet som vedlegg i inputfeltet. Brukeren kan skrive en prompt (valgfritt) og sende.

**Moodboard per rom:** «▦ Moodboard (n)» nederst i sidepanelet åpner moodboardet som et ark
nedenfra, med fanene «Moodboard» og «Utforsk Pinterest» (simulert søk). [+] → «Inspirasjon» åpner det samme vinduet.
Bokmerket i hjørnet av hvert bilde lagrer det i moodboardet eller fjerner det. Trykk på bildene for å markere
ett eller flere, og trykk så «Legg til i chatten (n)».«Stuen min» starter med tre lagrede bilder, og «Soverom» med et tomt moodboard.

**Forsiden:** Øverst står «Hei, Synne!» (navnet kan endres under Profil og innstillinger, tannhjulet øverst til høyre).
Under står overskriften «Rommene dine» med en [+]-knapp for nytt rom. Du kan feste maks 4 rom med nålen, og de vises som et galleri.
Resten av rommene vises i en karusell du kan sveipe, sortert etter når de sist ble åpnet. Prøver du å feste et femte rom,
får du beskjed om å løsne et annet først. Under ligger «Chatter» med chatter fra alle rommene, nyeste først.
Trykker du på en chat, åpnes rommet med den chatten aktiv.

**Farger og alternativer (byttemenyen):** Marker et møbel og velg «Forslag» i bryteren «Chat | Forslag» ved «Gjelder: …». Da dukker det opp en rad over chatfeltet der alt er ett trykk.
- **Øverst:** produktnavn og pris, og fargene produktet finnes i (f.eks. JYSK VEDBY: lys grå, svart, zebra, mørk brun).
- **Under:** en rad med kort du kan sveipe gjennom:
  - «Slik den var» (vises når du har byttet, så du alltid kommer tilbake)
  - lignende møbler AI-en «fant på nettet» (simulert søk på ca. 1 sekund første gang møbelet markeres)
  - møbler av samme type fra Mine møbler
  - «Kamerarull» for å prøve et eget bilde
- Trykker du på et kort, byttes møbelet med en gang på samme plass. Det aktive kortet har tykk ramme.
- En kort melding vises bare hvis gangsonen blir trang. Alt kan angres med «Angre».
- Produktkatalogen ligger i `src/state/catalog.ts`.
- **Byttemenyen og chatten er aldri åpne samtidig.** Når byttemenyen er åpen, er chatten skjult helt. Sender du en melding, lukkes byttemenyen og chatten vises med svaret.
  Åpner du chatten eller sender en melding, lukkes byttemenyen, men møbelet forblir markert, så prompten fortsatt gjelder det.
  Markeringen fjernes ved å trykke på gulvet.

**Opprett rom ([+] ved «Rommene dine»):** Alt ligger på én side, og alt er valgfritt. Du kan skanne rommet, laste opp
plantegning og legge til bilder, i hvilken som helst kombinasjon. Alt er simulert, men ser ut som det ekte:
- **Skann:** et «kamera» i fullskjerm. Etter «Start skanning» tegnes rommet opp mens prosenten øker, med instruksjoner
  («Gå sakte langs veggen …») og vegger, vindu, dør og takhøyde som «blir funnet». «Ferdig» tar deg tilbake.
- **Plantegning:** velg en fil (simulert Filer/kamerarull), «AI leser plantegningen …», se hva den fant, og trykk «Bruk plantegningen».
- **Bilder:** et simulert bildegalleri der du markerer flere bilder og trykker «Legg til (n)». Bildene vises som miniatyrer.
- Hver kilde får en ✓ og kan gjøres på nytt, endres eller fjernes.
- **Mål:** Når rommet er skannet eller plantegningen er lastet opp, dukker «Mål» opp på samme side. Der blar du gjennom
  plantegningen («Ovenfra») og alle fire veggene sett forfra (vindusveggen, veggen med døren, veggen overfor døren og veggen
  overfor vinduet) med pilene ‹ › eller ved å sveipe fanene. Hver vegg viser lengde, takhøyde og det som er på veggen
  (vindu, dør, ekstra vinduer, stikkontakter, radiatorer). Hvert mål er et lite felt rett i
  tegningen, der målet står. Du trykker og skriver rett inn. Feltet blir svart, linjen for målet markeres, og navnet på målet
  vises under tegningen. Målene er vegger, takhøyde, vinduets bredde, høyde, høyde fra gulvet og avstand fra hjørnet, og
  dørens bredde, høyde og plassering. Tegningen tegnes på nytt mens du skriver, og 3D-visningen av rommet bruker høydene.
- **Alle fire veggene** har sitt eget felt i plantegningen: vindusveggen, veggen med døren, veggen overfor døren og veggen
  overfor vinduet. Formen på rommet endres når en vegg endres. Går målene ikke opp (mer enn 5 cm avvik), sier appen fra og
  foreslår et mål som passer, som kan godtas med ett trykk («Bruk 370»).
- **Stikkontakter, lys, vinduer og radiatorer:** I plantegningen («Ovenfra») står knappene «+ Stikkontakt», «+ Lys», «+ Vindu»
  og «+ Radiator». Velg én og trykk i tegningen. Stikkontakter, vinduer og radiatorer festes til nærmeste vegg, og lys plasseres
  der du trykker (i taket). Trykk på noe som allerede er lagt inn for å velge det og «Fjern» det. Skanningen «finner» to
  stikkontakter, en taklampe og en radiator. Under tegningen står en oppsummering («I rommet: 2 stikkontakter · 1 lys …»).
- **Døren:** Velg om den åpnes innover eller utover, og om hengslene sitter mot vinduet eller bort fra vinduet. Dørslaget
  i tegningen endres med en gang.
- Alt dette følger med inn i rommet: 2D-plantegningen viser alt, og 3D-visningen viser stikkontakter og ekstra vinduer
  på de to synlige veggene.
- Mål du har rettet, blir ikke overskrevet om du legger til en kilde til. Uten skann eller plantegning kan du velge
  «Skriv inn selv».
- 3D-rommet er fortsatt et rektangel i prototypen. Det bruker den lengste av hvert par motstående vegger. Nisjer støttes ikke.
- Den samme målvisningen brukes under Rominnstillinger → Oppdater 3D-modellen → Juster mål.

**Oppdatere 3D-modellen:** Rominnstillinger → «3D-modell» → «Oppdater 3D-modellen». Du kan scanne rommet på nytt,
laste opp plantegning, justere mål eller laste opp nye bilder (alt er simulert). Møblene beholdes. Ved «Juster mål»
endres rommets bredde og dybde, og møbler som havner utenfor, flyttes inn.

**Toppbaren i rommet:** ← | romnavn | panel-ikon. «Lagre versjon» er en rund knapp øverst til høyre i romvisningen, på linje med 3D/2D. Panel-ikonet åpner et sidepanel fra høyre
(inspirert av ChatGPT/Claude) med «Ny chat», chatter, de tre siste lagrede versjonene (+ «Se alle») og Moodboard og Rominnstillinger nederst.

**Hint første gang:** Første gang et rom åpnes, vises «Trykk på et møbel for å markere det. Dra for å flytte det.».
Hintet forsvinner når brukeren markerer et møbel eller trykker ✕, og vises igjen etter `?reset=1`.

Det finnes ikke noe eget testområde: når noe er lagt til, er det lagt til.
AI-chatten er bevisst nedtonet. Den tar maks ca. 1/5 av skjermen og har ingen knapper eller forslag.
AI-en svarer kort, og legger bare til en observasjon når noe er trangt eller blokkerer døren.

## Simulert AI – nøkkelord

| Brukeren skriver | Effekt |
|---|---|
| vedlegg (møbel) | Plasserer møbelet. Bytter ut eksisterende sofa/seng osv. |
| «sofa» | Plasserer en standard 3-seter (220 × 90 × 80) |
| «passer», «plass», «får», «mål» | Tegner avstander i 2D og bytter til plantegningen |
| «mindre»/«større», «smalere»/«bredere» | ± 20 cm bredde |
| «flytt» (+ «venstre/høyre/fram/bak», «vindu», «dør») | Flytter 30 cm eller til en annen vegg |
| «roter», «snu», «vri» | Roterer møbelet 90° |
| fargeord: brun, mørk brun, zebra, beige, grønn, blå, svart … | Endrer farge |
| «varm», «koselig» | Gjør sofaen terrakotta og henter gulvlampen fra Mine møbler |
| «fjern» | Fjerner møbelet fra rommet |
| navn fra Mine møbler, f.eks. «lenestol» | Henter møbelet inn |
| ingen treff | Kort, nøytralt svar |

«den» viser til det markerte møbelet, ellers til det sist endrede.

## Struktur

```
src/
  state/      types, seed (startdata), geometry, mutations, ai (skriptet AI), store (localStorage)
  screens/    RoomsScreen, CreateRoomScreen, RoomScreen, RoomSettingsScreen,
              VersionHistoryScreen (+ SnapshotScreen), ProfileScreen
  components/ IsoView3D, PlanView2D, ChatSheet, Composer, PlusMenu,
              FurniturePreview, PickerSheets, Moodboard, RoomPanel, SaveVersionSheet, ui
  styles.css  alle farger/font som CSS-variabler i :root
```

Datamodell, i tre lag:

- **Rom:** `furniture[]` er den gjeldende tilstanden. Endringer fra AI-en eller fra å dra møbler skrives rett hit.
  `undo[]` (maks 20) husker tilstanden før hver endring, slik at «Angre» kan hente den tilbake.
- **Chatter:** samtaler om rommet, med historikk. «Ny chat» gir ny kontekst, men det er samme rom.
- **Lagrede versjoner** (`snapshots`): bare det brukeren selv lagrer med «Lagre versjon». Ved gjenoppretting
  lagres gjeldende rom først som «Før gjenoppretting» (merket «automatisk»).
