import { RunCommand } from "@esutils/run-command";

describe("RunCommand in typescript", () => {
  it("RunCommand node -v", async () => {
    const result = await RunCommand("node", ["-v"]);
    expect(result.stdout.toString().startsWith("v")).toBe(true);
    expect(result.stderr.toString()).toBe("");
    expect(result.error).toBe(undefined);
    expect(result.code).toBe(0);
  });
});
