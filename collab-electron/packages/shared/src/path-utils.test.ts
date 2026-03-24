import { describe, expect, test } from "bun:test";
import {
	isSameOrChildPath,
	joinPath,
	pathBasename,
	pathDirname,
	replacePathPrefix,
} from "./path-utils";

describe("path-utils", () => {
	test("handles Windows basenames and dirnames", () => {
		expect(pathBasename("C:\\Projects\\collab\\file.md")).toBe("file.md");
		expect(pathDirname("C:\\Projects\\collab\\file.md")).toBe("C:\\Projects\\collab");
	});

	test("handles POSIX basenames and dirnames", () => {
		expect(pathBasename("/tmp/collab/file.md")).toBe("file.md");
		expect(pathDirname("/tmp/collab/file.md")).toBe("/tmp/collab");
	});

	test("joins Windows paths with backslashes", () => {
		expect(joinPath("C:\\Projects\\collab", "notes", "file.md")).toBe(
			"C:\\Projects\\collab\\notes\\file.md",
		);
	});

	test("detects same-or-child paths across separators", () => {
		expect(
			isSameOrChildPath(
				"C:\\Projects\\collab",
				"C:/Projects/collab/src",
			),
		).toBe(true);
	});

	test("replaces path prefixes safely", () => {
		expect(
			replacePathPrefix(
				"C:\\Projects\\collab\\notes\\a.md",
				"C:\\Projects\\collab",
				"D:\\Archive\\collab",
			),
		).toBe("D:\\Archive\\collab\\notes\\a.md");
	});
});
