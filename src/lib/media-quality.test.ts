import { describe, expect, it } from "vitest";
import { audioBitrate, canKeepOriginal, ladderBitrate, targetVideoHeight, videoBitrate } from "./media-quality";

describe("targetVideoHeight", () => {
  it("caps at 720p, never upscales and stays even", () => {
    expect(targetVideoHeight(1080)).toBe(720);
    expect(targetVideoHeight(2160)).toBe(720);
    expect(targetVideoHeight(480)).toBe(480);
    expect(targetVideoHeight(361)).toBe(360);
  });
});

describe("videoBitrate", () => {
  it("uses the ladder for heavy sources", () => {
    expect(videoBitrate("avc", 720, 8_000_000)).toBe(2_500_000);
    expect(videoBitrate("vp9", 720, 8_000_000)).toBe(1_750_000);
    expect(videoBitrate("avc", 480, null)).toBe(1_200_000);
  });

  it("doesn't inflate light sources, but never goes below half the ladder", () => {
    expect(videoBitrate("avc", 720, 1_600_000)).toBe(1_600_000);
    expect(videoBitrate("avc", 720, 300_000)).toBe(1_250_000);
  });

  it("keeps 720p H.264 between about 9 and 19 MB a minute", () => {
    const mbPerMinute = (bps: number) => (bps * 60) / 8 / 1_000_000;
    expect(mbPerMinute(ladderBitrate("avc", 720) + audioBitrate("aac", true))).toBeLessThan(20);
    expect(mbPerMinute(videoBitrate("avc", 720, 1) + audioBitrate("aac", true))).toBeGreaterThan(9);
  });
});

describe("canKeepOriginal", () => {
  const mp4 = { mimeType: "video/mp4", videoCodec: "avc", audioCodec: "aac", height: 720, frameRate: 30, bitrate: 2_400_000 };

  it("keeps a web-ready 720p MP4", () => {
    expect(canKeepOriginal("VIDEO", mp4)).toBe(true);
  });

  it("re-encodes what won't play everywhere or is too big", () => {
    expect(canKeepOriginal("VIDEO", { ...mp4, height: 1080 })).toBe(false);
    expect(canKeepOriginal("VIDEO", { ...mp4, bitrate: 9_000_000 })).toBe(false);
    expect(canKeepOriginal("VIDEO", { ...mp4, mimeType: "video/quicktime" })).toBe(false);
    expect(canKeepOriginal("VIDEO", { ...mp4, videoCodec: "hevc" })).toBe(false);
    expect(canKeepOriginal("VIDEO", { ...mp4, frameRate: 60 })).toBe(false);
  });

  it("keeps light MP3 and AAC audio only", () => {
    const mp3 = { mimeType: "audio/mpeg", videoCodec: null, audioCodec: "mp3", height: null, frameRate: null, bitrate: 128_000 };
    expect(canKeepOriginal("AUDIO", mp3)).toBe(true);
    expect(canKeepOriginal("AUDIO", { ...mp3, bitrate: 320_000 })).toBe(false);
    expect(canKeepOriginal("AUDIO", { ...mp3, mimeType: "audio/wav", audioCodec: "pcm-s16" })).toBe(false);
  });
});
