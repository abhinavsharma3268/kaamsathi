import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "./CopyButton";
import { LanguageProvider } from "@/hooks/useLanguage";

describe("CopyButton", () => {
  it("shows confirmation after copying text", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <CopyButton text="Complaint draft body" />
      </LanguageProvider>,
    );

    expect(screen.getByRole("button", { name: /^copy$/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^copy$/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^copied$/i }),
      ).toBeInTheDocument();
    });
  });
});
