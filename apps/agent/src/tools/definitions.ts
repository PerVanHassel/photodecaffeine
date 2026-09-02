import type Anthropic from "@anthropic-ai/sdk";

// Tool schemas exposed to Claude. Keep names/descriptions in sync with the
// handlers in handlers.ts and with the behaviour rules in claude/prompt.ts.
export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "create_task",
    description:
      "Registreer een taak die de gebruiker moet doen. Gebruik dit zodra iemand een concrete actie noemt, ook als hij niet letterlijk 'maak een taak' zegt (bv. 'ik moet morgen de tandarts bellen'). Vraag NIET eerst om bevestiging voor een duidelijk afgeleide taak -- registreer hem en meld het kort.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Korte, actiegerichte titel, bv. 'Tandarts bellen'." },
        description: { type: "string", description: "Optionele extra context uit het gesprek." },
        due_at: {
          type: "string",
          description:
            "ISO 8601-tijdstip als er een deadline af te leiden is (bv. 'morgen', 'volgende week'). Laat weg als er geen tijdsindicatie is.",
        },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        source: {
          type: "string",
          enum: ["explicit", "inferred"],
          description: "'explicit' als de gebruiker expliciet om een taak vroeg, anders 'inferred'.",
        },
      },
      required: ["title", "source"],
    },
  },
  {
    name: "create_goal_as_task",
    description:
      "Registreer een langetermijndoel zonder harde deadline (bv. 'ik wil ooit Spaans leren'). Gebruikt dezelfde tabel als taken maar zonder due_at en met priority 'low', zodat het niet als urgente taak verschijnt.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description:
      "Werk een bestaande taak bij, bv. status op 'done' zetten na een check-in-antwoord, of een deadline verzetten. Gebruik list_open_tasks eerst als je het task_id niet zeker weet.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        status: { type: "string", enum: ["open", "in_progress", "done", "snoozed", "cancelled"] },
        due_at: { type: "string", description: "Nieuwe ISO 8601-deadline." },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      },
      required: ["task_id"],
    },
  },
  {
    name: "list_open_tasks",
    description:
      "Haal de openstaande taken/doelen van de gebruiker op. Gebruik dit voordat je een nieuwe taak aanmaakt om duplicaten te herkennen, en om te weten waar je op terug kunt vragen.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max aantal resultaten, standaard 20." },
      },
    },
  },
  {
    name: "save_memory_fact",
    description:
      "Leg een blijvend feit over de gebruiker vast: voorkeur, gewoonte, relatie, of context. Gebruik dit bij elke terloopse maar herbruikbare informatie ('ik hou niet van 's ochtends bellen', 'mijn partner heet Anna'). Maak hier geen taken van.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["preference", "relationship", "habit", "fact", "context"] },
        content: { type: "string", description: "Compacte, op zichzelf staande beschrijving van het feit." },
      },
      required: ["type", "content"],
    },
  },
  {
    name: "search_memory",
    description:
      "Zoek eerder opgeslagen feiten over de gebruiker die relevant zijn voor het huidige gesprek.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Waar zoek je op, bv. 'sportgewoontes' of 'partner'." },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "schedule_reminder",
    description:
      "Plan een toekomstige check-in of herinnering. Gebruik dit bij het aanmaken van een taak met deadline (plan een check-in kort erna), en wanneer de gebruiker zelf om een herinnering vraagt.",
    input_schema: {
      type: "object",
      properties: {
        fire_at: { type: "string", description: "ISO 8601-tijdstip waarop de herinnering moet afgaan." },
        note: { type: "string", description: "Korte notitie over waar de herinnering over gaat." },
        task_id: { type: "string", description: "Optioneel: koppel aan een bestaande taak." },
      },
      required: ["fire_at", "note"],
    },
  },
];
