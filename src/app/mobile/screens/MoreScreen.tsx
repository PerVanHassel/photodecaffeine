import { motion } from "motion/react";
import {
  Car,
  ChevronRight,
  ExternalLink,
  Images,
  LogOut,
  Megaphone,
  Monitor,
  Moon,
  Receipt,
  Settings,
  Shield,
  Star,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useMobileTheme } from "../useMobileTheme";
import { isIOS, isStandalone } from "../pwa";
import { c, radius, spring } from "../theme";
import { Avatar, Card, Divider, Ellipsis, Press, Row, SectionLabel, Stack } from "../ui/base";
import { Segmented } from "../ui/form";
import { Screen } from "../ui/Screen";
import { ConfirmSheet } from "../ui/Sheet";

interface Entry {
  label: string;
  hint: string;
  icon: typeof Images;
  to?: string;
  href?: string;
}

const SECTIONS: { title: string; items: Entry[] }[] = [
  {
    title: "Content",
    items: [
      { label: "Portfolio", hint: "Artikelen publiceren en uitlichten", icon: Images, to: "/app/portfolio" },
      { label: "Automotive", hint: "Galerij van de automotive-pagina", icon: Car, to: "/app/automotive" },
      { label: "Advertenties", hint: "Campagnes en hun leads", icon: Megaphone, to: "/app/ads" },
    ],
  },
  {
    title: "Klanten",
    items: [
      { label: "Reviews", hint: "Beoordelingen en foto-feedback", icon: Star, to: "/app/reviews" },
    ],
  },
  {
    title: "Beheer",
    items: [
      { label: "Declaraties", hint: "Uitgaven en BTW per kwartaal", icon: Receipt, to: "/app/declarations" },
      { label: "Team & rollen", hint: "Wie mag wat", icon: Shield, to: "/app/team" },
      { label: "Site-instellingen", hint: "Homepage, secties en contact", icon: Settings, to: "/app/settings" },
    ],
  },
  {
    title: "Elders",
    items: [
      {
        label: "Desktop admin panel",
        hint: "De volledige versie in de browser",
        icon: Monitor,
        href: "/admin/dashboard",
      },
      { label: "photodecaffeine.com", hint: "De publieke site", icon: ExternalLink, href: "/" },
    ],
  },
];

export function MoreScreen() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { mode, setMode } = useMobileTheme();

  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const name = user?.user_metadata?.name || user?.email || "Admin";

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    navigate("/app/login", { replace: true });
  }

  return (
    <Screen title="Meer" eyebrow="Beheer & instellingen">
      <Stack gap={26}>
        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.smooth}>
          <Card style={{ padding: 18 }}>
            <Row gap={14}>
              <Avatar name={name} size={50} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Ellipsis style={{ fontSize: 16, fontWeight: 700, color: c.fg }}>{name}</Ellipsis>
                <Ellipsis style={{ fontSize: 12.5, color: c.fg3, marginTop: 2 }}>
                  {user?.email}
                </Ellipsis>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: c.copper,
                    marginTop: 6,
                  }}
                >
                  Admin
                </div>
              </div>
            </Row>
          </Card>
        </motion.div>

        {/* Theme */}
        <section>
          <SectionLabel>Weergave</SectionLabel>
          <Card style={{ padding: 14 }}>
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "light", label: "Licht" },
                { value: "dark", label: "Donker" },
                { value: "system", label: "Systeem" },
              ]}
            />
            <Row gap={8} style={{ marginTop: 12, justifyContent: "center" }}>
              {mode === "light" ? (
                <Sun size={13} color={c.fg4} />
              ) : mode === "dark" ? (
                <Moon size={13} color={c.fg4} />
              ) : (
                <Monitor size={13} color={c.fg4} />
              )}
              <span style={{ fontSize: 11.5, color: c.fg4 }}>
                {mode === "system" ? "Volgt de instelling van je telefoon" : "Vast ingesteld"}
              </span>
            </Row>
          </Card>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.title}>
            <SectionLabel>{section.title}</SectionLabel>
            <Card padded={false} style={{ padding: "2px 0" }}>
              {section.items.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={item.label}>
                    {i > 0 && <Divider style={{ marginLeft: 56 }} />}
                    <Press
                      onClick={() => {
                        // The desktop panel and the public site are outside the
                        // app's router, so they need a real navigation.
                        if (item.href) window.location.href = item.href;
                        else if (item.to) navigate(item.to);
                      }}
                      scale={false}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 13,
                        width: "100%",
                        minHeight: 58,
                        padding: "0 15px",
                      }}
                    >
                      <span
                        style={{
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          borderRadius: radius.sm,
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: c.copperWash,
                          color: c.copper,
                        }}
                      >
                        <Icon size={15} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: c.fg }}>
                          {item.label}
                        </div>
                        <Ellipsis style={{ fontSize: 11.5, color: c.fg4, marginTop: 1 }}>
                          {item.hint}
                        </Ellipsis>
                      </div>
                      <ChevronRight size={16} color={c.fg4} style={{ flexShrink: 0 }} />
                    </Press>
                  </div>
                );
              })}
            </Card>
          </section>
        ))}

        {isIOS() && !isStandalone() && <InstallCard />}

        <Press
          onClick={() => setConfirmSignOut(true)}
          feedback="warning"
          scale={false}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minHeight: 50,
            borderRadius: radius.md,
            border: `1px solid ${c.line}`,
            color: c.danger,
            fontSize: 14.5,
            fontWeight: 650,
          }}
        >
          <LogOut size={16} />
          Uitloggen
        </Press>

        <div style={{ textAlign: "center", fontSize: 10.5, color: c.fg4, paddingBottom: 8 }}>
          PDC Admin · Photo De Caffeine
        </div>
      </Stack>

      <ConfirmSheet
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={handleSignOut}
        busy={signingOut}
        title="Uitloggen?"
        body="Je moet daarna opnieuw inloggen om bij het admin panel te komen."
        confirmLabel="Uitloggen"
      />
    </Screen>
  );
}

function InstallCard() {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: c.fg, marginBottom: 6 }}>
        Zet PDC op je beginscherm
      </div>
      <div style={{ fontSize: 12.5, color: c.fg3, lineHeight: 1.6 }}>
        Tik onderin op <strong style={{ color: c.fg2 }}>Deel</strong> en kies{" "}
        <strong style={{ color: c.fg2 }}>Zet op beginscherm</strong>. De app opent dan zonder
        browserbalk, met eigen icoon.
      </div>
    </Card>
  );
}
