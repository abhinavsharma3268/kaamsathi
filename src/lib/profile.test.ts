import { describe, expect, it } from "vitest";
import {
  buildProfile,
  hasCompletedProfileSetup,
  normalizeProfile,
} from "./profile";

describe("worker profile", () => {
  it("normalizes primary and additional occupations without duplicates", () => {
    const profile = normalizeProfile({
      primaryOccupation: "delivery",
      additionalOccupations: ["delivery", "driver", "driver", "vendor"],
      skipped: false,
    });
    expect(profile.primaryOccupation).toBe("delivery");
    expect(profile.additionalOccupations).toEqual(["driver", "vendor"]);
  });

  it("rejects unknown occupation ids", () => {
    const profile = normalizeProfile({
      primaryOccupation: "astronaut",
      additionalOccupations: ["nope", "construction"],
    });
    expect(profile.primaryOccupation).toBeNull();
    expect(profile.additionalOccupations).toEqual(["construction"]);
  });

  it("treats skip or primary as completed setup", () => {
    expect(hasCompletedProfileSetup(buildProfile({ primary: null, skipped: true }))).toBe(
      true,
    );
    expect(
      hasCompletedProfileSetup(buildProfile({ primary: "driver", skipped: false })),
    ).toBe(true);
    expect(
      hasCompletedProfileSetup(buildProfile({ primary: null, skipped: false })),
    ).toBe(false);
  });

  it("keeps local name, gender, and small photo data", () => {
    const profile = normalizeProfile({
      primaryOccupation: "delivery",
      displayName: "  Ravi Kumar  ",
      gender: "man",
      photoDataUrl: "data:image/jpeg;base64,abc",
    });
    expect(profile.displayName).toBe("Ravi Kumar");
    expect(profile.gender).toBe("man");
    expect(profile.photoDataUrl).toBe("data:image/jpeg;base64,abc");
  });

  it("rejects invalid gender and non-image photo payloads", () => {
    const profile = normalizeProfile({
      displayName: "x".repeat(80),
      gender: "alien",
      photoDataUrl: "https://evil.example/x.jpg",
    });
    expect(profile.displayName.length).toBe(60);
    expect(profile.gender).toBeNull();
    expect(profile.photoDataUrl).toBeNull();
  });
});
