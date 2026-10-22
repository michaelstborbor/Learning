import { describe, expect, it } from "vitest";
import { cleanTranscript, isTranscriptLanguage } from "./transcript";

describe("cleanTranscript", () => {
  it("strips WebVTT headers, timings and tags", () => {
    const vtt = `WEBVTT

NOTE made by hand

00:00:01.000 --> 00:00:03.000
<v Teacher>Welcome to the course.

00:00:03.500 --> 00:00:06.000
Today we learn
about soil.
`;
    expect(cleanTranscript(vtt)).toBe("Welcome to the course.\nToday we learn about soil.");
  });

  it("strips SRT cue numbers and drops repeated cues", () => {
    const srt = `1\r\n00:00:01,000 --> 00:00:02,000\r\nKusheh!\r\n\r\n2\r\n00:00:02,000 --> 00:00:03,000\r\nKusheh!\r\n\r\n3\r\n00:00:03,000 --> 00:00:05,000\r\nAw di bodi?\r\n`;
    expect(cleanTranscript(srt)).toBe("Kusheh!\nAw di bodi?");
  });

  it("keeps plain text, tidying blank lines", () => {
    expect(cleanTranscript("Line one\r\n\r\n\r\n\r\nLine two  ")).toBe("Line one\n\nLine two");
  });
});

describe("isTranscriptLanguage", () => {
  it("accepts English and Krio only", () => {
    expect(isTranscriptLanguage("en")).toBe(true);
    expect(isTranscriptLanguage("kri")).toBe(true);
    expect(isTranscriptLanguage("fr")).toBe(false);
  });
});
