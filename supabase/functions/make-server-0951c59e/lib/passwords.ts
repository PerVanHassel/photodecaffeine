// --- Wachtwoordcontrole ---
// Have I Been Pwned's range API, the k-anonymous way: only the first five
// characters of the SHA-1 hash leave the building, and the rest is matched
// here. The password itself never goes anywhere.
//
// It fails open. A password nobody can check is not a reason to refuse someone
// an account because a third party is having a bad day.
export async function passwordIsLeaked(password: string): Promise<boolean> {
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) {
      console.log("passwordIsLeaked: HIBP returned", res.status);
      return false;
    }
    const suffix = hash.slice(5);
    const body = await res.text();
    return body
      .split("\n")
      .some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);
  } catch (err) {
    console.log("passwordIsLeaked: check failed", err);
    return false;
  }
}

export const PASSWORD_MIN_LENGTH = 8;

/** The reason to refuse this password, or "" when it is fine. */
export async function passwordProblem(password: string): Promise<string> {
  const pw = String(password || "");
  if (pw.length < PASSWORD_MIN_LENGTH) {
    return `Kies een wachtwoord van minstens ${PASSWORD_MIN_LENGTH} tekens.`;
  }
  if (await passwordIsLeaked(pw)) {
    return "Dit wachtwoord staat in bekende datalekken. Kies er een die je nergens anders gebruikt.";
  }
  return "";
}
