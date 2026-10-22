import "server-only";

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import QRCode from "qrcode";
import { formatCertificateDate } from "@/lib/certificate-format";
import { CERTIFICATE_FONTS, certificateAsset } from "@/lib/certificate-fonts";

// Draws the certificate of completion as a one-page A4 (landscape) PDF.
// Everything is vector except the sponsor logo, so it prints sharply at
// any size. Fonts are embedded and subset, so the file stays small and
// looks the same on every device. See assets/certificate/fonts/README.md.

export interface CertificatePdfInput {
  certificateNumber: string;
  learnerName: string;
  courseTitle: string;
  completedAt: Date;
  verifyUrl: string;
}

// A4 landscape, in PDF points (1/72 inch).
const W = 841.89;
const H = 595.28;

const hex = (value: string): RGB =>
  rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );

// The site's colour tokens (src/app/globals.css).
const C = {
  brand100: hex("#ccfbf1"),
  brand200: hex("#99f6e4"),
  brand300: hex("#5eead4"),
  brand500: hex("#0d9488"),
  brand700: hex("#115e59"),
  brand900: hex("#0b3b38"),
  highlight500: hex("#ea580c"),
  highlight700: hex("#c2410c"),
  ink500: hex("#64748b"),
  ink700: hex("#334155"),
  ink900: hex("#0f172a"),
  white: rgb(1, 1, 1),
};

// A face is one font, or a font plus fallbacks tried in order for any
// character the first can't draw.
type Face = PDFFont | PDFFont[];

const characterSets = new WeakMap<PDFFont, Set<number>>();
function supports(font: PDFFont, codePoint: number): boolean {
  let set = characterSets.get(font);
  if (!set) {
    set = new Set(font.getCharacterSet());
    characterSets.set(font, set);
  }
  return set.has(codePoint);
}

/** Splits text into runs, each set in the first font of the face that has
 * its characters. Names are checked before they are saved (see
 * certificate-fonts.ts), so the "?" stand-in is only a last resort that
 * keeps the PDF from failing. */
function runs(face: Face, text: string): { font: PDFFont; text: string }[] {
  const fonts = Array.isArray(face) ? face : [face];
  const out: { font: PDFFont; text: string }[] = [];
  for (const ch of text) {
    const codePoint = ch.codePointAt(0)!;
    const font = fonts.find((f) => supports(f, codePoint));
    const piece = font ? ch : "?";
    const use = font ?? fonts[0];
    const last = out.at(-1);
    if (last && last.font === use) last.text += piece;
    else out.push({ font: use, text: piece });
  }
  return out;
}

function widthOf(face: Face, text: string, size: number): number {
  return runs(face, text).reduce((sum, run) => sum + run.font.widthOfTextAtSize(run.text, size), 0);
}

function drawRuns(page: PDFPage, face: Face, text: string, x: number, y: number, size: number, color: RGB) {
  let cursor = x;
  for (const run of runs(face, text)) {
    page.drawText(run.text, { x: cursor, y, size, font: run.font, color });
    cursor += run.font.widthOfTextAtSize(run.text, size);
  }
}

function centered(page: PDFPage, text: string, y: number, face: Face, size: number, color: RGB) {
  drawRuns(page, face, text, (W - widthOf(face, text, size)) / 2, y, size, color);
}

/** Largest size from `max` down to `min` at which the text fits `width`. */
function fitSize(face: Face, text: string, max: number, min: number, width: number): number {
  let size = max;
  while (size > min && widthOf(face, text, size) > width) size -= 0.5;
  return size;
}

/** Splits text at a space into at most two lines that each fit `width`.
 * Only the line break changes: every word and character is kept. */
function twoLines(face: Face, text: string, size: number, width: number): string[] {
  if (widthOf(face, text, size) <= width) return [text];
  const words = text.split(" ");
  let best: string[] = [text];
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    if (!lines[0] || !lines[1]) continue;
    const widest = Math.max(...lines.map((l) => widthOf(face, l, size)));
    if (widest < bestWidth) {
      best = lines;
      bestWidth = widest;
    }
  }
  return best;
}

// The same radiating signal arcs as the site's footer and course covers,
// from two opposite corners of the paper.
function drawSignalArcs(page: PDFPage, cx: number, cy: number) {
  for (let r = 36, i = 0; r <= 230; r += 13, i++) {
    page.drawCircle({
      x: cx,
      y: cy,
      size: r,
      borderColor: C.brand300,
      borderWidth: 0.7,
      borderOpacity: Math.max(0.08, 0.5 - i * 0.03),
    });
  }
}

