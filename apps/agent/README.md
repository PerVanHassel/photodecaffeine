# AI Life OS -- technische spike

Dit is de eerste, minimale bouwstap uit `docs/ai-personal-agent-architecture.md`
(§16, "technische spike"): alleen de kernlus werkend krijgen.

```
WhatsApp-bericht -> webhook -> Claude (met tools) -> taak/memory opslaan in Supabase -> WhatsApp-antwoord
```

Geen dashboard, geen notification-worker, geen accountability-cron, geen
semantische memory-search (embeddings) -- dat komt in de volledige MVP (§16 van
het ontwerpdocument). Doel hier is puur valideren dat de kernlus betrouwbaar en
snel genoeg werkt voordat daar weken in geïnvesteerd worden.

Dit pakket staat los van de bestaande PDC Studio-code in deze repo (root
`src/` + `supabase/functions/server`) -- die blijft ongewijzigd en gebruikt
zijn eigen, aparte Supabase-project. Gebruik voor dit pakket een **nieuw**
Supabase-project, niet het bestaande.

## 1. Accounts aanmaken

### Anthropic (Claude)
1. Ga naar https://console.anthropic.com en maak een account.
2. Zet betaalgegevens/credits neer (API-gebruik is niet gratis, maar bij een
   spike met een paar honderd berichten gaat het om centen).
3. Ga naar **API Keys** -> **Create Key**. Kopieer de key (begint met `sk-ant-`).

### Supabase
1. Ga naar https://supabase.com en maak een account/organisatie (kan dezelfde
   organisatie zijn als voor PDC Studio, maar maak een **nieuw project** aan
   specifiek voor deze AI-assistent, bv. genaamd `ai-life-os-spike`).
2. Wacht tot het project is aangemaakt (~2 min).
3. Ga naar **Project Settings -> API**. Kopieer:
   - `Project URL` -> `SUPABASE_URL`
   - `service_role` key (niet de `anon` key!) -> `SUPABASE_SERVICE_ROLE_KEY`
4. Ga naar **SQL Editor**, plak de inhoud van `supabase/schema.sql` uit deze map,
   en voer uit. Dit zet de tabellen + pgvector-extensie neer.

### Twilio (permanent WhatsApp-nummer, geen Sandbox)
We slaan de Sandbox bewust over: die verloopt elke 72u en past niet bij "altijd
beschikbaar". In plaats daarvan vraag je via Twilio een **echte WhatsApp
Sender** aan -- dat is een productie-WhatsApp-nummer, gekoppeld via Meta
Business-verificatie, maar met Twilio's begeleide flow (makkelijker dan de
Meta Cloud API rechtstreeks). De code in `src/whatsapp/twilio.ts` verandert
hier niet door -- alleen de waarde van `TWILIO_WHATSAPP_FROM` wordt straks een
eigen nummer i.p.v. het gedeelde sandboxnummer. Rechtstreeks Meta Cloud API
blijft de aanbevolen overstap zodra dit qua volume gaat schalen (§8 van het
ontwerpdocument) -- voor nu, met één gebruiker, is de Twilio-marge
verwaarloosbaar en is dit de snelste weg naar een permanent nummer.

1. Ga naar https://console.twilio.com en maak een account.
2. Kopieer van het dashboard: **Account SID** -> `TWILIO_ACCOUNT_SID` en
   **Auth Token** -> `TWILIO_AUTH_TOKEN`.
3. Ga naar **Messaging -> Senders -> WhatsApp Senders -> Request a Sender**.
   Twilio loodst je hier doorheen: een Facebook Business Manager koppelen (of
   aanmaken), bedrijfsgegevens invullen, en een telefoonnummer registreren
   (een nieuw Twilio-nummer, of een bestaand nummer dat nog niet aan WhatsApp
   gekoppeld is -- een nummer kan maar aan één WhatsApp-account tegelijk
   hangen). **Reken op enkele dagen doorlooptijd** voor Meta's
   business-verificatie; dit is niet instant zoals de sandbox.
4. Zodra de sender is goedgekeurd, is `TWILIO_WHATSAPP_FROM` dat nummer in de
   vorm `whatsapp:+31...`.
5. **Tot de verificatie rond is:** kun je gewoon met de Sandbox blijven
   ontwikkelen/testen (zie git-historie van dit bestand voor de sandbox-
   instructies) en later alleen `TWILIO_WHATSAPP_FROM` + de webhook-URL in
   Twilio omzetten naar de nieuwe sender -- geen codewijziging nodig.
