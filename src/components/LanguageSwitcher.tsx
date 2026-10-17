"use client";

import { LanguagePicker } from "./LanguagePicker";

/** Compact language control used in the app header. */
export function LanguageSwitcher() {
  return (
    <div className="w-full max-w-[14rem]">
      <LanguagePicker />
    </div>
  );
}
