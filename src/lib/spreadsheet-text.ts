import { inflateRawSync } from "node:zlib";

// Turns a submitted spreadsheet into plain text an automatic grader can
// read: every cell with its value and formula, which cells are bold or
// bordered and how numbers are formatted, frozen panes, page setup and
// charts. Reads .xlsx (a zip of XML files) and .csv. Old binary .xls files
// can't be read this way, so they return null and go to an instructor.
//
// The file is untrusted, so the zip reader caps how much it unpacks.

const MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_CELLS_PER_SHEET = 1500;
const MAX_TEXT_CHARS = 120_000;

// ---------------------------------------------------------------- zip

function unzip(bytes: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  // End of central directory: the last 22+ bytes, signature 0x06054b50.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a zip file.");
  const count = bytes.readUInt16LE(eocd + 10);
  let offset = bytes.readUInt32LE(eocd + 16);
  let total = 0;

  for (let n = 0; n < count; n++) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) break;
    const method = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;

    if (!name.endsWith(".xml") && !name.endsWith(".rels")) continue;
    if (size > MAX_ENTRY_BYTES || (total += size) > MAX_TOTAL_BYTES) throw new Error("The file is too large to read.");
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== 0x04034b50) continue;
    const start = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
    const data = bytes.subarray(start, start + compressedSize);
    if (method === 0) files.set(name, Buffer.from(data));
    else if (method === 8) files.set(name, inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES }));
  }
  return files;
}

// ---------------------------------------------------------------- xml helpers

function decode(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? decode(match[1]) : null;
}

/** Joined text of every <t> (or <a:t>) inside a fragment. */
function texts(fragment: string): string {
  return [...fragment.matchAll(/<(?:a:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:a:)?t>/g)].map((m) => decode(m[1])).join("");
}

function relationships(xml: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of xml?.matchAll(/<Relationship\s[^>]*>/g) ?? []) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) map.set(id, target);
  }
  return map;
}

/** Resolves a relationship target against the folder of the part that points to it. */
function resolve(fromPart: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = fromPart.split("/").slice(0, -1);
  for (const piece of target.split("/")) {
    if (piece === "..") parts.pop();
    else if (piece !== ".") parts.push(piece);
  }
  return parts.join("/");
}

function relsFor(part: string): string {
  const folder = part.split("/").slice(0, -1).join("/");
  return `${folder}/_rels/${part.split("/").pop()}.rels`;
}

// ---------------------------------------------------------------- styles

// Built-in number formats Excel doesn't write out in styles.xml.
const BUILTIN_FORMATS: Record<number, string> = {
  1: "0",
  2: "0.00",
  3: "#,##0",
  4: "#,##0.00",
  9: "0%",
  10: "0.00%",
  11: "0.00E+00",
  14: "date (m/d/yyyy)",
  15: "date (d-mmm-yy)",
  16: "date (d-mmm)",
  17: "date (mmm-yy)",
  18: "time",
  19: "time",
  20: "time",
  21: "time",
  22: "date and time",
  37: "#,##0 ;(#,##0)",
  38: "#,##0 ;[Red](#,##0)",
  39: "#,##0.00;(#,##0.00)",
  40: "#,##0.00;[Red](#,##0.00)",
  41: "accounting (comma style, no decimals)",
  42: "accounting (currency)",
  43: "accounting (comma style)",
  44: "accounting (currency)",
  49: "text",
};

interface CellStyle {
  bold: boolean;
  border: boolean;
  fill: boolean;
  numberFormat: string | null;
}

