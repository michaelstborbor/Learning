import { describe, expect, it } from "vitest";
import { formatLocalNumber, toInternational, whatsappLink, MOBILE_MONEY, WHATSAPP_NUMBER } from "./donations";

describe("donation numbers", () => {
  it("keeps the published numbers", () => {
    expect(MOBILE_MONEY.map((m) => m.number)).toEqual(["074604374", "077939367"]);
    expect(WHATSAPP_NUMBER).toBe("078604374");
  });

  it("formats local numbers in groups of three", () => {
    expect(formatLocalNumber("074604374")).toBe("074 604 374");
  });

  it("converts to the +232 international form", () => {
    expect(toInternational("078604374")).toBe("23278604374");
  });

  it("builds a wa.me link with an encoded message", () => {
    expect(whatsappLink("078604374", "Hi there & thanks")).toBe(
      "https://wa.me/23278604374?text=Hi%20there%20%26%20thanks",
    );
  });
});
