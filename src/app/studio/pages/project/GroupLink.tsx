import { useQuery } from "@tanstack/react-query";
import { get } from "../../api";
import { keys } from "../../queries";
import type { ShareState } from "../../types";

// The group link of a project: one link that goes round a team, a class or the
// guests at a wedding. The card to manage it is on Delen & verkoop
// (SharingTab.tsx); the gallery toolbar and the consent tab read it too.

/** The project's group link and who came in with it. */
export const useGroupLink = (projectId: string) =>
  useQuery({
    queryKey: keys.groupLink(projectId),
    queryFn: ({ signal }) => get<ShareState>(`/admin/project/${projectId}/share`, signal),
  });

/** One cell of a spreadsheet. A name typed in a form must not run as a formula when the file is opened. */
export function csvCell(v: string | number) {
  let text = String(v);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
