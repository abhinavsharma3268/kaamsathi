import { describe, expect, it } from "vitest";
import { t, languageName, LANG_OPTIONS } from "./i18n";

describe("i18n", () => {
  it("exposes English, Hindi, and Punjabi", () => {
    expect(LANG_OPTIONS.map((o) => o.code)).toEqual(["en", "hi", "pa"]);
  });

  it("returns localized dashboard titles", () => {
    expect(t("en", "dashboardTitle")).toBe("What do you need?");
    expect(t("hi", "dashboardTitle")).toBe("आपको क्या चाहिए?");
    expect(t("pa", "dashboardTitle")).toBe("ਤੁਹਾਨੂੰ ਕੀ ਚਾਹੀਦਾ ਹੈ?");
  });


  it("exposes task-oriented home labels in all languages", () => {
    expect(t("en", "taskEarnings")).toBe("My Earnings");
    expect(t("hi", "taskSafety")).toBe("सुरक्षा मदद");
    expect(t("pa", "taskRights")).toBe("ਹੱਕ ਅਤੇ ਲਾਭ");
    expect(t("en", "answerSimple")).toBe("Simple answer");
    expect(t("en", "qaUnpaid")).toMatch(/wages/i);
  });

  it("falls back to English for unknown keys in a language table via en", () => {
    expect(t("en", "appName")).toBe("Saath");
    expect(t("hi", "appName")).toBe("Saath");
    expect(t("pa", "appName")).toBe("Saath");
    expect(t("en", "tagline")).toBe("Work, Rights & Support");
    expect(t("hi", "tagline")).toBe("काम, हक़ और मदद");
    expect(t("pa", "tagline")).toBe("ਕੰਮ, ਹੱਕ ਤੇ ਮਦਦ");
    expect(t("en", "supportingMessage")).toMatch(/work matters/i);
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

  it("localizes conversational home welcome in EN/HI/PA", () => {
    expect(t("en", "chatWelcome")).toMatch(/I'm Saath/i);
    expect(t("hi", "chatWelcome")).toMatch(/Saath/);
    expect(t("pa", "chatWelcome")).toMatch(/Saath/);
    expect(t("en", "supportTitle")).toBe("My Support");
    expect(t("hi", "navTalk")).toMatch(/बात/);
    expect(t("pa", "navSupport")).toMatch(/ਮਦਦ/);
  });
});
