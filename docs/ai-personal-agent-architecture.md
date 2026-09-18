# AI Life OS — Software Design Document

**Product:** Persoonlijke AI-assistent op basis van Claude, primair bediend via WhatsApp, volledig geïntegreerd met een webplatform.
**Positionering:** niet "een WhatsApp-bot", maar een **AI Life Operating System** — WhatsApp is de eerste interface van vele (later: e-mail, agenda, Slack, Telegram, spraak, apps), gebouwd op één centrale kern van geheugen, taken en beslislogica.
**Doelgroep bij launch:** individuele consumenten/prosumers die persoonlijke productiviteit en accountability willen. Schaaldoel: 100.000+ gebruikers.
**Status:** Ontwerpdocument v1.0 — 2026-07-15

---

## 1. Productvisie

### 1.1 Kernidee
Eén telefoonnummer = één persoonlijke assistent. De gebruiker praat zoals tegen een mens: geen commando's, geen menu's, geen "chatbot-gevoel". De AI:

- onthoudt wie je bent, wat je doelen zijn, wat je gewoontes zijn;
- herkent taken en deadlines in gewone zinnen, zonder dat je "maak een taak" hoeft te zeggen;
- neemt zelf initiatief: stuurt follow-ups, herinneringen en accountability-berichten;
- wordt over tijd slimmer over de gebruiker (patronen, voorkeuren, ritme);
- is via het dashboard zichtbaar en bijstelbaar, maar de kern van de ervaring is het gesprek.

### 1.2 Waarom "AI Life OS" en niet "WhatsApp-bot"
Als je het product intern en architecturaal als "WhatsApp-integratie" framet, ontwerp je de datamodellen, memory en taakregistratie gekoppeld aan het WhatsApp-kanaal. Dat is een architecturale doodlopende weg zodra je e-mail, Telegram of een native app toevoegt.

Het juiste mentale model:

```
Gebruiker ↔ Kanalen (WhatsApp, e-mail, web, Telegram, spraak, ...)
                     ↕
            Channel Adapter Layer  (normaliseert elk kanaal naar één interne "Message"-vorm)
                     ↕
            Core Agent (Claude)  +  Memory  +  Task Engine  +  Notification Engine
                     ↕
            Data Layer (Postgres, vector store, object storage)
```

WhatsApp is dus **één adapter** in een adapterlaag. Dat kost bij de MVP vrijwel niets extra (je bouwt toch een berichten-abstractie), maar bespaart een volledige herbouw in fase 3.

### 1.3 Niet-doelen (bewust buiten scope v1)
- Geen open "chat met elke AI-persona" — de assistent heeft een consistente, persoonlijke identiteit per gebruiker.
- Geen groepschats / team-features in v1 (komt evt. in fase 3 als B2B-uitbreiding).
- Geen volledige "agentic tool-uitvoering op het open web" (browsen, kopen, etc.) in v1 — risico en kosten te hoog. Wel voorbereid in de architectuur (tool-use is modulair).

---

## 2. User Flow

### 2.1 Onboarding
1. Gebruiker meldt zich aan op de website (e-mail of Google/Apple OAuth via Supabase Auth).
2. Gebruiker koppelt zijn telefoonnummer (OTP-verificatie via WhatsApp zelf: het systeem stuurt een template-bericht met code).
3. Korte onboarding-flow **in WhatsApp**, niet op de website: de assistent stelt 5-8 vragen (naam, tijdzone, belangrijkste doelen, werk/privé-ritme, communicatiestijl-voorkeur: direct/vriendelijk/streng). Dit vult de eerste long-term memory.
4. Website-dashboard toont meteen een gevuld beginprofiel ("Wat ik tot nu toe over je weet"), zodat de gebruiker vertrouwen krijgt dat het systeem werkt en corrigeerbaar is.

### 2.2 Dagelijks gebruik (kerncyclus)
1. Gebruiker stuurt een bericht ("Moet morgen de tandarts bellen", "Ik ben kapot vandaag", "Hoe ver ben ik met project X?").
2. Channel Adapter normaliseert dit tot een intern `InboundMessage`-event → queue.
3. Orchestrator laadt context: korte-termijngeheugen (laatste N berichten), relevante lange-termijnherinneringen (semantische zoekopdracht), openstaande taken/doelen, tijd/datum, gebruikersprofiel.
4. Claude verwerkt het bericht **met tools** (zie §6) en beslist: antwoorden, een taak aanmaken, een herinnering plannen, een vraag terugstellen, of niets structureels doen (puur gesprek).
5. Response + eventuele side-effects (taak aangemaakt, reminder gepland) worden teruggestuurd via WhatsApp én gesynchroniseerd naar het dashboard.
6. Achtergrond: Memory Extraction Job analyseert het gesprek asynchroon nog eens grondiger (met een goedkoper model) voor feiten die de realtime-flow gemist heeft.

### 2.3 Proactieve cyclus (accountability)
1. Notification Engine draait continu (cron + event-driven) en evalueert: welke taken hebben een deadline die nadert, welke doelen zijn X dagen niet genoemd, welke gewoontes zijn "due" voor check-in.
2. Voor elke kandidaat wordt Claude aangeroepen om het bericht **te formuleren** (niet een vast sjabloon — dat voelt als bot). Prompt bevat: relatie-toon, geschiedenis van dit onderwerp, laatste keer dat erover gesproken is.
3. Bericht wordt verstuurd binnen de regels van het WhatsApp-berichtenbeleid (zie §8): binnen het 24-uursvenster vrij, daarbuiten via goedgekeurde template + vrije vervolgtekst.
4. Antwoord van gebruiker triggert weer de gewone cyclus (§2.2) — de loop is dus symmetrisch.

### 2.4 Webplatform-flow
- Login → Dashboard (persoonlijk, AI-gecureerd) → Taken/Doelen/Projecten/Memory/Instellingen/Notificaties.
- Dashboard is **read+correct**, niet primair "invoer". De gebruiker kan taken aanvinken, memory corrigeren/verwijderen, doelen bijstellen — maar de hoofdinvoer blijft het gesprek.

---

## 3. System Architecture

### 3.1 Overzicht (logische lagen)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Kanalen: WhatsApp (Meta Cloud API) · Web (Next.js) · [later: mail]  │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │ webhook (HTTPS)               │ REST/GraphQL + WS
┌───────────────▼───────────────┐   ┌────────────▼──────────────────┐
│  Channel Adapter Layer         │   │  Web API (Next.js API/Nest)   │
│  (verify signature, normalize) │   │  Auth, dashboard data, admin  │
└───────────────┬────────────────┘   └────────────┬─────────────────┘
                │  publish InboundMessage           │
┌───────────────▼────────────────────────────────────▼─────────────────┐
│                     Message Queue (Redis/BullMQ → later SQS/Kafka)    │
└───────────────┬────────────────────────────────────┬─────────────────┘
                │                                     │
