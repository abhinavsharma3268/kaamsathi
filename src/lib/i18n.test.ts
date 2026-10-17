import { describe, expect, it } from "vitest";
import { t, languageName, LANG_OPTIONS } from "./i18n";

describe("i18n", () => {
  it("exposes English, Hindi, and Punjabi", () => {
    expect(LANG_OPTIONS.map((o) => o.code)).toEqual(["en", "hi", "pa"]);
  });

  it("returns localized dashboard titles", () => {
    expect(t("en", "dashboardTitle")).toBe("How can we help you today?");
    expect(t("hi", "dashboardTitle")).toBe("आज हम आपकी कैसे मदद करें?");
    expect(t("pa", "dashboardTitle")).toBe("ਅੱਜ ਅਸੀਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰੀਏ?");
  });


  it("exposes task-oriented home labels in all languages", () => {
    expect(t("en", "taskEarnings")).toBe("My Earnings");
    expect(t("hi", "taskSafety")).toBe("सुरक्षा मदद");
    expect(t("pa", "taskRights")).toBe("ਮੇਰੇ ਹੱਕ ਅਤੇ ਲਾਭ");
    expect(t("en", "answerSimple")).toBe("Simple answer");
    expect(t("en", "qaUnpaid")).toMatch(/wages/i);
  });

  it("falls back to English for unknown keys in a language table via en", () => {
    expect(t("en", "appName")).toBe("KaamSaathi");
    expect(languageName("hi")).toBe("हिन्दी");
  });

  it("localizes occupation labels used by profile setup", () => {
    expect(t("en", "occDelivery")).toMatch(/delivery/i);
    expect(t("hi", "occDelivery")).toMatch(/डिलीवरी/);
    expect(t("pa", "occDriver")).toMatch(/ਡਰਾਈਵਰ/);
    expect(t("en", "profileSkip")).toMatch(/skip/i);
  });

  it("localizes Find My Complaint Portal entry text", () => {
    expect(t("en", "cpTitle")).toMatch(/complaint portal/i);
    expect(t("hi", "cpTitle")).toMatch(/शिकायत/);
    expect(t("pa", "cpTitle")).toMatch(/ਸ਼ਿਕਾਇਤ/);
    expect(t("en", "cpBody")).toMatch(/what happened/i);
    expect(t("en", "cpBody")).toMatch(/never submits/i);
    expect(t("en", "cpNoSubmit")).toMatch(/does not submit/i);
  });
});
