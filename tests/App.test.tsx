import React from "react";
import { render, screen } from "@testing-library/react";

import { App } from "../src/App";

describe("App", () => {
  test("renders application title and chessboard", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Chess Practice App" })).toBeInTheDocument();

    // Check that chessboard is rendered
    expect(screen.getByRole("grid", { name: "Chess board" })).toBeInTheDocument();
  });
});
