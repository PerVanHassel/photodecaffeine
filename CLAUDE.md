# PhotoDeCaffeine

## Antwoorden

De eigenaar heeft dyslexie. Houd antwoorden kort.

- Een paar regels na elke opdracht, niet meer.
- Zeg wat er af is en of er nog iets moet gebeuren.
- Geen uitleg, achtergrond of samenvattingen tenzij erom gevraagd wordt.
- Geen opsommingen van meer dan een paar punten.

## Werkwijze

- Als iets af is: committen, mergen naar `main` en pushen. Niet eerst vragen.
- `main` heeft een lineaire historie. Merge met `--ff-only` of rebase, nooit een merge-commit.
- Vragen alleen bij een keuze die tot wezenlijk ander werk leidt, niet bij afronding.

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

## Taal

De site is tweetalig (`src/app/i18n/translations.ts`, standaard Nederlands).
De adminkant is gemengd: sidebar, reviews en team zijn Nederlands, de
portfoliomodal is Engels. Sluit aan bij het scherm waar je in werkt.