┌───────────────▼───────────────┐   ┌──────────────────▼───────────────┐
│  Orchestration Worker           │   │  Notification/Accountability      │
│  - laadt context/memory         │   │  Worker (cron + event-driven)     │
│  - roept Claude aan met tools   │   │  - scant taken/doelen/gewoontes   │
│  - voert tool-calls uit         │   │  - laat Claude bericht opstellen  │
│  - schrijft resultaat weg       │   │  - verstuurt via adapter          │
└───────────────┬──────────────────┘   └──────────────────┬───────────────┘
                │                                          │
┌───────────────▼──────────────────────────────────────────▼──────────┐
│  Data Layer                                                          │
│  Postgres (Supabase): users, messages, tasks, goals, memory-facts     │
│  pgvector: semantische embeddings (long-term memory search)          │
│  Redis: sessie/short-term memory, rate limits, job state              │
│  Object storage (S3/Supabase Storage): media, attachments             │
└────────────────────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│  Observability & Admin: logs, cost tracking, error tracking, metrics  │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 Waarom deze indeling
- **Adapter-laag scheidt kanaal van kern** — noodzakelijk voor de Life OS-visie (§1.2).
- **Queue tussen webhook en verwerking** is niet optioneel: WhatsApp webhooks moeten binnen enkele seconden een 200 OK krijgen, terwijl een Claude-call met tools 2-8 seconden kan duren. Zonder queue loop je vast op timeouts en herhaalde webhook-retries van Meta.
- **Aparte worker voor proactieve berichten** — dit is fundamenteel ander gedrag (systeem-geïnitieerd i.p.v. gebruiker-geïnitieerd) en moet onafhankelijk kunnen schalen/falen van de reactieve flow.
- **Eén Postgres als bron van waarheid**, met pgvector erbovenop, in plaats van een aparte vector-DB vanaf dag 1: minder bewegende delen, makkelijker consistente transacties (taak + memory-fact in dezelfde commit), en Supabase geeft je Postgres + Auth + Storage + Realtime in één (en dit project gebruikt al Supabase — zie `supabase/` map in de repo).

### 3.3 Alternatieven overwogen

| Keuze | Alternatief | Waarom niet (nu) |
|---|---|---|
| Monoliet-achtige services in TS op één repo (turborepo) | Microservices per domein (auth-service, task-service, memory-service...) | Voorbarige complexiteit; bij <100k gebruikers levert het vooral operationele overhead op. Wel: services zijn nu al logisch gescheiden (adapter/orchestrator/notifier) zodat je later kunt opsplitsen zonder herontwerp. |
| Postgres + pgvector | Pinecone / Weaviate / Qdrant | Prima opties bij >~5-10M vectors of zware ANN-eisen. Tot ruim voorbij 100k gebruikers is pgvector met HNSW-index qua kosten en eenvoud beter — één minder systeem om te beheren en te beveiligen. |
| Redis + BullMQ voor queues | Kafka / AWS SQS+EventBridge vanaf dag 1 | Kafka is operationeel zwaar voor een team dat nog product-market fit zoekt. Redis/BullMQ is voldoende tot enkele honderdduizenden jobs/dag. Migratiepad naar SQS/Kafka is voorzien in fase 3 (§18). |
| Directe Meta Cloud API | Twilio WhatsApp API | Zie uitgebreide vergelijking §8. |

---

## 4. Database Design

### 4.1 Kernprincipe
Elke rij die persoonsdata bevat heeft `user_id` met **Row-Level Security (RLS)** aan in Supabase/Postgres — dit is de multi-user isolatiegrens (zie §5.7, §11).

### 4.2 Schema (vereenvoudigd, kern-tabellen)

```sql
-- Identiteit
users (
  id uuid pk,
  email text unique,
  phone_e164 text unique,           -- gekoppeld WhatsApp-nummer
  display_name text,
  timezone text,
  locale text,
  personality_preset text,          -- 'direct' | 'vriendelijk' | 'streng' | custom
  onboarding_state text,
  created_at timestamptz,
  status text                       -- active | paused | deleted
)

auth_identities ( id, user_id fk, provider, provider_id )   -- via Supabase Auth

-- Gesprekken (audit trail + short-term bron)
conversations ( id, user_id fk, channel text, started_at, last_message_at )
messages (
  id, conversation_id fk, user_id fk,
  role text,               -- 'user' | 'assistant' | 'system'
  channel text,             -- 'whatsapp' | 'web' | ...
  content text,
  tool_calls jsonb,         -- welke tools Claude aanriep in deze turn
  tokens_in int, tokens_out int, cost_usd numeric,
  created_at timestamptz
)

-- Memory (zie §6 voor volledig model)
memory_facts (
  id, user_id fk,
  type text,                -- 'preference' | 'relationship' | 'habit' | 'fact' | 'context'
  content text,
  embedding vector(1536),
  confidence numeric,
  source_message_id fk,
  valid_from timestamptz, valid_until timestamptz,  -- voor tijdgebonden/verouderende feiten
  created_at timestamptz, updated_at timestamptz
)

goals (
  id, user_id fk, title text, description text,
  horizon text,              -- 'lange_termijn' | 'dit_kwartaal' | 'deze_week'
  status text, created_at, target_date
)

tasks (
  id, user_id fk, goal_id fk nullable, parent_task_id fk nullable,  -- subtaken
  title text, description text,
  due_at timestamptz nullable,
  priority text,             -- 'low'|'medium'|'high'|'urgent'
  status text,               -- 'open'|'in_progress'|'done'|'snoozed'|'cancelled'
  source text,                -- 'explicit' | 'inferred' | 'dashboard'
  source_message_id fk nullable,
  created_at, updated_at, completed_at
)

habits ( id, user_id fk, title, cadence text, last_checked_in_at, streak_count )

reminders (
  id, user_id fk, task_id fk nullable, habit_id fk nullable,
  fire_at timestamptz, recurrence_rule text nullable,
  status text,               -- 'pending'|'sent'|'cancelled'
  message_style text
)

notifications_outbox (      -- alles wat de AI proactief wil versturen
  id, user_id fk, type text, payload jsonb,
  scheduled_at, sent_at, status, channel
)

projects ( id, user_id fk, title, description, status )
notes ( id, user_id fk, project_id fk nullable, content, created_at )

-- Admin / observability
system_events ( id, user_id fk nullable, level text, source text, payload jsonb, created_at )
api_usage ( id, user_id fk, provider text, model text, tokens_in, tokens_out, cost_usd, created_at )
feedback ( id, user_id fk, rating int, comment text, created_at )
```

