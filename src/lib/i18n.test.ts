import { describe, expect, it } from "vitest";
import { t, languageName, LANG_OPTIONS } from "./i18n";

describe("i18n", () => {
  it("exposes English, Hindi, and Punjabi", () => {
    expect(LANG_OPTIONS.map((o) => o.code)).toEqual(["en", "hi", "pa"]);
  });

  it("returns localized dashboard titles", () => {
    expect(t("en", "dashboardTitle")).toBe("Select a service");
    expect(t("hi", "dashboardTitle")).toBe("सेवा चुनें");
    expect(t("pa", "dashboardTitle")).toBe("ਸੇਵਾ ਚੁਣੋ");
  });

  it("falls back to English for unknown keys in a language table via en", () => {
    expect(t("en", "appName")).toBe("KaamSaathi");
    expect(languageName("hi")).toBe("हिन्दी");
  });
});
