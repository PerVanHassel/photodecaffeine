import legal from "./legal.json";

/**
 * Privacyverklaring en algemene voorwaarden, als concept van 12-10-2026.
 *
 * De teksten staan in legal.json, zodat het Word-document voor Arjan uit
 * dezelfde bron komt. Wat tussen [[dubbele haken]] staat, moet nog ingevuld of
 * nagekeken worden en wordt hier gemarkeerd getoond. Voor livegang: Arjan leest
 * na, iemand met juridische kennis kijkt mee, en het conceptkader gaat eruit.
 */

type Block = { p: string } | { ul: string[] };

interface LegalDoc {
  title: string;
  lead: string;
  versie: string;
  sections: { h: string; blocks: Block[] }[];
}

/** Zet [[...]] om naar een markering, de rest blijft gewone tekst. */
function Text({ s }: { s: string }) {
  return (
    <>
      {s.split(/(\[\[[^\]]+\]\])/g).map((part, i) =>
        part.startsWith("[[") ? (
          <mark key={i} className="todo">
            {part.slice(2, -2)}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <>
      <section className="pagehead pagehead--narrow">
        <div className="wrap">
          <h1>{doc.title}</h1>
          <p className="pagehead__lead">{doc.lead}</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: "clamp(8px,2vw,24px)" }}>
        <div className="wrap">
          <div className="callout legal__concept">
            <i className="ph ph-note-pencil" aria-hidden="true" />
            <p>
              Concept van {doc.versie}. Arjan leest dit nog na, en voor de site live gaat, laten wij het nakijken. Wat
              gemarkeerd staat, moet nog ingevuld of bevestigd worden.
            </p>
          </div>

          <article className="legal">
            {doc.sections.map((s) => (
              <section key={s.h}>
                <h2>{s.h}</h2>
                {s.blocks.map((b, i) =>
                  "p" in b ? (
                    <p key={i}>
                      <Text s={b.p} />
                    </p>
                  ) : (
                    <ul key={i}>
                      {b.ul.map((li) => (
                        <li key={li}>
                          <Text s={li} />
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </section>
            ))}
          </article>
        </div>
      </section>
    </>
  );
}

export function Privacy() {
  return <LegalPage doc={legal.privacy} />;
}

export function Voorwaarden() {
  return <LegalPage doc={legal.voorwaarden} />;
}
