import { describe, expect, it } from "vitest";
import { formatBuildVersion } from "./buildInfo";

describe("build version", () => {
  it("formats clean commit versions", () => {
    expect(
      formatBuildVersion({
        fullCommit: "1234567890abcdef",
        shortCommit: "12345678",
        dirty: false,
        builtAt: "2026-06-14T00:00:00.000Z",
      }),
    ).toBe("Commit 12345678");
  });

  it("marks locally modified builds", () => {
    expect(
      formatBuildVersion({
        fullCommit: "1234567890abcdef",
        shortCommit: "12345678",
        dirty: true,
        builtAt: "2026-06-14T00:00:00.000Z",
      }),
    ).toBe("Commit 12345678 · lokal verändert");
  });
});
