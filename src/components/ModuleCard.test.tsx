import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModuleCard } from "./ModuleCard";

describe("ModuleCard", () => {
  it("renders a navigable module link with title and description", () => {
    render(
      <ModuleCard
        href="/earnings"
        icon="₹"
        title="Earnings"
        description="Enter pay and expenses."
        accent="#d7efe4"
      />,
    );

    const link = screen.getByRole("link", { name: /earnings/i });
    expect(link).toHaveAttribute("href", "/earnings");
    expect(screen.getByText("Enter pay and expenses.")).toBeInTheDocument();
  });
});
