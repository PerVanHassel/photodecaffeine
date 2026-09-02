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

De mapnaam is gelijk aan de functienaam, dus dit werkt direct:

```
npx supabase functions deploy make-server-0951c59e --project-ref uunwhesmymkwmkgqkmxy
```

Deployen via de Supabase MCP-tool kan ook, maar die vereist dat de volledige
broncode (ruim 130 KB) meegestuurd wordt. Dat is een keer misgegaan en heeft de
API korte tijd platgelegd. Gebruik bij voorkeur de CLI. Als het toch via de tool
moet: daarna de gedeployde broncode ophalen en byte-voor-byte vergelijken met de
repo voordat je zegt dat het gelukt is.

## Taal

De site is tweetalig (`src/app/i18n/translations.ts`, standaard Nederlands).
De adminkant is gemengd: sidebar, reviews en team zijn Nederlands, de
portfoliomodal is Engels. Sluit aan bij het scherm waar je in werkt.
