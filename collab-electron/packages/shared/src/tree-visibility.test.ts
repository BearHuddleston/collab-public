import { describe, test, expect } from "bun:test";
import { isTreeVisibleEntry } from "./tree-visibility";

describe("isTreeVisibleEntry", () => {
  test("hides .collaborator directory", () => {
    expect(
      isTreeVisibleEntry({ name: ".collaborator", isDirectory: true }),
    ).toBe(false);
  });

  test("hides .claude directory", () => {
    expect(
      isTreeVisibleEntry({ name: ".claude", isDirectory: true }),
    ).toBe(false);
  });

  test("shows dotfiles", () => {
    expect(
      isTreeVisibleEntry({ name: ".gitignore", isDirectory: false }),
    ).toBe(true);
    expect(
      isTreeVisibleEntry({ name: ".env", isDirectory: false }),
    ).toBe(true);
  });

  test("shows dotfolders not in exclusion list", () => {
    expect(
      isTreeVisibleEntry({ name: ".git", isDirectory: true }),
    ).toBe(true);
    expect(
      isTreeVisibleEntry({ name: ".vscode", isDirectory: true }),
    ).toBe(true);
  });

  test("shows normal files", () => {
    expect(
      isTreeVisibleEntry({ name: "index.ts", isDirectory: false }),
    ).toBe(true);
  });

  test("shows normal directories", () => {
    expect(
      isTreeVisibleEntry({ name: "src", isDirectory: true }),
    ).toBe(true);
  });

  test(".collaborator as a file is visible", () => {
    expect(
      isTreeVisibleEntry({ name: ".collaborator", isDirectory: false }),
    ).toBe(true);
  });
});
