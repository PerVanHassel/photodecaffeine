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

### Twilio (WhatsApp Sandbox)
Voor de spike gebruiken we Twilio's WhatsApp Sandbox -- geen Meta Business
Account-verificatie nodig, binnen enkele minuten werkend. Voor het echte
product wordt dit later de directe Meta Cloud API (zie §8 van het
ontwerpdocument) -- de adapter-code in `src/whatsapp/twilio.ts` is bewust
geïsoleerd zodat die overstap later één bestand raakt, niet de hele agent.

1. Ga naar https://console.twilio.com en maak een account (gratis trial-tegoed
   is voldoende voor de spike).
2. Kopieer van het dashboard: **Account SID** -> `TWILIO_ACCOUNT_SID` en
   **Auth Token** -> `TWILIO_AUTH_TOKEN`.
3. Ga naar **Messaging -> Try it out -> Send a WhatsApp message**. Volg de
   instructie om vanaf je eigen telefoon `join <jouw-sandbox-code>` te sturen
   naar het getoonde Twilio-sandboxnummer (meestal `+1 415 523 8886`). Dit
   koppelt jouw telefoon tijdelijk (72u, daarna opnieuw joinen) aan de sandbox.
4. `TWILIO_WHATSAPP_FROM` is dat sandboxnummer in de vorm `whatsapp:+14155238886`.

## 2. Lokaal opzetten

```bash
cd apps/agent
cp .env.example .env
# vul .env in met de waarden van hierboven
pnpm install
pnpm typecheck   # verifieert dat alles compileert
pnpm test        # offline smoke test (geen live accounts nodig)
```

## 3. Webhook publiek bereikbaar maken (lokaal testen)

Twilio moet je lokale server kunnen bereiken. Gebruik een tunnel, bv. ngrok:

```bash
ngrok http 8787
```

Kopieer de `https://...ngrok-free.app`-URL. Zet in `.env`:

```
PUBLIC_WEBHOOK_URL=https://<jouw-ngrok-url>/webhooks/whatsapp
```

In de Twilio Console: **Messaging -> Try it out -> Send a WhatsApp message ->
Sandbox settings**, zet **"When a message comes in"** op
`https://<jouw-ngrok-url>/webhooks/whatsapp` (methode `POST`).

## 4. Draaien en testen

```bash
pnpm dev
```

Stuur vanaf je eigen (bij de sandbox gejoinde) WhatsApp-nummer een bericht,
bijvoorbeeld:

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
