/**
 * Copying a draft out is the *only* way anything reaches a recipient — this
 * site has no mail service of any kind. So this needs to work everywhere,
 * including the contexts where the async clipboard API is unavailable (an
 * insecure origin, an older browser), hence the execCommand fallback.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the manual path below */
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** What actually goes on the clipboard for a draft: subject line, then body. */
export const draftToText = (subject: string, body: string) => `Subject: ${subject}\n\n${body}`;
