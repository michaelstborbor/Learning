import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";

// The font files certificates are drawn with (src/lib/certificate-pdf.ts).
// Names and course titles are set in their main font with fallbacks, tried
// in order, for letters it lacks: Cormorant Garamond has no ɛ or ɔ, so
// those come from Noto Serif.
export const CERTIFICATE_FONTS = {
  serif: [
    "cormorant-garamond-latin-600-normal.woff",
    "cormorant-garamond-latin-ext-600-normal.woff",
    "cormorant-garamond-vietnamese-600-normal.woff",
    "noto-serif-latin-ext-600-normal.ttf",
  ],
  serifItalic: ["cormorant-garamond-latin-500-italic.woff"],
  label: [
    "space-grotesk-latin-600-normal.woff",
    "space-grotesk-latin-ext-600-normal.woff",
    "inter-latin-ext-400-normal.woff",
  ],
  body: ["inter-latin-400-normal.woff"],
  bodyBold: ["inter-latin-600-normal.woff"],
} as const;

const ASSETS = path.join(process.cwd(), "assets", "certificate");

export async function certificateAsset(...parts: string[]): Promise<Buffer> {
  return readFile(/*turbopackIgnore: true*/ path.join(ASSETS, ...parts));
}

let nameCharacters: Promise<Set<number>> | null = null;

/** Every character the certificate's name font can print. */
function printableNameCharacters(): Promise<Set<number>> {
  nameCharacters ??= Promise.all(
    CERTIFICATE_FONTS.serif.map(async (file) => fontkit.create(await certificateAsset("fonts", file)).characterSet),
  )
    .then((sets) => new Set(sets.flat()))
    .catch((error) => {
      nameCharacters = null;
      throw error;
    });
  return nameCharacters;
}

/** The characters in a name that a certificate couldn't print (none for
 * almost every name). A name is only saved when this comes back empty, so
 * the certificate always shows it exactly as the learner typed it. */
export async function unprintableNameCharacters(name: string): Promise<string[]> {
  const printable = await printableNameCharacters();
  return [...new Set([...name].filter((ch) => ch !== " " && !printable.has(ch.codePointAt(0)!)))];
}
