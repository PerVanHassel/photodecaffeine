# PhotoDeCaffeine

## Antwoorden

De eigenaar heeft dyslexie. Houd antwoorden kort maar duidelijk.

- Een paar regels na elke opdracht, niet meer.
- Zeg wat er af is en of er nog iets moet gebeuren.
- Geen uitleg, achtergrond of samenvattingen tenzij erom gevraagd wordt.
- Geen opsommingen van meer dan een paar punten.

## Werkwijze

- Als iets af is: committen, mergen naar `main` en pushen. Niet eerst vragen.
- `main` heeft een lineaire historie. Merge met `--ff-only` of rebase, nooit een merge-commit.
- Vragen alleen bij een keuze die tot wezenlijk ander werk leidt, niet bij afronding.
- Zet elke afgeronde taak in het Notion-database `Agent-logboek`
  (data source `collection://03ebfc69-36b2-4a0c-ac62-0bba835f7d62`): taak,
  agent, tijdstip, venster, project, status. Venster is `Dag 08–17` of
  `Avond & nacht 17–08`, Nederlandse tijd. Daaruit komen de briefing vóór
  17:00 en die van 08:30.

Voor het pushen altijd:

```
npm run typecheck && npm run build
```

Nieuwe of gewijzigde schermen ook echt in een browser bekijken. Portal- en
adminpagina's zitten achter login; die zijn te testen door een nagebootste
Supabase-sessie in `localStorage` te zetten (`sb-<projectref>-auth-token`) en de
API-aanroepen te onderscheppen.

## Opbouw

- React + Vite, SSR-prerender van de publieke pagina's via `npm run build`.
- Vercel bouwt alleen de frontend. `supabase/functions/` gaat daar niet in mee.
- Backend is één Supabase edge function: `supabase/functions/make-server-0951c59e/`.
- Data staat in een key-value tabel, niet in losse tabellen. Zie `kv_store.tsx`.
- Elke geslaagde POST/PUT/DELETE komt in het logboek (`lib/activity.ts`,
  tabel `activity_log`, admin `/admin/activity`, alleen voor de eigenaar).
  Geef een nieuwe route daar een regel, anders staat hij als "Overig" in de lijst.
- Toestemming van ouders per kind staat in `lib/consents.ts` en `routes/consent.ts`.
  Een foto met `restriction = no_photo` mag nooit buiten de admin komen.
  `projectToApi` (`forClient`), `gateOf` en `downloadLink` houden hem tegen; een
  nieuwe route die foto's naar klanten of gasten stuurt, moet dat ook doen.
- Er zijn geen geautomatiseerde tests.

## Edge function deployen

Gebeurt vanzelf. Elke push naar `main` die `supabase/` raakt, start
`.github/workflows/deploy-edge-function.yml` en die deployt de functie.

Deploy niet met de hand. De Supabase MCP-tool vereist dat de volledige
broncode meegestuurd wordt; die is inmiddels te groot om in één keer te
versturen, en een half afgemaakte upload heeft de API een keer platgelegd.

Na een push die de functie raakt: controleer via de MCP-tool of het
versienummer is opgehoogd, en vergelijk de gedeployde broncode byte-voor-byte
met de repo voordat je zegt dat het gelukt is.

De entrypoint is `index.tsx`, niet `index.ts`. `supabase/config.toml` wijst
de CLI daarheen; zonder dat bestand faalt de bundel.

## Opslag en foto's

Drie Python-scripts, in deze volgorde te draaien. Alle drie doen niets zonder
`--apply` en hebben `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` nodig.

- `dedupe_storage.py` — ruimt dubbele uploads op. Kijkt eerst welke foto's de
  site gebruikt; die blijven altijd staan.
- `optimize_images.py` — maakt WebP + JPEG varianten van een lokale map.
- `publish_web_images.py` — verkleint de foto's die de site toont, zet ze in de
  bucket en verzet de URL's in de kv-tabel.
- `prune_unused.py` — gooit weg waar niets meer naar linkt. `web/` blijft altijd
  staan; daar zitten de varianten voor later.

De kv-waarden zijn soms een JSON-object en soms JSON als tekst. Vervang URL's
altijd op hele strings, nooit als tekstfragment.

Uploads via de admin en de app verkleint de browser zelf
(`src/app/lib/webPhoto.ts`): ze komen als `-2560.jpg` + `-1280.jpg` in `web/`.
Site en admin nemen de 1280-versie waar die genoeg is (`src/app/lib/images.ts`).
`publish_web_images.py` is dus alleen nog voor oude originelen. Draai het via de
workflow "Foto's webklaar maken"; een lege `limit` wordt daar 3, geef dus een
getal op.

Bestanden (`/admin/files`, `routes/files.ts`) toont alles wat in de opslag staat,
map voor map, alleen om te bekijken. `placeOf` bepaalt per bestand in welke map het
staat en wie het mag zien, met dezelfde rollen als de schermen waar het vandaan komt.
Een map die het niet kent blijft verborgen, behalve voor de eigenaar. Komt er een
nieuwe map in de opslag, geef hem daar een plek. `hasl-media` hoort bij een andere site.

## Voorwaarden en toestemming

De teksten voor klanten staan in `src/app/lib/legal.ts`, de pagina's erbij in
`src/app/lib/policies.ts`. De admin (Documenten) toont dezelfde tekst met interne
notities (`studio/documents/websitebeleid.ts`); onderdeel H daarin is wat nog openstaat.
Verander je de inhoud, verhoog dan `LEGAL_VERSION` (`lib/legalVersion.ts`) en
`TERMS_VERSION` (`lib/config.ts` in de functie): bij elk akkoord bewaren we de versie.

- Akkoord op een offerte: `routes/quotes.ts` bewaart datum, versie, keuzes en een kopie in
  `details.accepted`, en mailt de klant een bevestiging. Herroepen: `/herroepen`, `routes/withdrawal.ts`.
- Portfolio: toestemming per werk in `routes/articleConsent.ts` (`/werk-toestemming/<token>`).
  Een nee haalt het werk vanzelf van de site.
- Cookies: statistieken draaien volledig pas na een ja in de banner (`lib/cookieChoice.ts`).
  Een nieuwe externe dienst hoort in de privacyverklaring en het cookiebeleid.
- Lettertypes staan in `public/fonts` (`scripts/fetch_fonts.mjs`). Laad ze nooit bij Google.
- Betaaltermijn is 10 werkdagen, downloads een kwartaal na levering, bij websites geen download.
- Opruimen volgens de bewaartermijnen: `lib/retention.ts`, een keer per dag als iemand de admin opent.
- Toestemming per werk staat in de kv-tabel (`lib/articleConsents.ts`), niet in een eigen tabel.
- Voorrang in de groepsgalerij: `lib/priority.ts`, gast in `routes/share.ts`, admin in `routes/priority.ts`.
  Betalen gaat via een gewone factuur; `routes/payments.ts` herkent hem met `priorityForInvoice`.
  Bij elke aanvraag bewaren we de tekst waarmee de gast akkoord ging (`statement`, `terms_version`).

## Taal

De site is tweetalig (`src/app/i18n/translations.ts`, standaard Nederlands).
De adminkant is gemengd: sidebar, reviews en team zijn Nederlands, de
portfoliomodal is Engels. Sluit aan bij het scherm waar je in werkt.

Teksten voor klanten en de site: je in plaats van u, gewone woorden, geen
gedachtestreepjes (—) en geen AI-slop.