6. **Template-berichten:** voor proactieve berichten buiten het 24u-venster
   (de accountability-features uit fase 2) moet je in de Twilio Console onder
   **Content Templates** vooraf berichten laten goedkeuren door Meta. Dat is
   nog niet nodig voor deze spike (reactieve gesprekken vallen altijd binnen
   het venster).

## 2. Verifiëren (optioneel, zonder live accounts)

```bash
cd apps/agent
pnpm install
pnpm typecheck   # verifieert dat alles compileert
pnpm test        # offline smoke test (geen live accounts nodig)
```

## 3. Altijd-aan hosten op Railway

De server draait 24/7 op Railway, niet lokaal -- zo blijft de assistent
bereikbaar zonder dat er een laptop aan hoeft te staan. `railway.json` (repo-
root) en `apps/agent/Dockerfile` staan al klaar; Railway hoeft alleen verteld
te worden waar te bouwen.

1. Ga naar https://railway.app, maak een account, en koppel je GitHub-account.
2. **New Project -> Deploy from GitHub repo** -> kies `photodecaffeine`.
3. In de service-instellingen (**Settings -> Source**):
   - **Root Directory**: laat op de repo-root staan (`/`) -- de Dockerfile
     heeft de hele monorepo als build-context nodig vanwege de pnpm-workspace.
   - Railway pikt `railway.json` automatisch op en gebruikt daarmee
     `apps/agent/Dockerfile` om te bouwen.
4. **Variables**: zet daar dezelfde variabelen als in `.env.example`
   (`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`). Laat
   `SKIP_TWILIO_SIGNATURE_CHECK` weg/op `false` -- die is alleen voor lokaal
   testen zonder publieke URL.
5. **Settings -> Networking -> Generate Domain** geeft een permanente
   `https://<naam>.up.railway.app`-URL. Zet die (met `/webhooks/whatsapp`
   erachter) als:
   - `PUBLIC_WEBHOOK_URL` in de Railway-variabelen (voor correcte Twilio-
     signature-verificatie), en
   - als **"When a message comes in"**-webhook bij je WhatsApp Sender in de
     Twilio Console (methode `POST`).
6. Elke push naar de `claude/ai-personal-agent-architecture-9p0hib`-branch (of
   later `main`) triggert automatisch een nieuwe Railway-deploy.
7. Controleer of de service leeft: `https://<naam>.up.railway.app/healthz`
   hoort `{"ok":true}` terug te geven.

Lokaal draaien (`pnpm dev` + een tunnel als ngrok) blijft mogelijk voor snel
itereren tijdens development, maar is niet nodig voor "altijd beschikbaar" --
dat is precies waar Railway voor is neergezet.

## 4. Testen tegen de live deploy

Stuur vanaf je WhatsApp een bericht naar het gekoppelde nummer, bijvoorbeeld:

- `"Ik moet morgen de tandarts bellen"` -> zou een taak moeten aanmaken en dat
  bevestigen in het antwoord.
- `"Ik wil ooit Spaans leren"` -> zou als doel (geen deadline) geregistreerd
  moeten worden.
- Controleer in de Supabase **Table Editor** (`agent_tasks`, `agent_messages`,
  `agent_memory_facts`) of de rijen daadwerkelijk verschijnen.

## Wat hier bewust ontbreekt (komt in de volgende bouwstap)

- **Semantische memory-search**: `search_memory` gebruikt nu een simpele
  tekst-match (ILIKE), geen embeddings. Voor echte semantische recall is een
  embeddings-aanroep nodig vóór het opslaan van een `memory_fact` (Anthropic
  raadt Voyage AI aan; OpenAI's embeddings-API kan ook). Vereist een extra
  account/API-key -- bewust uitgesteld tot na de spike.
- **Notification/accountability-worker**: `schedule_reminder` schrijft alleen
  naar de `agent_reminders`-tabel; er is nog geen cron/worker die deze
  daadwerkelijk afvuurt en een WhatsApp-bericht stuurt. Dat is de volgende
  logische bouwstap zodra de kernlus bewezen werkt.
- **Onboardingsflow**: een nieuw telefoonnummer krijgt nu een kale user-rij,
  geen gestructureerde intake-vragen (§2.1 van het ontwerpdocument).
- **Web-dashboard, admin-dashboard**: nog niet gestart.
- **Meta Cloud API i.p.v. Twilio**: bewuste keuze voor snelheid tijdens de
  spike; zie §8 van het ontwerpdocument voor de overstap-redenering.
