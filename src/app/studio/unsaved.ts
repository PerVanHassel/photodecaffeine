import { useEffect } from "react";
import { useBlocker } from "react-router";
import { useConfirm } from "./ui";

/**
 * Asks before leaving a page with unsaved changes: within the studio through
 * the router, and on reload or closing the tab through the browser.
 */
export function useUnsavedChanges(dirty: boolean) {
  const confirm = useConfirm();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    void confirm({
      title: "Wijzigingen niet opgeslagen",
      body: "Als je deze pagina verlaat, ben je ze kwijt.",
      confirm: "Toch weggaan",
      danger: true,
    }).then((leave) => (leave ? blocker.proceed() : blocker.reset()));
    // Only a new block should ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