### 4.3 Waarom relationeel + vector in één, en geen document-DB
Taken, doelen en herinneringen hebben harde relaties (task → goal, reminder → task) en moeten transactioneel consistent zijn ("maak taak + plan reminder" is één unit of work). Een document-store (Mongo) zou dit modelleerbaar maken maar mist de garanties die je hier wil. Postgres + pgvector geeft je beide: relationele integriteit én semantisch zoeken op `memory_facts.embedding`.

---

## 5. API Design

### 5.1 Structuur
Twee API-oppervlaktes:

1. **Interne Agent-API** (niet publiek): tools die Claude aanroept tijdens een gesprek — `create_task`, `update_task`, `search_memory`, `save_memory_fact`, `schedule_reminder`, `get_user_context`, `list_open_tasks`, `create_goal`, `log_habit_checkin`. Dit zijn geen HTTP-eindpunten voor de gebruiker, maar Claude tool-definities die intern naar de service-laag mappen.
2. **Publieke Web-API** (REST, versioned `/api/v1/...`) voor het dashboard:
   - `GET/PATCH /me`
   - `GET /tasks`, `PATCH /tasks/:id`
   - `GET /goals`, `GET /projects`
   - `GET /memory`, `DELETE /memory/:id` (recht op correctie/vergetelheid)
   - `GET /conversations/:id/messages` (leesbare geschiedenis)
   - `GET /insights` (AI-gegenereerde samenvattingen/patronen)
   - `GET /notifications`
   - Admin: `/admin/users`, `/admin/system-events`, `/admin/usage`, `/admin/costs` (apart geautoriseerd, zie §10)
3. **Realtime kanaal** (Supabase Realtime of WebSocket) zodat het dashboard live updatet wanneer de AI via WhatsApp een taak aanmaakt — geen polling nodig.

### 5.2 Waarom REST i.p.v. GraphQL
Bij dit datamodel zijn de queries voorspelbaar (dashboard-widgets met vaste vorm) en is het team klein. GraphQL's voordeel (flexibele client-queries) weegt niet op tegen de extra complexiteit (resolvers, N+1-beheer). REST + gerichte "aggregate" endpoints (`/dashboard-summary`) is sneller te bouwen en te beveiligen. Heroverweeg bij fase 3 als externe app-ontwikkelaars/partners toegang nodig hebben.

---

## 6. AI Memory Architecture

Dit is het hart van "voelt als een echte assistent, niet als een chatbot."

### 6.1 Lagen

| Laag | Opslag | Levensduur | Doel |
|---|---|---|---|
| **Working memory** | In-prompt (laatste N berichten uit huidig gesprek) | Één sessie/gesprek | Directe gesprekscontinuïteit |
| **Short-term memory** | Redis (samengevatte sessie-state, laatste 24-72u) | Dagen | "Wat speelde er recent" zonder elke keer de hele DB te bevragen |
| **Long-term structured memory** | Postgres `memory_facts`, `goals`, `habits`, `tasks` | Permanent (tot correctie/verwijdering) | Harde feiten: voorkeuren, doelen, relaties, gewoontes |
| **Long-term semantic memory** | pgvector embeddings over `memory_facts` + samengevatte gesprekken | Permanent | "Wanneer had ik het hier eerder over" — fuzzy recall |
| **Episodic log** | Postgres `messages` (volledige transcripten) | Permanent (met retentiebeleid/export/delete) | Audit, debugging, "toon me het gesprek van toen" |