function readStyles(xml: string | undefined): CellStyle[] {
  if (!xml) return [];
  const custom = new Map<number, string>();
  for (const m of xml.matchAll(/<numFmt\s[^>]*>/g)) {
    const id = Number(attr(m[0], "numFmtId"));
    const code = attr(m[0], "formatCode");
    if (code) custom.set(id, code);
  }
  const section = (name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? "";
  const fonts = [...section("fonts").matchAll(/<font(?:\s[^>]*)?>([\s\S]*?)<\/font>|<font\s*\/>/g)].map((m) =>
    /<b(\s[^>]*)?\/>/.test(m[1] ?? "") && !/<b\s+val="(0|false)"/.test(m[1] ?? ""),
  );
  const borders = [...section("borders").matchAll(/<border(?:\s[^>]*)?>([\s\S]*?)<\/border>|<border\s*\/>/g)].map((m) =>
    /\sstyle="(?!none)[^"]+"/.test(m[1] ?? ""),
  );
  const fills = [...section("fills").matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map(
    (m) => /patternType="(?!none|gray125)[^"]+"/.test(m[1]),
  );
  return [...section("cellXfs").matchAll(/<xf\s[^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)].map((m) => {
    const numFmtId = Number(attr(m[0], "numFmtId") ?? 0);
    return {
      bold: fonts[Number(attr(m[0], "fontId") ?? 0)] ?? false,
      border: borders[Number(attr(m[0], "borderId") ?? 0)] ?? false,
      fill: fills[Number(attr(m[0], "fillId") ?? 0)] ?? false,
      numberFormat: numFmtId === 0 ? null : (custom.get(numFmtId) ?? BUILTIN_FORMATS[numFmtId] ?? `format ${numFmtId}`),
    };
  });
}

function isDateFormat(format: string): boolean {
  if (format.startsWith("date")) return true;
  // Strip quoted text and colours, then look for day/month/year codes.
  const code = format.replace(/"[^"]*"|\[[^\]]*\]/g, "");
  return /[dy]/i.test(code) || /m{3,}/i.test(code);
}

function excelDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return null;
  // Day 1 is 1900-01-01, and Excel counts a 29 February 1900 that never was.
  const days = Math.floor(serial) - (serial >= 60 ? 1 : 0);
  return new Date(Date.UTC(1899, 11, 31) + days * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- charts

const CHART_TYPES: Record<string, string> = {
  barChart: "bar",
  bar3DChart: "3-D bar",
  lineChart: "line",
  line3DChart: "3-D line",
  pieChart: "pie",
  pie3DChart: "3-D pie",
  doughnutChart: "doughnut",
  areaChart: "area",
  scatterChart: "scatter",
  radarChart: "radar",
};

// Excel writes "c:" prefixes; other tools use a default namespace instead.
function unprefixed(xml: string): string {
  return xml.replace(/<(\/?)(?:c|xdr):/g, "<$1");
}

function describeChart(chartXml: string): string {
  const xml = unprefixed(chartXml);
  const kinds = Object.entries(CHART_TYPES)
    .filter(([tag]) => xml.includes(`<${tag}>`) || xml.includes(`<${tag} `))
    .map(([tag, label]) => {
      if (tag === "barChart" || tag === "bar3DChart") {
        const dir = xml.match(/<barDir val="(\w+)"/)?.[1];
        return dir === "col" ? "column" : "bar";
      }
      return label;
    });
  // The chart's own title comes before the plot area; axis titles come inside it.
  const titleXml = xml.split("<plotArea")[0].match(/<title>([\s\S]*?)<\/title>/)?.[1];
  const title = titleXml ? texts(titleXml).trim() : "";
  const autoTitleDeleted = /<autoTitleDeleted val="1"/.test(xml);
  const ref = (fragment: string, tag: string) =>
    fragment.match(new RegExp(`<${tag}>[\\s\\S]*?<f>([^<]+)</f>`))?.[1];
  const series = [...xml.matchAll(/<ser>([\s\S]*?)<\/ser>/g)].map((m) => {
    const name = ref(m[1], "tx");
    const categories = ref(m[1], "cat") ?? ref(m[1], "xVal");
    const values = ref(m[1], "val") ?? ref(m[1], "yVal");
    return [
      name && `name ${decode(name)}`,
      categories && `categories ${decode(categories)}`,
      values && `values ${decode(values)}`,
    ]
      .filter(Boolean)
      .join(", ");
  });
  return [
    `${kinds.join(" + ") || "unknown type"} chart`,
    title ? `titled "${title}"` : autoTitleDeleted ? "with no title" : "with no custom title",
    ...series.map((s, i) => `series ${i + 1}: ${s || "no cell references"}`),
  ].join("; ");
}

// ---------------------------------------------------------------- workbook

function describeXlsx(bytes: Buffer, fileName: string): string {
  const files = unzip(bytes);
  const read = (name: string) => files.get(name)?.toString("utf8");
  const workbook = read("xl/workbook.xml");
  if (!workbook) throw new Error("This isn't an Excel workbook.");

  const shared = [...(read("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const styles = readStyles(read("xl/styles.xml"));
  const workbookRels = relationships(read("xl/_rels/workbook.xml.rels"));
  const definedNames = [...workbook.matchAll(/<definedName\s[^>]*>([\s\S]*?)<\/definedName>/g)]
    .map((m) => `${attr(m[0], "name")} = ${decode(m[1])}`)
    .filter((n) => !n.startsWith("_xlnm._FilterDatabase"));

  const lines: string[] = [`Workbook "${fileName}"`];
  if (definedNames.length) lines.push(`Named ranges and print settings: ${definedNames.join("; ")}`);

  for (const m of workbook.matchAll(/<sheet\s[^>]*\/?>/g)) {
    const sheetName = attr(m[0], "name") ?? "Sheet";
    const relId = attr(m[0], "r:id");
    const target = relId ? workbookRels.get(relId) : undefined;
    if (!target) continue;
    const part = resolve("xl/workbook.xml", target);
    const xml = read(part);
    if (!xml) continue;

    const facts: string[] = [];
    if (attr(m[0], "state") === "hidden") facts.push("hidden sheet");
    const dimension = xml.match(/<dimension\s[^>]*ref="([^"]+)"/)?.[1];
    if (dimension) facts.push(`used range ${dimension}`);
    const pane = xml.match(/<pane\s[^>]*>/)?.[0];
    if (pane && attr(pane, "state")?.startsWith("frozen")) {
      const rows = Number(attr(pane, "ySplit") ?? 0);
      const cols = Number(attr(pane, "xSplit") ?? 0);
      facts.push(
        `frozen panes: ${[rows && `top ${rows} row${rows === 1 ? "" : "s"}`, cols && `first ${cols} column${cols === 1 ? "" : "s"}`].filter(Boolean).join(" and ")}`,
      );
    } else {
      facts.push("no frozen panes");
    }
    const pageSetup = xml.match(/<pageSetup\s[^>]*>/)?.[0];
    const fitToPage = /<pageSetUpPr\s[^>]*fitToPage="(1|true)"/.test(xml);
    const page = [
      `orientation ${pageSetup ? (attr(pageSetup, "orientation") ?? "default (portrait)") : "default (portrait)"}`,
      fitToPage
        ? `fit to ${attr(pageSetup ?? "", "fitToWidth") ?? "1"} page(s) wide by ${attr(pageSetup ?? "", "fitToHeight") ?? "1"} tall`
        : "not set to fit to page",
    ];
    facts.push(`page setup: ${page.join(", ")}`);
    if (/<autoFilter\s/.test(xml)) facts.push("has a filter");
    const conditional = (xml.match(/<conditionalFormatting\s/g) ?? []).length;
    if (conditional) facts.push(`${conditional} conditional formatting rule set(s)`);
    const merged = [...xml.matchAll(/<mergeCell\s[^>]*ref="([^"]+)"/g)].map((x) => x[1]);
    if (merged.length) facts.push(`merged cells ${merged.join(", ")}`);
    const widths = [...xml.matchAll(/<col\s[^>]*>/g)].filter((c) => attr(c[0], "customWidth") === "1").length;
    if (widths) facts.push(`${widths} column width setting(s)`);

    lines.push("", `Sheet "${sheetName}" (${facts.join("; ")})`);

    // Charts live in the sheet's drawing.
    const sheetRels = relationships(read(relsFor(part)));
    for (const d of xml.matchAll(/<drawing\s[^>]*r:id="([^"]+)"/g)) {
      const drawingTarget = sheetRels.get(d[1]);
      if (!drawingTarget) continue;
      const drawingPart = resolve(part, drawingTarget);
      const drawingRels = relationships(read(relsFor(drawingPart)));
      const drawing = unprefixed(read(drawingPart) ?? "");
      for (const c of drawing.matchAll(/<chart\s[^>]*r:id="([^"]+)"/g)) {
        const chartTarget = drawingRels.get(c[1]);
        const chart = chartTarget ? read(resolve(drawingPart, chartTarget)) : undefined;
        if (chart) lines.push(`Chart on this sheet: ${describeChart(chart)}`);
      }
      const pictures = (drawing.match(/<pic>/g) ?? []).length;
      if (pictures) lines.push(`${pictures} picture(s) on this sheet`);
    }

    // Shared formulas are written once and referenced by index after.
    const sharedFormulas = new Map<string, { cell: string; formula: string }>();
    let cellCount = 0;
    let skipped = 0;
    lines.push("Cells (address: value | formula | formatting):");
    for (const c of xml.matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = `<c ${c[1]}>`;
      const ref = attr(tag, "r") ?? "?";
      const type = attr(tag, "t");
      const inner = c[2] ?? "";
      const fTag = inner.match(/<f(\s[^>]*)?(?:\/>|>([\s\S]*?)<\/f>)/);
      let formula: string | null = null;
      if (fTag) {
        const fAttrs = `<f${fTag[1] ?? ""}>`;
        const text = fTag[2] ? decode(fTag[2]) : "";
        const si = attr(fAttrs, "si");
        if (attr(fAttrs, "t") === "shared" && si !== null) {
          if (text) {
            sharedFormulas.set(si, { cell: ref, formula: text });
            formula = `=${text}`;
          } else {
            const source = sharedFormulas.get(si);
            formula = source ? `same formula as ${source.cell} (=${source.formula}), filled down/across` : "shared formula";
          }
        } else if (text) {
          formula = `=${text}`;
        }
      }
      const saved = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const raw = saved === "" ? undefined : saved;
      let value: string | null = null;
      if (type === "s" && raw !== undefined) value = JSON.stringify(shared[Number(raw)] ?? "");
      else if (type === "inlineStr") value = JSON.stringify(texts(inner));
      else if (type === "str" && raw !== undefined) value = JSON.stringify(decode(raw));
      else if (type === "b" && raw !== undefined) value = raw === "1" ? "TRUE" : "FALSE";
      else if (type === "e" && raw !== undefined) value = `error ${decode(raw)}`;
      else if (raw !== undefined) value = decode(raw);

      const style = styles[Number(attr(tag, "s") ?? 0)];
      // Dates are stored as day numbers; show the date too.
      if (value !== null && (type === null || type === "n") && style?.numberFormat && isDateFormat(style.numberFormat)) {
        const date = excelDate(Number(value));
        if (date) value = `${value} (${date})`;
      }
      const format = [
        style?.bold && "bold",
        style?.border && "border",
        style?.fill && "shaded",
        style?.numberFormat && `number format "${style.numberFormat}"`,
      ].filter(Boolean);
      if (value === null && formula === null) continue; // styled but empty
      if (++cellCount > MAX_CELLS_PER_SHEET) {
        skipped++;
        continue;
      }
      lines.push(
        `${ref}: ${value ?? (formula ? "(result not saved in the file)" : "(empty)")}${formula ? ` | ${formula}` : ""}${format.length ? ` | ${format.join(", ")}` : ""}`,
      );
    }
    if (cellCount === 0) lines.push("(no cells with content)");
    if (skipped) lines.push(`(${skipped} more cells not listed)`);
  }

  return clip(lines.join("\n"));
}

// ---------------------------------------------------------------- csv

function describeCsv(bytes: Buffer, fileName: string): string {
  const text = bytes.toString("utf8").replace(/^﻿/, "");
  const rows = text.split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
  const lines = [
    `CSV file "${fileName}" (${rows.length} rows). CSV files store values only: no formulas, formatting, charts or page setup survive in this format.`,
    "Rows (row number: values):",
    ...rows.slice(0, 400).map((row, i) => `${i + 1}: ${row}`),
  ];
  if (rows.length > 400) lines.push(`(${rows.length - 400} more rows not listed)`);
  return clip(lines.join("\n"));
}

function clip(text: string): string {
  return text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}\n[…the rest of the file was cut]` : text;
}

export type SpreadsheetText = { ok: true; text: string } | { ok: false; reason: string };

/** Reads an uploaded project file for the automatic grader. */
export function spreadsheetText(bytes: Buffer, fileName: string): SpreadsheetText {
  const extension = fileName.toLowerCase().split(".").pop();
  try {
    if (extension === "xlsx") return { ok: true, text: describeXlsx(bytes, fileName) };
    if (extension === "csv") return { ok: true, text: describeCsv(bytes, fileName) };
    if (extension === "xls") {
      return { ok: false, reason: "Older .xls files can't be read automatically, so an instructor will grade this one." };
    }
    return { ok: false, reason: "This file type can't be read automatically." };
  } catch {
    return { ok: false, reason: "The file couldn't be opened, so an instructor will grade it." };
  }
}

