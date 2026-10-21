// Browser-only. Compresses course media on the uploader's own device before
// anything is sent, so uploads are smaller and learners on slow or metered
// connections download far less. Loaded with a dynamic import from the
// upload panel only, so no other page pays for it.
//
//  - Video: re-encoded to at most 720p at medium quality (H.264 + AAC in
//    MP4 where the browser can encode it, otherwise VP9/VP8 + Opus in WebM).
//  - Audio: re-encoded to AAC (M4A) or Opus (WebM) at speech-friendly quality.
//  - Documents: gzipped when that actually helps (plain text, CSV, Markdown,
//    RTF, old Office formats); already-compressed formats (PDF, DOCX, ZIP...)
//    are sent as they are.
//
// Uses WebCodecs via Mediabunny. Where a browser can't encode (some older
// browsers), compress* throws CompressionUnsupportedError and the uploader
// can choose to send the original instead.

export class CompressionUnsupportedError extends Error {}

export interface CompressedFile {
  blob: Blob;
  mimeType: string;
  fileName: string;
  contentEncoding: "gzip" | null;
  durationSeconds: number | null;
  originalSize: number;
  // False when the original was already smaller and is sent untouched.
  compressed: boolean;
}

type Progress = (fraction: number) => void;

const MAX_VIDEO_HEIGHT = 720;

function renameExtension(name: string, extension: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${base}.${extension}`;
}

async function transcode(file: File, kind: "VIDEO" | "AUDIO", onProgress: Progress): Promise<CompressedFile> {
  if (typeof window === "undefined" || !("VideoEncoder" in window || "AudioEncoder" in window)) {
    throw new CompressionUnsupportedError("This browser can't compress media.");
  }
  const mb = await import("mediabunny");

  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  let duration: number | null = null;
  try {
    duration = await input.computeDuration();
  } catch {
    throw new CompressionUnsupportedError("This file's format can't be read in the browser.");
  }

  let height: number | undefined;
  let videoCodec: import("mediabunny").VideoCodec | null = null;
  if (kind === "VIDEO") {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new CompressionUnsupportedError("No video track found in this file.");
    const targetHeight = Math.min(MAX_VIDEO_HEIGHT, track.displayHeight);
    height = targetHeight - (targetHeight % 2);
    videoCodec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], {
      height,
      width: Math.round((track.displayWidth * height) / track.displayHeight / 2) * 2,
      quality: mb.QUALITY_MEDIUM,
    });
    if (!videoCodec) throw new CompressionUnsupportedError("This browser can't encode video.");
  }

  const useMp4 = kind === "VIDEO" ? videoCodec === "avc" : await mb.canEncodeAudio("aac");
  const audioCodec = await mb.getFirstEncodableAudioCodec(useMp4 ? ["aac", "opus"] : ["opus", "vorbis"], {
    quality: mb.QUALITY_MEDIUM,
  });
  if (kind === "AUDIO" && !audioCodec) {
    throw new CompressionUnsupportedError("This browser can't encode audio.");
  }

  const output = new mb.Output({
    format: useMp4 ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(),
    target: new mb.BufferTarget(),
  });

  const conversion = await mb.Conversion.init({
    input,
    output,
    tracks: "primary",
    video:
      kind === "VIDEO"
        ? { height, codec: videoCodec!, quality: mb.QUALITY_MEDIUM, forceTranscode: true }
        : { discard: true },
    audio: audioCodec
      ? { codec: audioCodec, quality: kind === "AUDIO" ? mb.QUALITY_LOW : mb.QUALITY_MEDIUM, forceTranscode: true }
      : { discard: true },
  });
  if (!conversion.isValid) {
    throw new CompressionUnsupportedError("This file can't be converted in the browser.");
  }
  conversion.onProgress = (p) => onProgress(Math.min(1, p));
  await conversion.execute();

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Compression produced no output.");

  const mimeType = `${kind === "VIDEO" ? "video" : "audio"}/${useMp4 ? "mp4" : "webm"}`;
  const extension = useMp4 ? (kind === "VIDEO" ? "mp4" : "m4a") : kind === "VIDEO" ? "webm" : "weba";
  const blob = new Blob([buffer], { type: mimeType });

  // If the original is already smaller AND plays in browsers as it is, keep it.
  const originalPlayable = ["video/mp4", "video/webm", "audio/mp4", "audio/mpeg", "audio/webm", "audio/ogg"].includes(file.type);
  if (originalPlayable && file.size <= blob.size) {
    return {
      blob: file,
      mimeType: file.type,
      fileName: file.name,
      contentEncoding: null,
      durationSeconds: duration,
      originalSize: file.size,
      compressed: false,
    };
  }

  return {
    blob,
    mimeType,
    fileName: renameExtension(file.name, extension),
    contentEncoding: null,
    durationSeconds: duration,
    originalSize: file.size,
    compressed: true,
  };
}

// Formats where gzip reliably shrinks the file. Modern Office files, PDF,
// EPUB and ZIP are already compressed internally.
const GZIP_WORTHWHILE = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/rtf",
  "application/msword",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-excel",
]);

const EXTENSION_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  rtf: "application/rtf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  odp: "application/vnd.oasis.opendocument.presentation",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  epub: "application/epub+zip",
  zip: "application/zip",
};

/** Browsers often report "" or a generic type for Office files; fall back
 * to the extension. */
export function documentMimeType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[ext] ?? file.type ?? "application/octet-stream";
}

async function gzipDocument(file: File, onProgress: Progress): Promise<CompressedFile> {
  const mimeType = documentMimeType(file);
  const base: CompressedFile = {
    blob: file,
    mimeType,
    fileName: file.name,
    contentEncoding: null,
    durationSeconds: null,
    originalSize: file.size,
    compressed: false,
  };
  if (!GZIP_WORTHWHILE.has(mimeType) || typeof CompressionStream === "undefined") {
    onProgress(1);
    return base;
  }
  const stream = file.stream().pipeThrough(new CompressionStream("gzip"));
  const gzipped = await new Response(stream).blob();
  onProgress(1);
  // Only worth it if it saves at least 10%.
  if (gzipped.size > file.size * 0.9) return base;
  return {
    ...base,
    blob: new Blob([gzipped], { type: mimeType }),
    contentEncoding: "gzip",
    compressed: true,
  };
}

export async function compressForUpload(
  file: File,
  kind: "VIDEO" | "AUDIO" | "DOCUMENT",
  onProgress: Progress,
): Promise<CompressedFile> {
  if (kind === "DOCUMENT") return gzipDocument(file, onProgress);
  return transcode(file, kind, onProgress);
}

/** Reads a media file's duration without converting it (used when the
 * uploader sends the original). */
export async function readDuration(file: File): Promise<number | null> {
  try {
    const mb = await import("mediabunny");
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    return await input.computeDuration();
  } catch {
    return null;
  }
}