function drawSeal(page: PDFPage, cx: number, cy: number, fonts: Fonts, year: string) {
  // Ribbon tails behind the seal.
  for (const side of [-1, 1]) {
    const x0 = cx + side * 14;
    page.drawSvgPath(`M 0 0 L ${side * 22} 0 L ${side * 30} 58 L ${side * 15} 48 L ${side * 4} 62 Z`, {
      x: x0 - side * 11,
      y: cy - 22,
      color: C.brand700,
    });
  }

  // Starburst edge.
  const points = 36;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 54 : 49.5;
    const a = (Math.PI * i) / points;
    d += `${i === 0 ? "M" : "L"} ${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)} `;
  }
  page.drawSvgPath(`${d}Z`, { x: cx, y: cy, color: C.highlight500 });
  page.drawCircle({ x: cx, y: cy, size: 46, color: C.brand900 });
  page.drawCircle({ x: cx, y: cy, size: 43, borderColor: C.highlight500, borderWidth: 0.8 });
  page.drawCircle({ x: cx, y: cy, size: 24, borderColor: C.brand300, borderWidth: 0.6 });

  // Lettering around the ring, reading clockwise from the top.
  const ring = "ELITESKILLS ACADEMY  •  CERTIFIED COMPLETION  •  ";
  const size = 6.4;
  const radius = 32;
  const chars = [...ring];
  const advances = chars.map((ch) => fonts.label.widthOfTextAtSize(ch, size));
  const total = advances.reduce((a, b) => a + b, 0);
  const gap = (2 * Math.PI * radius - total) / chars.length;
  let travelled = 0;
  chars.forEach((ch, i) => {
    const middle = travelled + advances[i] / 2;
    travelled += advances[i] + gap;
    const theta = Math.PI / 2 - middle / radius;
    const half = advances[i] / 2;
    page.drawText(ch, {
      x: cx + radius * Math.cos(theta) - half * Math.sin(theta) - 2.2 * Math.cos(theta),
      y: cy + radius * Math.sin(theta) + half * Math.cos(theta) - 2.2 * Math.sin(theta),
      size,
      font: fonts.label,
      color: C.white,
      rotate: degrees((theta * 180) / Math.PI - 90),
    });
  });

  const mark = "ESA";
  const markSize = 17;
  page.drawText(mark, {
    x: cx - fonts.serif.widthOfTextAtSize(mark, markSize) / 2,
    y: cy - 2,
    size: markSize,
    font: fonts.serif,
    color: C.white,
  });
  page.drawText(year, {
    x: cx - fonts.bodyBold.widthOfTextAtSize(year, 7) / 2,
    y: cy - 12,
    size: 7,
    font: fonts.bodyBold,
    color: C.brand200,
  });
}

async function drawQr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const quiet = 2;
  const cell = size / (count + quiet * 2);
  page.drawRectangle({ x, y, width: size, height: size, color: C.white });
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.modules.get(row, col)) continue;
      page.drawRectangle({
        x: x + (col + quiet) * cell,
        y: y + size - (row + quiet + 1) * cell,
        width: cell + 0.05,
        height: cell + 0.05,
        color: C.brand900,
      });
    }
  }
}

interface Fonts {
  serif: PDFFont;
  serifFace: PDFFont[];
  serifItalic: PDFFont;
  label: PDFFont;
  labelFace: PDFFont[];
  body: PDFFont;
  bodyBold: PDFFont;
}

