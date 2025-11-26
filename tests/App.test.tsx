import React from "react";
import { render, screen } from "@testing-library/react";
import { App } from "../src/App";

describe("App", () => {
  test("renders application title and placeholder description", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Chess Practice App" })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Project setup complete\. Future issues will implement the interactive board, move list, and kifu features\./i
      )
    ).toBeInTheDocument();
  });
}
);


