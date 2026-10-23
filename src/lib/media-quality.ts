// How course video and audio are encoded for the web (see
// src/lib/media-compress.ts). Kept separate and pure so the numbers can be
// tested and tuned in one place.
//
// The aim: sharp enough to read text in a screen recording, small enough
// for learners on mobile data, and in formats every browser plays inline.

export const MAX_VIDEO_HEIGHT = 720;
export const MAX_FRAME_RATE = 30;
// A key frame every 2 seconds, so seeking in the player is quick.
export const KEY_FRAME_SECONDS = 2;

export type WebVideoCodec = "avc" | "vp9" | "vp8";

/** Output height: never above 720p, never upscaled, always even. */
export function targetVideoHeight(sourceHeight: number): number {
  const height = Math.min(MAX_VIDEO_HEIGHT, Math.round(sourceHeight));
  return Math.max(2, height - (height % 2));
}

// H.264 bitrates by output height. About 2.5 Mbps at 720p keeps slides
// and spreadsheet text crisp (roughly 19 MB a minute); lower resolutions
// need less. VP9 reaches the same quality with about 30% fewer bits.
const H264_LADDER: [minHeight: number, bitrate: number][] = [
  [720, 2_500_000],
  [540, 1_800_000],
  [480, 1_200_000],
  [360, 800_000],
  [0, 500_000],
];

export function ladderBitrate(codec: WebVideoCodec, height: number): number {
  const h264 = H264_LADDER.find(([minHeight]) => height >= minHeight)![1];
  return codec === "vp9" ? Math.round(h264 * 0.7) : h264;
}

/**
 * The video bitrate to encode at. A source that is already lighter than
 * the ladder is not inflated (that only adds size, not quality), but it is
 * never pushed below half the ladder, where text starts to smear.
 */
export function videoBitrate(codec: WebVideoCodec, height: number, sourceBitrate: number | null): number {
  const ladder = ladderBitrate(codec, height);
  if (!sourceBitrate || !Number.isFinite(sourceBitrate) || sourceBitrate <= 0) return ladder;
  const bitrate = Math.min(ladder, Math.max(sourceBitrate, ladder * 0.5));
  return Math.round(bitrate / 1000) * 1000;
}

// AAC is played by every browser. 128 kbps keeps a video's narration and
// music clean; 96 kbps is transparent for speech-led audio lessons
// (about 0.7 MB a minute). Opus, used only where AAC can't be encoded, is
// as good at lower rates.
export function audioBitrate(codec: "aac" | "opus" | "vorbis", withVideo: boolean): number {
  if (codec === "aac") return withVideo ? 128_000 : 96_000;
  return withVideo ? 96_000 : 64_000;
}

export interface SourceInfo {
  mimeType: string;
  videoCodec: string | null;
  audioCodec: string | null;
  height: number | null;
  frameRate: number | null;
  // Whole file, bits per second.
  bitrate: number | null;
}

/**
 * True when the original already plays in every browser at a sensible
 * size, so re-encoding would only cost quality. Such files are uploaded
 * exactly as they are.
 */
export function canKeepOriginal(kind: "VIDEO" | "AUDIO", source: SourceInfo): boolean {
  if (!source.bitrate) return false;
  if (kind === "AUDIO") {
    const webAudio =
      (source.mimeType === "audio/mpeg" && source.audioCodec === "mp3") ||
      (source.mimeType === "audio/mp4" && source.audioCodec === "aac");
    return webAudio && source.bitrate <= 160_000;
  }
  if (source.mimeType !== "video/mp4" || source.videoCodec !== "avc") return false;
  if (source.audioCodec !== null && source.audioCodec !== "aac") return false;
  if (!source.height || source.height > MAX_VIDEO_HEIGHT) return false;
  if (source.frameRate && source.frameRate > MAX_FRAME_RATE + 1) return false;
  return source.bitrate <= ladderBitrate("avc", source.height) * 1.25 + 160_000;
}