export async function renderCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Embeds a face's main font, then each fallback only when `text` has
  // characters the fonts before it lack. pdf-lib's subsetter drops Noto
  // Serif's glyphs, so that (.ttf) fallback is embedded whole, which is
  // why it is only added to certificates that need it.
  const embed = async (files: readonly string[], text = "") => {
    const face: PDFFont[] = [];
    for (const [i, file] of files.entries()) {
      const missing = [...text].some((ch) => ch.trim() && !face.some((f) => supports(f, ch.codePointAt(0)!)));
      if (i > 0 && !missing) break;
      face.push(await doc.embedFont(await certificateAsset("fonts", file), { subset: !file.endsWith(".ttf") }));
    }
    return face;
  };
  const [serifFace, [serifItalic], labelFace, [body], [bodyBold], logoBytes] = await Promise.all([
    embed(CERTIFICATE_FONTS.serif, `${input.learnerName}ESA`),
    embed(CERTIFICATE_FONTS.serifItalic),
    embed(CERTIFICATE_FONTS.label, input.courseTitle),
    embed(CERTIFICATE_FONTS.body),
    embed(CERTIFICATE_FONTS.bodyBold),
    certificateAsset("elite-network-limited.png"),
  ]);
  const fonts: Fonts = {
    serif: serifFace[0],
    serifFace,
    serifItalic,
    label: labelFace[0],
    labelFace,
    body,
    bodyBold,
  };
  const logo = await doc.embedPng(logoBytes);

  // The learner's full name exactly as saved on their profile.
  const name = input.learnerName.trim();
  const course = input.courseTitle.trim();
  const date = formatCertificateDate(input.completedAt);

  doc.setTitle(`Certificate of Completion: ${input.courseTitle}`);
  doc.setAuthor("EliteSkills Academy");
  doc.setSubject(`${input.learnerName} completed ${input.courseTitle} on ${date}.`);
  doc.setKeywords([input.certificateNumber, "EliteSkills Academy", "Elite Network Limited"]);
  doc.setCreator("EliteSkills Academy");
  doc.setProducer("EliteSkills Academy");
  doc.setCreationDate(input.completedAt);

  const page = doc.addPage([W, H]);

  // Paper, arcs, then a white margin over the arcs' overflow, then the frame.
  const inset = 26;
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.white });
  drawSignalArcs(page, inset, H - inset);
  drawSignalArcs(page, W - inset, inset);
  page.drawRectangle({ x: 0, y: 0, width: W, height: inset, color: C.white });
  page.drawRectangle({ x: 0, y: H - inset, width: W, height: inset, color: C.white });
  page.drawRectangle({ x: 0, y: 0, width: inset, height: H, color: C.white });
  page.drawRectangle({ x: W - inset, y: 0, width: inset, height: H, color: C.white });
  page.drawRectangle({ x: 14, y: 14, width: W - 28, height: H - 28, borderColor: C.brand900, borderWidth: 7 });
  page.drawRectangle({ x: 23, y: 23, width: W - 46, height: H - 46, borderColor: C.highlight500, borderWidth: 1.2 });
  page.drawRectangle({ x: inset, y: inset, width: W - inset * 2, height: H - inset * 2, borderColor: C.brand500, borderWidth: 0.4 });

  // Heading.
  centered(page, "EliteSkills Academy", 512, fonts.label, 15, C.brand700);
  centered(page, "Certificate of Completion", 456, fonts.serif, 50, C.brand900);
  page.drawRectangle({ x: W / 2 - 34, y: 440, width: 68, height: 1.6, color: C.highlight500 });
  page.drawSvgPath("M 0 -4 L 4 0 L 0 4 L -4 0 Z", { x: W / 2, y: 440.8, color: C.highlight500 });

  centered(page, "This is to certify that", 408, fonts.serifItalic, 18, C.ink700);

  // A very long name moves onto two lines rather than shrinking too far.
  const nameFits = fitSize(fonts.serifFace, name, 46, 26, 620);
  const nameLines = twoLines(fonts.serifFace, name, nameFits, 620);
  const nameSize = nameLines.length === 1 ? nameFits : Math.min(nameFits, 26);
  if (nameLines.length === 1) {
    centered(page, name, 358, fonts.serifFace, nameSize, C.brand900);
  } else {
    nameLines.forEach((line, i) => centered(page, line, 380 - i * 28, fonts.serifFace, nameSize, C.brand900));
  }
  const ruleY = nameLines.length === 1 ? 346 : 342;
  page.drawLine({ start: { x: W / 2 - 220, y: ruleY }, end: { x: W / 2 + 220, y: ruleY }, thickness: 0.8, color: C.brand300 });

  centered(page, "has successfully completed the course", 318, fonts.serifItalic, 18, C.ink700);

  const courseSize = fitSize(fonts.labelFace, course, 24, 17, 620);
  const courseLines = twoLines(fonts.labelFace, course, courseSize, 620);
  const courseTop = courseLines.length === 1 ? 282 : 290;
  courseLines.forEach((line, i) => centered(page, line, courseTop - i * (courseSize + 4), fonts.labelFace, courseSize, C.brand700));

  centered(page, `Completed on ${date}`, courseLines.length === 1 ? 250 : 238, fonts.body, 11.5, C.ink500);

  // Footer: verification on the left, the seal in the middle, the sponsor
  // on the right.
  const footY = 64;
  await drawQr(page, input.verifyUrl, 58, footY, 74);
  const textX = 142;
  const label = (text: string, y: number) => page.drawText(text, { x: textX, y, size: 7.5, font: fonts.body, color: C.ink500 });
  const value = (text: string, y: number) => page.drawText(text, { x: textX, y, size: 10.5, font: fonts.bodyBold, color: C.ink900 });
  label("Certificate ID", footY + 63);
  value(input.certificateNumber, footY + 50);
  label("Date completed", footY + 33);
  value(date, footY + 20);
  const verifyText = `Verify at ${input.verifyUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}`;
  page.drawText(verifyText, { x: textX, y: footY + 3, size: 7.5, font: fonts.body, color: C.brand700 });

  drawSeal(page, W / 2, 124, fonts, String(input.completedAt.getUTCFullYear()));

  const logoSize = 78;
  const logoX = W - 58 - logoSize;
  page.drawImage(logo, { x: logoX, y: footY - 2, width: logoSize, height: logoSize });
  const right = (text: string, y: number, font: PDFFont, size: number, color: RGB) =>
    page.drawText(text, { x: logoX - 12 - font.widthOfTextAtSize(text, size), y, size, font, color });
  right("Sponsored by", footY + 44, fonts.body, 7.5, C.ink500);
  right("Elite Network Limited", footY + 28, fonts.label, 13, C.brand900);
  right("Sierra Leone", footY + 15, fonts.body, 8.5, C.ink500);

  return doc.save();
}