### 6.2 Categorieën memory-facts
- **Voorkeuren** (communicatiestijl, ochtend-/avondmens, "niet appen na 22u")
- **Doelen** (lange termijn: "Spaans leren"; kortetermijn: "deze week 3 video's opnemen")
- **Gewoontes** (sporten, slapen, routines) + streaks
- **Relaties** (partner, collega's, naam van de hond — nodig voor natuurlijke gesprekken: "hoe ging het etentje met Anna?")
- **Projecten/context** (waar werkt de gebruiker aan, in welke fase)
- **Eerdere gesprekken** (samengevat, niet elk woord — samenvatting + embedding)

### 6.3 Hoe het geschreven wordt (extractie-pipeline)
Twee snelheden, bewust gescheiden om kosten te beheersen:

1. **Inline (synchroon, tijdens het gesprek):** Claude krijgt de tool `save_memory_fact` en `create_task` beschikbaar in élke beurt. Duidelijke signalen ("ik moet morgen...", "ik wil ooit...") worden meteen vastgelegd — dit voelt real-time en is waar de gebruiker gedrag direct van ziet.
2. **Asynchroon (achtergrondjob, na elk gesprek of elke N berichten):** een goedkoper model (Claude Haiku) analyseert de volledige transcriptie nogmaals, specifiek gepromot om subtielere feiten te vinden die de hoofdflow miste (bv. terloopse opmerkingen over stemming, relaties, voorkeuren). Dit voorkomt dat je het dure hoofdmodel bij elke beurt een zware "extraheer alles"-taak geeft.

### 6.4 Hoe het gelezen wordt (context-opbouw per beurt)
Bij elk inkomend bericht bouwt de orchestrator een prompt op uit:

1. **Systeemprompt** (identiteit, persoonlijkheid, gedragsregels, toolbeschrijvingen) — statisch, **prompt-cached** bij Anthropic voor kostenbesparing.
2. **Gebruikersprofiel-samenvatting** (kort, gestructureerd: naam, tijdzone, top-doelen, communicatiestijl) — semi-statisch, ook cachebaar.
3. **Relevante long-term memory** — top-k semantische matches op het huidige bericht (pgvector similarity search) + altijd de "vaste" feiten (actieve doelen/gewoontes).
4. **Openstaande taken/reminders die relevant zijn** (bv. als iets vervalt binnen 48u).
5. **Recent gespreksverloop** (working memory, laatste ~10-20 berichten).
6. **Het nieuwe bericht.**

Zie §12 voor de exacte prompt-structuur.

### 6.5 Vergeten, corrigeren, privacy
- Elk memory-fact is zichtbaar en verwijderbaar in het dashboard (`DELETE /memory/:id`).
- `valid_until` maakt tijdgebonden feiten vanzelf "verlopen" (bv. "werkt aan project X" na afronding).
- Volledige "vergeet mij"-flow (GDPR, zie §11) verwijdert episodic log + memory_facts + embeddings binnen een vaste termijn.

---

## 7. Task Management Engine

### 7.1 Taakdetectie
Taakdetectie gebeurt **niet** als aparte NLP-classificatiestap, maar via **Claude tool-use tijdens het normale gesprek**: het model krijgt tools `create_task`, `create_goal`, `create_subtasks`, `update_task`, `merge_tasks` en beslist zelf, geleid door de systeemprompt, wanneer een uitspraak een taak/doel impliceert.

Voorbeeldregels in de systeemprompt (samengevat, zie §12 voor volledige tekst):
- Concrete actie + (impliciete) tijdsdruk → `task` met `due_at` indien afleidbaar.
- Vage wens zonder tijdshorizon ("ooit Spaans leren") → `goal` met horizon `lange_termijn`, geen harde deadline.
- Grote taak met meerdere stappen → hoofdtaak + `create_subtasks`.
- Iets dat al bestaat en hierop lijkt → `merge_tasks` in plaats van dupliceren (Claude krijgt de lijst openstaande taken als context, zie §6.4 punt 4).

### 7.2 Prioriteit & planning
Prioriteit wordt bepaald door een combinatie van: expliciete urgentie-taal, deadline-nabijheid, koppeling aan een actief doel, en hoe vaak de gebruiker het onderwerp al genoemd heeft. Dit is een Claude-beslissing (met een tool `set_priority`), niet een hardgecodeerde regel-engine — regels alleen zouden nooit de nuance van natuurlijke taal vatten die dit product belooft.

### 7.3 Follow-up & voortgangscontrole (kern van "voelt als een assistent")
Elke taak/doel met een expliciete of impliciete termijn krijgt automatisch een **check-in reminder** in `reminders`, gepland door dezelfde tool-call die de taak aanmaakt (`schedule_reminder`). De Notification Worker (§3.1, §8.4) vuurt deze af; Claude formuleert het check-in bericht ad-hoc, met de taakgeschiedenis als context — vandaar dat het natuurlijk aanvoelt ("Vorige week wilde je de belasting doen. Is dat gelukt?") in plaats van een vaste sjabloonzin.

Antwoord op een check-in wordt weer normaal verwerkt (§2.2): "ja, gedaan" → `update_task(status=done)`; "nee, nog niet" → Claude beslist (zelf, met richtlijnen in de systeemprompt) of het opnieuw plant, de deadline aanpast, of doorvraagt naar een blokkade.

### 7.4 Achtergrond-consistentiejob
Naast de realtime flow draait een dagelijkse job die:
- taken zonder follow-up binnen X dagen alsnog een reminder geeft (vangnet als de realtime-flow iets miste);
- verlopen deadlines signaleert;
- losse, gerelateerde taken voorstelt om samen te voegen (voorstel aan gebruiker, niet automatisch — belangrijke data wordt nooit stilzwijgend samengevoegd).

---

## 8. WhatsApp Architecture

### 8.1 Vergelijking telefoonnummer-opties

| Optie | Schaalbaarheid | Kosten | Proactief bericht mogelijk? | Beheer | Advies |
|---|---|---|---|---|---|
| **Fysieke telefoon + WhatsApp personal/Business app** | Zeer laag — geen officiële API, geen automatisering zonder ToS-schending (browser-automation/scraping-achtige oplossingen), account-ban-risico | "Gratis" maar in praktijk zeer hoog risico (verlies van het nummer = verlies van alle gebruikers) | Nee, niet betrouwbaar/legaal schaalbaar | Handmatig, niet multi-user | **Afraden**, zelfs niet voor een prototype — het risico dat Meta het account bant is te groot voor een product met betalende gebruikers. |
| **Twilio (WhatsApp via Twilio)** | Goed, maar Twilio is een extra laag boven Meta's Cloud API met eigen pricing-opslag en een extra afhankelijkheid | Hoger dan direct (Twilio marge bovenop Meta's conversatiekosten), plus Twilio-eigen platformkosten | Ja (via Meta's onderliggende template-systeem) | Eenvoudiger DX, goede docs, snel te starten | Prima voor een **snelle MVP/prototype** (dagen i.p.v. weken opzet), maar duurder op schaal en een extra vendor. |
| **Meta Cloud API (direct, WhatsApp Business Platform)** | Zeer goed — is de officiële, door Meta gehoste API, ontworpen voor bulk/schaal | Laagste kosten op schaal (geen tussenlaag-marge), conversatie-gebaseerde pricing rechtstreeks bij Meta | Ja, native (template messages voor het 24u-venster, vrij bericht binnen venster) | Vereist WhatsApp Business Account + app review bij Meta, iets meer opzetwerk, maar eenmalig | **Aanbevolen voor het echte product.** Beste kosten/schaal-verhouding, geen extra vendor-laag. |
| **Andere BSP's (bv. 360dialog, MessageBird, Vonage, Gupshup)** | Vergelijkbaar met Twilio: managed laag boven Meta | Vergelijkbaar met Twilio, soms iets goedkoper | Ja | Vaak net iets goedkoper dan Twilio, wisselende kwaliteit tooling | Alternatief als je liever geen Twilio-lock-in wil maar ook niet zelf de Meta-integratie wil onderhouden. |

**Concreet advies:** start development/MVP eventueel via Twilio (snelste opzet, goede sandbox), maar bouw de adapter-interface zo (§3.1) dat je bij launch naadloos naar **directe Meta Cloud API** overstapt — dat is de enige optie die logisch schaalt naar honderdduizenden gebruikers tegen beheersbare kosten. Gebruik de fysieke telefoon *niet* voor het product zelf; hooguit als een van de teamleden zijn eigen nummer gebruikt om het eindresultaat handmatig te testen zoals een gebruiker het ervaart.

### 8.2 Berichtenbeleid — het belangrijkste technische detail voor "proactief"
WhatsApp/Meta kent een harde regel: binnen **24 uur** na het laatste bericht van de gebruiker mag je vrij (session message) antwoorden. Daarbuiten mag je alleen een vooraf door Meta **goedgekeurd template-bericht** sturen om het gesprek te heropenen (bv. "Hé, tijd voor je wekelijkse check-in — reageer om verder te praten"). Dit is precies waarom de Notification Engine (§8.4) template-categorieën moet beheren:

- **Utility templates**: functionele reminders/accountability-berichten (dit is de hoofdcategorie voor dit product).
- **Marketing templates**: alleen relevant voor groei/re-engagement, niet voor kernfunctionaliteit.
- Zodra de gebruiker reageert, is het venster weer 24u open en verloopt het gesprek volledig natuurlijk/vrij — dus in de praktijk voelt het voor actieve gebruikers zelden als "een bot die alleen sjablonen kan sturen".

### 8.3 Multi-user & identiteit
- Elk inkomend WhatsApp-bericht bevat de afzender (`wa_id`, E.164-nummer) → directe lookup naar `users.phone_e164`.
- Eén Meta-telefoonnummer bedient **alle gebruikers** tegelijk (dit is hoe WhatsApp Business API werkt — niet één nummer per gebruiker). De adapter routeert puur op basis van het afzendernummer naar de juiste `user_id` en diens geïsoleerde context/memory.
- Nieuw, onbekend nummer → onboardingsflow (§2.1) start automatisch.

### 8.4 Proactief berichten — technisch
Notification Worker (cron, elke paar minuten) query't `reminders` + `notifications_outbox` op `fire_at <= now()`, roept Claude aan om de exacte bewoording te genereren (met volledige context van het onderwerp), en verstuurt via de adapter. Rate-limiting per gebruiker (max N proactieve berichten/dag, instelbaar door gebruiker in dashboard) voorkomt dat de assistent opdringerig aanvoelt — dit is een expliciete, door de gebruiker instelbare grens, cruciaal voor "voelt als hulp, niet als spam".

### 8.5 Persoonlijkheden
`users.personality_preset` + een set finetune-parameters (toon, formaliteit, humor, directheid) worden in de systeemprompt geïnjecteerd (§12). Dit is prompt-gestuurd, geen apart model per persoonlijkheid — houdt kosten en onderhoud laag terwijl het gevoel van "eigen assistent" behouden blijft.

---

## 9. Dashboard Design

### 9.1 Principe: AI-gecureerd, niet statisch
Het dashboard heeft een vaste **layout-engine** met een set beschikbare widgets (doelen, taken, prioriteiten, herinneringen, projecten, notities, agenda, inzichten, statistieken, voortgang). Welke widgets zichtbaar zijn, in welke volgorde, en met welke nadruk, wordt bepaald door een `dashboard_state`-record dat de AI zelf bijwerkt (via een tool `update_dashboard_focus`) op basis van wat op dit moment relevant is — bv. een naderende deadline duwt de takenwidget bovenaan, een net afgerond doel triggert een "voortgang"-kaart.

Technisch: widgets zijn **data-gedreven componenten** (React/Next.js) die een generieke `DashboardLayout`-API consumeren (`GET /dashboard-summary` → JSON met widget-volgorde + payload per widget). Dit voorkomt dat "AI bepaalt de UI" een engineering-nachtmerrie wordt: de AI kiest uit een **begrensde set** vooraf gebouwde widget-types en parameters, niet vrije UI-generatie.

### 9.2 Voordelen/nadelen van deze aanpak
- **Voordeel:** voelt persoonlijk en dynamisch zonder dat je willekeurige AI-gegenereerde UI hoeft te renderen (risico op bugs/inconsistentie).
- **Nadeel:** begrensd tot vooraf ontworpen widget-types — een bewuste trade-off tussen flexibiliteit en betrouwbaarheid/onderhoudbaarheid.

### 9.3 Realtime sync
Supabase Realtime (of WebSocket) zorgt dat een taak die via WhatsApp wordt aangemaakt **direct** in het open dashboard verschijnt zonder herladen.

---

## 10. Admin Dashboard

Alles wat niet voor WhatsApp geschikt is (operationeel, technisch, bedrijfskritisch) hoort hier, afgeschermd achter een apart admin-rollensysteem (niet dezelfde auth-scope als reguliere gebruikers):

- **Systeemstatus:** queue-lengtes, worker-health, API-foutratio's, uptime per component.
- **Gebruikers:** overzicht, zoekbaar, per gebruiker: activiteit, laatste gesprek, aantal taken, memory-omvang, kosten-per-gebruiker.
- **Gesprekken:** doorzoekbare transcripten (met privacy-gate/audit-log op wie dit inziet — zie §11).
- **Fouten & logs:** gestructureerde logging (bv. via Sentry + eigen `system_events`-tabel), alerts bij spikes.
- **AI-activiteiten:** welke tools het meest worden aangeroepen, hoe vaak taken automatisch samengevoegd/aangepast worden, hallucinatie-signalen (bv. een tool-call die faalde op validatie).
- **Notificaties:** wat is verstuurd, wat is de open/antwoordratio (proxy voor "voelt dit als spam of als hulp").
- **Analytics:** retentie, DAU/MAU, gesprekslengte, taakvoltooiingsratio.
- **API-gebruik & Claude-kosten:** per model, per gebruiker, per dag — cruciaal omdat Claude-kosten de grootste variabele kostenpost zijn (§14).
- **Feedback & bugreports:** in-dashboard formulier + eventueel een WhatsApp-commando ("feedback: ...") dat direct hier binnenkomt.

Bouw dit als een los admin-app binnen dezelfde monorepo (aparte Next.js-route-group of los deployment-target), nooit toegankelijk voor reguliere gebruikersrollen — RBAC afgedwongen op zowel API- als databaseniveau (RLS-policy `role = 'admin'`).

---

## 11. Security

### 11.1 Dreigingsmodel — wat is hier echt gevoelig
Dit product verzamelt intiemere data dan een gemiddelde SaaS: gezondheid, relaties, financiën, mentale toestand, dagelijkse locatie-achtige routines. Behandel het qua beveiligingsniveau dichter bij "gezondheidsapp" dan bij "productiviteitstool".

### 11.2 Maatregelen
- **Encryptie:** TLS overal in transit; encryption-at-rest via de managed Postgres (Supabase/RDS); overweeg **veld-niveau encryptie** voor de gevoeligste `memory_facts.content`-categorieën (relaties, gezondheid) met een KMS-beheerde sleutel, zodat zelfs een DB-dump niet direct leesbaar is.
- **Authenticatie:** Supabase Auth (of Clerk) met MFA-optie voor het dashboard; WhatsApp-identiteit is nummer-gebonden — voeg een **device/SIM-swap-waakzaamheid** toe (bij verdachte gedragsverandering op een nummer, vraag her-verificatie).
- **Autorisatie:** Row-Level Security in Postgres als harde grens tussen gebruikers — nooit alleen op applicatieniveau filteren.
- **Secrets management:** platform secret store (Vercel/Fly/AWS Secrets Manager), nooit in repo; Claude API-key en Meta-tokens roteerbaar zonder downtime.
- **Prompt-injectie & tool-misbruik:** WhatsApp-berichten zijn user input die naar Claude's tool-use gaat — behandel elk bericht als potentieel adversarial. Tools hebben **server-side validatie** (bv. `create_task` kan nooit code uitvoeren, `update_task` kan alleen taken van de aanroepende `user_id` wijzigen) zodat een prompt-injectiepoging in een bericht nooit tot cross-user side effects kan leiden.
- **GDPR (EU-gebruikers, o.a. de proceseigenaar zelf):** recht op inzage (dashboard toont alle memory), recht op correctie (edit/delete per fact), recht op vergetelheid (volledige data-verwijdering binnen contractuele termijn, inclusief backups-rotatie), dataminimalisatie (geen onnodige velden bewaren "voor later"), verwerkersovereenkomsten met Anthropic/Meta/Supabase (alle drie bieden DPA's).
- **Audit-logging:** elke keer dat een mens (support/admin) een gespreks-transcript inziet, wordt dat gelogd — dit is niet optioneel gezien de gevoeligheid van de data.
- **Rate limiting & misbruikbeveiliging:** per-nummer en per-IP rate limits op zowel WhatsApp-webhook als web-API, tegen zowel misbruik als kostenexplosie via herhaalde Claude-calls.

---

## 12. Claude-architectuur & prompt-opbouw

### 12.1 Modelkeuze per taak
Niet elke taak verdient het duurste model:

| Taak | Model | Reden |
|---|---|---|
| Hoofdgesprek (real-time, met tools) | Claude Sonnet (nieuwste) | Beste balans kwaliteit/latency/kosten voor conversatie + tool-use |
| Achtergrond memory-extractie, samenvatten | Claude Haiku | Hoog volume, lagere nuance-eisen, kosten drukken |
| Complexe planning/patroonherkenning (wekelijkse review, conflict-detectie over meerdere doelen) | Claude Sonnet of Opus, async | Gebeurt niet per bericht maar periodiek — kwaliteit weegt zwaarder dan latency |

### 12.2 Prompt-opbouw per beurt (concreet)
1. **System prompt (statisch deel, prompt-cached):** identiteit ("Je bent [naam]'s persoonlijke assistent..."), gedragsregels (toon, wanneer taken aanmaken, wanneer doorvragen, privacyregels, hoe om te gaan met onzekerheid — nooit verzinnen dat een taak is afgerond), tool-definities.
2. **Persoonlijkheidslaag (semi-statisch, per user cached):** communicatiestijl-parameters uit `users.personality_preset`.
3. **Gebruikersprofiel-samenvatting:** compacte, door een achtergrondjob periodiek geregenereerde samenvatting (niet elke keer alle ruwe memory-rijen — te duur en te ruisig).
4. **Opgehaalde relevante memory** (top-k pgvector-resultaten op het huidige bericht + actieve doelen/gewoontes).
5. **Openstaande taken/reminders relevant voor nu** (vervalt binnen 48u, of tekstueel gerelateerd aan het inkomend bericht).
6. **Recente gespreksgeschiedenis** (laatste N turns).
7. **Het nieuwe bericht + metadata** (tijdstip, kanaal).

Claude antwoordt met tekst **en/of** tool-calls (`create_task`, `save_memory_fact`, `schedule_reminder`, `set_priority`, `update_dashboard_focus`, ...). De orchestrator voert tool-calls uit tegen de service-laag, retourneert resultaten aan Claude (multi-turn tool loop) en stuurt pas de uiteindelijke tekst als WhatsApp-bericht.

### 12.3 Prompt caching en kosten
Anthropic's prompt caching op het statische system-prompt-deel (§12.2.1-2) is essentieel op schaal: bij duizenden gebruikers met elk tientallen berichten per dag is het systeemprompt-gedeelte de grootste constante kostenpost als het niet gecached wordt. Structureer de prompt dus bewust: **stabiele content eerst, variabele content laatst** (memory/geschiedenis/nieuw bericht), zodat het cache-prefix maximaal herbruikt wordt.

### 12.4 Autonomie-lus (patronen, suggesties, conflicten)
Een aparte, periodieke ("weekly review") achtergrondtaak geeft Claude een bredere blik: alle openstaande taken/doelen van een gebruiker, gevraagd om patronen te signaleren (herhaaldelijk uitgestelde taken, conflicterende doelen zoals "meer sporten" + "elke avond laat werken", vergeten langetermijndoelen). Output: voorstellen die als **suggesties** (niet automatische wijzigingen) naar de gebruiker gaan — belangrijk ontwerpprincipe: de AI mag autonoom *observeren en voorstellen*, maar structurele wijzigingen aan doelen/taken worden altijd expliciet bevestigd door de gebruiker, behalve de laagrisico-acties (taak aanmaken vanuit een expliciete uitspraak, reminder plannen).

---

## 13. Tech Stack (concreet)

| Laag | Keuze | Alternatief overwogen |
|---|---|---|
| Web frontend | Next.js (React, TypeScript), Tailwind + shadcn/ui (sluit aan bij bestaande stijl in deze repo) | Remix, plain Vite SPA |
| Web hosting | Vercel | Netlify, Cloudflare Pages |
| Backend/API | Node.js + TypeScript (Next.js API routes / NestJS voor grotere services) | Python/FastAPI (overwegen als AI/data-team Python-voorkeur heeft) |
| Orchestration workers | Node.js/TypeScript, Anthropic TypeScript SDK | Python (Anthropic SDK ook volwassen in Python) |
| Database | PostgreSQL via Supabase (+ pgvector) | Neon, AWS RDS, PlanetScale (geen native pgvector-vergelijkbare optie) |
| Auth | Supabase Auth | Clerk, Auth0 |
| Cache/queue | Redis (Upstash/managed) + BullMQ | AWS SQS (later, zie §18) |
| Object storage | Supabase Storage / S3 | Cloudflare R2 |
| WhatsApp | Meta Cloud API direct (start evt. Twilio) | 360dialog, MessageBird |
| AI | Anthropic Claude API (Sonnet + Haiku) | — (kernvereiste van dit project) |
| Observability | Sentry (errors) + eigen `system_events` + Grafana/Prometheus of Axiom/Datadog voor metrics | — |
| CI/CD | GitHub Actions → Vercel + Fly.io/Railway deploy | GitLab CI |

---

## 14. Deployment

- **Frontend + lichte API-routes:** Vercel (edge-dichtbij, automatische scaling, past bij Next.js).
- **Langlopende workers (orchestrator, notification engine, WhatsApp-webhookverwerker):** Fly.io of Railway in MVP-fase (snel, goedkoop, weinig ops-overhead); migratiepad naar AWS ECS/Fargate wanneer volume/compliance dat vraagt (§18).
- **Database/Auth/Storage:** Supabase (managed Postgres), met een duidelijk exit-pad naar zelfgehoste Postgres/RDS mocht dat ooit nodig zijn (Supabase is Postgres-compatibel, geen lock-in op querytaal).
- **Secrets & config:** platform-native secret stores per omgeving (dev/staging/prod), nooit gedeeld tussen omgevingen.
- **Omgevingen:** dev → staging (met een test-WhatsApp-nummer/sandbox) → productie. WhatsApp-template-berichten moeten door Meta worden goedgekeurd — reken dit mee in de planning (dagen doorlooptijd).
- **CI/CD:** GitHub Actions: lint/test/typecheck → preview-deploy (Vercel) per PR → productie-deploy op merge naar main, met migratie-stap (Supabase/Prisma migrations) vóór de app-deploy.

---

## 15. Kosteninschatting

Alle bedragen zijn indicatief (USD, 2026-prijsniveau) en bedoeld om architecturale beslissingen te onderbouwen, niet als offerte.

### 15.1 Variabele kosten per actieve gebruiker/maand (schatting, gemiddeld gebruik: ~15-25 berichten/dag incl. proactieve berichten)
- **Claude API:** met prompt caching en het Sonnet/Haiku-mix-model, reken op een orde-grootte van **$1,50 – $4,00 per actieve gebruiker/maand** bij gemiddeld gebruik. Zware gebruikers (50+ berichten/dag, lange geschiedenis) kunnen dit fors overstijgen zonder caching-discipline — vandaar de nadruk in §12.3.
- **WhatsApp (Meta Cloud API), conversatie-gebaseerde pricing:** utility-conversaties (accountability/reminders) zijn de dominante categorie hier; reken indicatief **$0,20 – $0,60 per actieve gebruiker/maand** afhankelijk van regio en volume aan systeem-geïnitieerde gesprekken. Reactieve gesprekken die de gebruiker zelf opent zijn doorgaans goedkoper/gratis binnen bepaalde categorieën — check de actuele Meta-pricing per regio bij implementatie, dit verandert regelmatig.
- **Infra (DB/queue/storage/compute) op schaal (>10k gebruikers):** typisch **$0,15 – $0,40 per gebruiker/maand**, sterk dalend naarmate je schaalt (vaste kosten worden gedeeld).

**Indicatieve totale variabele kostprijs: ~$2 – $5 per actieve gebruiker/maand** bij gezonde schaal — dit is de kern-KPI om een prijsmodel op te baseren (bv. €15-25/maand abonnement geeft ruime marge boven kostprijs, met budget voor support/groei).

### 15.2 Vaste/team-kosten
- Vroege fase (MVP): monitoring/observability tools, Meta Business-verificatie, domeinen/certificaten — enkele honderden dollars/maand.
- Team: dit is de dominante kostenpost in de eerste 12 maanden, niet infra — bouw de MVP-scope (§16) daarom bewust klein.

### 15.3 Belangrijkste kostenrisico's
1. **Ongecachete/inefficiënte prompts** — kan Claude-kosten 3-5x opdrijven. Mitigatie: §12.3, plus een kosten-alert per gebruiker in het admin-dashboard (§10).
2. **Te veel proactieve WhatsApp-berichten** — kost geld én verhoogt churn/opt-out. Mitigatie: gebruikersinstelbare frequentie-caps (§8.4).
3. **Onbegrensde geheugengroei** — elke extra memory-fact in de contextopbouw kost tokens bij elk volgend bericht. Mitigatie: samenvatting i.p.v. ruwe opstapeling (§12.2.3), periodieke consolidatie van oude memory.

---

## 16. MVP-roadmap (Fase 1, richttermijn 8-12 weken)

**Doel:** bewijzen dat de kernlus (gesprek → memory → taak → follow-up) daadwerkelijk als "persoonlijke assistent" aanvoelt voor een kleine groep testgebruikers (tientallen, niet duizenden).

Scope:
1. WhatsApp-koppeling (start via Twilio voor snelheid, of direct Meta Cloud API als team daar ervaring mee heeft) — inbound/outbound berichten, webhook, adapter-laag.
2. Claude-orchestrator met kern-tools: `create_task`, `update_task`, `save_memory_fact`, `search_memory`, `schedule_reminder`.
3. Postgres-schema (§4) + pgvector, basis long-term memory werkend.
4. Eenvoudige onboardingsflow via WhatsApp (§2.1).
5. Notification worker met **één** accountability-patroon werkend end-to-end (taak-deadline check-in) — bewust niet alle patronen tegelijk.
6. Web-dashboard v0: login, taken-overzicht, memory-overzicht (lezen + verwijderen), instellingen (persoonlijkheid, notificatiefrequentie).
7. Minimale admin-dashboard: gebruikerslijst, foutlogs, Claude-kosten per gebruiker (dit heb je vanaf dag 1 nodig om kosten te bewaken).
8. Basis-beveiliging: RLS, auth, secrets-beheer, GDPR-basis (export/verwijderen).

**Expliciet niet in MVP:** dynamische AI-gecureerde dashboard-layout (§9, statische layout is prima voor MVP), multi-kanaal, geavanceerde patroonherkenning/weekly-review (§12.4), subtaken-automatisering, meerdere persoonlijkheden anders dan 1-2 presets.

---

## 17. Fase 2

**Doel:** van "werkt" naar "voelt onmisbaar".

- Volledige accountability-suite (§2.3, §7.3): meerdere check-in-patronen, gebruikersinstelbare gevoeligheid.
- Dynamisch, AI-gecureerd dashboard (§9) i.p.v. statische layout.
- Volwaardig admin-dashboard (§10): analytics, feedback-loop, alerting.
- Weekly-review autonomie-laag (§12.4): patronen, conflicten, vergeten taken terughalen.
- Subtaken/samenvoegen-automatisering volledig uitgewerkt (§7.1).
- Betaald abonnementsmodel + facturatie (Stripe), gebruikslimieten per tier.
- Overstap (indien nog niet gedaan) naar directe Meta Cloud API voor kostenschaal.
- Uitbreiding personality-presets + door gebruiker fijn instelbare toon.

## 18. Fase 3

**Doel:** de "AI Life OS"-belofte waarmaken — WhatsApp wordt één kanaal van meerdere.

- **Multi-channel:** e-mail-adapter, Telegram-adapter, agenda-integratie (Google/Outlook Calendar — lezen én plannen), later spraak (voice-notes in/out, evt. bellen).
- **Native apps** (iOS/Android) als extra kanaal + rijkere dashboard-ervaring on-the-go, bovenop dezelfde Core Agent/Memory — dit is precies waar de adapter-architectuur (§1.2, §3.1) zich terugbetaalt.
- **Team/gezins-varianten:** gedeelde doelen/projecten tussen gekoppelde accounts (met strikte, opt-in privacygrenzen per memory-categorie).
- **Diepere tool-integraties:** e-mail namens gebruiker opstellen (concept, nooit automatisch versturen zonder bevestiging), agenda-conflicten actief oplossen, eventueel derde-partij-integraties (Notion, Slack) als tools.
- **Migratie naar zwaardere infrastructuur** waar nodig (§18 hieronder).

---

## 18. Schaalbaarheid naar 100.000+ gebruikers

### 18.1 Waar de architectuur eerst gaat knellen
1. **Claude-kosten & latency bij volume** → prompt caching (§12.3) is dan niet optioneel maar verplicht; overweeg batching van niet-tijdkritische achtergrondtaken (memory-extractie, weekly review) via de Batches API voor extra kostenreductie.
2. **Postgres schrijf-load** (elk bericht, elke tool-call, elke reminder-check) → read-replicas voor het dashboard/admin-leeswerk, connection pooling (PgBouncer/Supabase Supavisor), en op termijn partitionering van `messages`/`system_events` op tijd.
3. **pgvector bij zeer grote embeddingvolumes** → monitor query-latency; migreer naar een dedicated vector-store (Qdrant/Pinecone) pas wanneer HNSW-index-tijden echt een probleem worden (typisch ruim voorbij 10-50M vectors) — voortijdig migreren kost meer dan het oplevert.
4. **Redis/BullMQ-queue-doorvoer** → bij honderdduizenden jobs/dag migreren naar SQS/EventBridge of Kafka voor betere doorvoer- en herafspeel-garanties; de worker-code blijft grotendeels gelijk als je de queue-interface abstraheert (belangrijk: doe dit abstraheren al in de MVP).
5. **WhatsApp-doorvoer-limieten** → Meta hanteert messaging-tier-limieten die meegroeien met een goede kwaliteitsscore (lage blokkeer-/opt-out-ratio) — bewaak dit actief in het admin-dashboard, want een slechte score kan je effectieve schaal hard beperken ongeacht je eigen infra.
6. **Multi-region:** bij internationale groei, overweeg regionale API-routing (EU/US) voor latency én voor datalocatie-compliance (GDPR-gebruikers' data in de EU houden).

### 18.2 Horizontale schaalprincipes die vanaf dag 1 ingebouwd zitten
- Stateless workers (alle sessie-state in Redis/Postgres, niet in-memory) → triviaal horizontaal op te schalen.
- Queue-gebaseerde ontkoppeling (§3.1) → elke laag schaalt onafhankelijk.
- RLS + `user_id`-partitionering in elke tabel → voorbereidt op eventuele database-sharding per gebruikersgroep, mocht dat ooit nodig zijn.
- Model-tiering (Sonnet/Haiku, §12.1) → kostencurve blijft sub-lineair met gebruikersgroei.

---

## 19. Mogelijke problemen en oplossingen

| Probleem | Risico | Oplossing |
|---|---|---|
| Claude verzint dat een taak is afgerond of een feit onjuist onthoudt (hallucinatie) | Vertrouwen in het product breekt | Tools zijn de enige bron van waarheid voor state-wijzigingen (Claude kan nooit "doen alsof" — elke wijziging gaat via een tool-call met serverside validatie); onzekerheids-instructies in system prompt ("vraag door bij twijfel, claim nooit zonder bevestiging") |
| Gebruiker vindt proactieve berichten opdringerig | Churn, opt-out, slechte WhatsApp-kwaliteitsscore | Instelbare frequentie/stilte-uren per gebruiker (§8.4), duidelijke onboarding-uitleg, makkelijke "minder/vaker"-feedback direct in het gesprek |
| WhatsApp-account-kwaliteitsscore daalt (block/report-ratio) | Beperkt effectief bericht-volume, kan hele product platleggen | Monitoring in admin-dashboard, opt-out altijd makkelijk maken (verlaagt reports), nooit ongevraagd marketing-achtige content |
| Memory groeit ongecontroleerd, prompt-kosten lopen op | Marge verdwijnt op zware gebruikers | Periodieke consolidatie/samenvatting van oude memory (§6.3), caps + admin-alerts (§15.3) |
| Privacygevoelige data lekt via logging/debugging | Reputatieschade, mogelijk datalek-meldplicht | Redactie van PII in logs, streng RBAC op transcript-inzage + audit-log (§11) |
| Eén WhatsApp-nummer als single point of failure (Meta-suspensie) | Volledige productuitval | Zorg dat account in goede standing blijft (policy-compliance), houd een noodprocedure/tweede geregistreerd nummer achter de hand, communiceer via e-mail-kanaal als noodpad zodra dat kanaal (fase 3) bestaat |
| Prompt-injectie via berichtinhoud probeert tool-misbruik | Cross-user data-exposure, ongeautoriseerde acties | Server-side authorisatie op elke tool-call (nooit vertrouwen op wat het model "beweert" over user_id), input-validatie, least-privilege tool-scopes |
| Kosten per gebruiker onvoorspelbaar bij launch | Prijsmodel klopt niet, marge negatief | Vanaf MVP al per-gebruiker kostentracking in admin-dashboard (§10, §15.3), zachte gebruikslimieten per abonnementstier |
| Team bouwt te vroeg voor schaal die er nog niet is | Trage MVP, verspilde tijd | Volg de fasering strikt (§16-18): pgvector i.p.v. losse vector-DB, Redis i.p.v. Kafka, monoliet-achtige services i.p.v. microservices — totdat metrics een migratie daadwerkelijk rechtvaardigen |

---

## 20. Concrete aanbevelingen en best practices

1. **Bouw de adapter-laag (§3.1) vanaf dag 1**, ook al heb je alleen WhatsApp. Dit is de goedkoopste verzekering tegen een herbouw in fase 3.
2. **Elke state-wijziging via een tool-call, nooit via tekst-parsing van Claude's antwoord.** Dit is je grootste betrouwbaarheids- en beveiligingsgarantie.
3. **Investeer vroeg in kostenmonitoring per gebruiker** (§10, §15) — dit is de metric die bepaalt of het businessmodel houdbaar is, en je wilt het niet pas ontdekken bij 10.000 gebruikers.
4. **Gebruik prompt caching en model-tiering (Sonnet/Haiku) als architecturaal principe, niet als latere optimalisatie** — het scheelt een orde van grootte in kosten en is duur om er later in te herstructureren.
5. **Ga direct voor Meta Cloud API als je binnen enkele maanden na MVP wil schalen**; gebruik Twilio alleen als bewust tijdelijke snelheidswinst, met een duidelijke exit-datum.
6. **Behandel memory-correctie en -verwijdering als kernfeature, niet als compliance-bijzaak** — het vertrouwen van de gebruiker ("de AI onthoudt me correct én ik heb controle") is het product.
7. **Beperk AI-autonomie tot voorstellen bij structurele wijzigingen** (§12.4); alleen laagrisico, expliciet-geïmpliceerde acties (taak aanmaken uit een duidelijke uitspraak) mogen volledig automatisch — dit voorkomt het "de AI deed iets raars zonder dat ik het snapte"-gevoel dat vertrouwen breekt.
8. **Meet vanaf de MVP het juiste succes-signaal**: niet DAU, maar **taakvoltooiingsratio en accountability-respons-ratio** — die tonen of het product daadwerkelijk gedrag verandert, wat de kern van de belofte is.
9. **Houd de systeemprompt en tool-set onder versiebeheer met changelog** — bij een product waar gedrag zo bepalend is voor "voelt het als een assistent", is elke promptwijziging in feite een productrelease en verdient het dezelfde discipline (staging-test, geleidelijke rollout).
10. **Design nu al voor multi-channel, bouw nu alleen WhatsApp** — de discipline zit in wat je *niet* bouwt in v1 (§1.3, §16), niet in het vooruit bouwen van kanalen die je nog niet nodig hebt.

---

*Einde document. Dit is een ontwerpbasis — aanbevolen vervolgstap is een technische spike van 1-2 weken op de kernlus (§2.2: WhatsApp-bericht → Claude met tools → taak/memory → antwoord) om aannames over latency en Claude-toolgebruik in de praktijk te valideren voordat de volledige MVP-scope (§16) wordt gebouwd.*
