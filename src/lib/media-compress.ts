// Browser-only. Compresses course media on the uploader's own device before
// anything is sent, so uploads are smaller and learners on slow or metered
// connections download far less. Loaded with a dynamic import from the
// upload panel only, so no other page pays for it.
//
//  - Video: H.264 + AAC in MP4, which every browser plays inline, at most
//    720p and 30 fps, at a bitrate chosen for the output size (see
//    src/lib/media-quality.ts). VP9 + Opus in WebM only where a browser
//    can't encode H.264. A file that is already a web-ready MP4 of a
//    sensible size is kept exactly as it is, so it loses nothing.
//  - Audio: AAC (M4A) at 96 kbps, or Opus (WebM) where AAC can't be
//    encoded. Light MP3 and M4A files are kept as they are.
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

function renameExtension(name: string, extension: string): string {
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${base}.${extension}`;
}

async function transcode(file: File, kind: "VIDEO" | "AUDIO", onProgress: Progress): Promise<CompressedFile> {
  if (typeof window === "undefined" || !("VideoEncoder" in window || "AudioEncoder" in window)) {
    throw new CompressionUnsupportedError("This browser can't compress media.");
  }
  const mb = await import("mediabunny");
  const quality = await import("@/lib/media-quality");

  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  let duration: number | null = null;
  let containerType: string;
  try {
    duration = await input.computeDuration();
    containerType = (await input.getFormat()).mimeType;
  } catch {
    throw new CompressionUnsupportedError("This file's format can't be read in the browser.");
  }
  if (kind === "AUDIO" && containerType === "video/mp4") containerType = "audio/mp4";

  const videoTrack = kind === "VIDEO" ? await input.getPrimaryVideoTrack() : null;
  if (kind === "VIDEO" && !videoTrack) throw new CompressionUnsupportedError("No video track found in this file.");
  const audioTrack = await input.getPrimaryAudioTrack();
  const videoStats = videoTrack ? await videoTrack.computePacketStats(300).catch(() => null) : null;

  const original: CompressedFile = {
    blob: file,
    mimeType: containerType,
    fileName: file.name,
    contentEncoding: null,
    durationSeconds: duration,
    originalSize: file.size,
    compressed: false,
  };
  const keep = quality.canKeepOriginal(kind, {
    mimeType: containerType,
    videoCodec: videoTrack?.codec ?? null,
    audioCodec: audioTrack?.codec ?? null,
    height: videoTrack?.displayHeight ?? null,
    frameRate: videoStats?.averagePacketRate ?? null,
    bitrate: duration ? (file.size * 8) / duration : null,
  });
  if (keep) {
    onProgress(1);
    return original;
  }

  let height: number | undefined;
  let width: number | undefined;
  let videoCodec: import("mediabunny").VideoCodec | null = null;
  let videoQuality: import("mediabunny").Quality | undefined;
  if (videoTrack) {
    height = quality.targetVideoHeight(videoTrack.displayHeight);
    width = Math.round((videoTrack.displayWidth * height) / videoTrack.displayHeight / 2) * 2;
    videoCodec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], { width, height });
    if (!videoCodec) throw new CompressionUnsupportedError("This browser can't encode video.");
    const bitrate = quality.videoBitrate(
      videoCodec as import("@/lib/media-quality").WebVideoCodec,
      height,
      videoStats?.averageBitrate ?? null,
    );
    videoQuality = new mb.Quality({ bitrate, bitrateMode: "variable" });
  }

  const useMp4 = kind === "VIDEO" ? videoCodec === "avc" : await mb.canEncodeAudio("aac");
  const audioCodec = audioTrack
    ? await mb.getFirstEncodableAudioCodec(useMp4 ? ["aac", "opus"] : ["opus", "vorbis"])
    : null;
  if (kind === "AUDIO" && !audioCodec) {
    throw new CompressionUnsupportedError("This browser can't encode audio.");
  }

  const output = new mb.Output({
    format: useMp4 ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat(),
    target: new mb.BufferTarget(),
  });

  const sourceFrameRate = videoStats?.averagePacketRate;
  const conversion = await mb.Conversion.init({
    input,
    output,
    tracks: "primary",
    video: videoTrack
      ? {
          height,
          codec: videoCodec!,
          quality: videoQuality,
          keyFrameInterval: quality.KEY_FRAME_SECONDS,
          // Only lower the frame rate; never invent frames.
          ...(sourceFrameRate && sourceFrameRate > quality.MAX_FRAME_RATE + 1 && { frameRate: quality.MAX_FRAME_RATE }),
          forceTranscode: true,
        }
      : { discard: true },
    audio: audioCodec
      ? {
          codec: audioCodec,
          quality: new mb.Quality({ bitrate: quality.audioBitrate(audioCodec as "aac" | "opus" | "vorbis", kind === "VIDEO") }),
          forceTranscode: true,
        }
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
  const originalPlayable = ["video/mp4", "audio/mp4", "audio/mpeg"].includes(containerType);
  if (originalPlayable && file.size <= blob.size) return original;

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
