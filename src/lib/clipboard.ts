/**
 * Clipboard helper utilities.
 */

/**
 * Copies provided text into the system clipboard.
 *
 * @param text - Text to copy.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    throw new Error("Clipboard API not available");
  }

  await navigator.clipboard.writeText(text);
}
