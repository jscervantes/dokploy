/**
 * Test for Milestone 2: Add CLI Flag Parsing Utility
 * 
 * Tests that getComposePath correctly parses CLI flags from composePath
 * to extract actual file paths.
 */

import { getComposePath } from "@dokploy/server/utils/docker/domain";
import type { Compose } from "@dokploy/server/db/schema/compose";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { join } from "node:path";

// Mock paths function - define completely inside factory
vi.mock("@dokploy/server/constants", () => {
	return {
		paths: vi.fn(() => ({
			COMPOSE_PATH: "/mock/compose/path",
		})),
	};
});

// Get the mocked paths function after import
import { paths } from "@dokploy/server/constants";

const mockPaths = vi.mocked(paths);

describe("getComposePath - CLI Flag Parsing (Milestone 2)", () => {
	beforeEach(() => {
		mockPaths.mockReturnValue({
			COMPOSE_PATH: "/mock/compose/path",
		});
	});

	test("should parse -f flag and extract file path", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: "-f docker-compose.yml",
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "docker-compose.yml");

		expect(result).toBe(expected);
	});

	test("should parse --file flag and extract file path", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: "--file custom-compose.yml",
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "custom-compose.yml");

		expect(result).toBe(expected);
	});

	test("should parse -f flag with double-quoted path", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: '-f "my-compose.yml"',
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "my-compose.yml");

		expect(result).toBe(expected);
	});

	test("should parse -f flag with single-quoted path", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: "-f 'my-compose.yml'",
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "my-compose.yml");

		expect(result).toBe(expected);
	});

	test("should return simple path as-is when no flags detected", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: "docker-compose.yml",
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "docker-compose.yml");

		expect(result).toBe(expected);
	});

	test("should not apply parsing for raw source type", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "raw",
			composePath: "-f should-not-parse.yml",
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		// Raw source type always uses docker-compose.yml, regardless of composePath
		const expected = join("/mock/compose/path", "test-app", "code", "docker-compose.yml");

		expect(result).toBe(expected);
	});

	test("should handle whitespace around flags", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: "  -f   docker-compose.yml  ",
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "docker-compose.yml");

		expect(result).toBe(expected);
	});

	test("should handle path with spaces in filename", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: '-f "my compose file.yml"',
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "my compose file.yml");

		expect(result).toBe(expected);
	});

	test("should handle --file with quoted path", () => {
		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: '--file "custom-path.yml"',
			serverId: null,
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/mock/compose/path", "test-app", "code", "custom-path.yml");

		expect(result).toBe(expected);
	});

	test("should work with remote server", () => {
		mockPaths.mockReturnValue({
			COMPOSE_PATH: "/remote/compose/path",
		});

		const mockCompose: Partial<Compose> = {
			appName: "test-app",
			sourceType: "github",
			composePath: "-f docker-compose.yml",
			serverId: "server-123",
		};

		const result = getComposePath(mockCompose as Compose);
		const expected = join("/remote/compose/path", "test-app", "code", "docker-compose.yml");

		expect(result).toBe(expected);
	});
});

