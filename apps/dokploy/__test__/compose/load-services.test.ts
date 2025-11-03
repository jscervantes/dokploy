/**
 * Test for Milestone 1: Improve Backend Error Handling
 * 
 * Tests that loadServices gracefully handles errors instead of throwing,
 * returning empty arrays to enable UI to show manual input fallback.
 */

import type { Compose } from "@dokploy/server/db/schema/compose";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock database to prevent actual DB connections
vi.mock("@dokploy/server/db", () => ({
	db: {
		query: {
			compose: {
				findFirst: vi.fn(),
			},
		},
	},
}));

// Mock dependencies before importing loadServices
const mockFindComposeById = vi.fn();
const mockCloneCompose = vi.fn();
const mockCloneComposeRemote = vi.fn();
const mockLoadDockerCompose = vi.fn();
const mockLoadDockerComposeRemote = vi.fn();
const mockRandomizeSpecificationFile = vi.fn((data, _suffix) => data);

vi.mock("@dokploy/server/services/compose", async () => {
	const actual = await vi.importActual("@dokploy/server/services/compose");
	return {
		...actual,
		findComposeById: mockFindComposeById,
	};
});

vi.mock("@dokploy/server/utils/docker/domain", () => ({
	cloneCompose: mockCloneCompose,
	cloneComposeRemote: mockCloneComposeRemote,
	loadDockerCompose: mockLoadDockerCompose,
	loadDockerComposeRemote: mockLoadDockerComposeRemote,
}));

vi.mock("@dokploy/server/utils/docker/compose", () => ({
	randomizeSpecificationFile: mockRandomizeSpecificationFile,
}));

// Import after mocks are set up
const { loadServices } = await import("@dokploy/server/services/compose");

const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("loadServices - Error Handling (Milestone 1)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		consoleWarnSpy.mockClear();
	});

	test("should return empty array when services not found", async () => {
		const mockCompose: Partial<Compose> = {
			composeId: "test-compose-1",
			appName: "test-app",
			serverId: null,
			randomize: false,
		};

		mockFindComposeById.mockResolvedValue(mockCompose as Compose);
		mockCloneCompose.mockResolvedValue(undefined);
		mockLoadDockerCompose.mockResolvedValue({
			version: "3.8",
			// No services property
		} as any);

		const result = await loadServices("test-compose-1", "cache");

		expect(result).toEqual([]);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"No services found in compose file for composeId: test-compose-1",
		);
	});

	test("should return empty array when composeData is null", async () => {
		const mockCompose: Partial<Compose> = {
			composeId: "test-compose-2",
			appName: "test-app",
			serverId: null,
			randomize: false,
		};

		mockFindComposeById.mockResolvedValue(mockCompose as Compose);
		mockCloneCompose.mockResolvedValue(undefined);
		mockLoadDockerCompose.mockResolvedValue(null);

		const result = await loadServices("test-compose-2", "cache");

		expect(result).toEqual([]);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"No services found in compose file for composeId: test-compose-2",
		);
	});

	test("should return empty array on error during file loading", async () => {
		const mockCompose: Partial<Compose> = {
			composeId: "test-compose-3",
			appName: "test-app",
			serverId: null,
			randomize: false,
		};

		mockFindComposeById.mockResolvedValue(mockCompose as Compose);
		mockCloneCompose.mockResolvedValue(undefined);
		mockLoadDockerCompose.mockRejectedValue(new Error("File not found"));

		const result = await loadServices("test-compose-3", "cache");

		expect(result).toEqual([]);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"Error loading services for composeId: test-compose-3",
			"File not found",
		);
	});

	test("should return empty array on error during clone", async () => {
		const mockCompose: Partial<Compose> = {
			composeId: "test-compose-4",
			appName: "test-app",
			serverId: null,
			randomize: false,
		};

		mockFindComposeById.mockResolvedValue(mockCompose as Compose);
		mockCloneCompose.mockRejectedValue(new Error("Clone failed"));

		const result = await loadServices("test-compose-4", "fetch");

		expect(result).toEqual([]);
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			"Error loading services for composeId: test-compose-4",
			"Clone failed",
		);
	});

	test("should return services array when services are found", async () => {
		const mockCompose: Partial<Compose> = {
			composeId: "test-compose-5",
			appName: "test-app",
			serverId: null,
			randomize: false,
		};

		const mockComposeData = {
			version: "3.8",
			services: {
				web: { image: "nginx:latest" },
				api: { image: "node:latest" },
			},
		};

		mockFindComposeById.mockResolvedValue(mockCompose as Compose);
		mockCloneCompose.mockResolvedValue(undefined);
		mockLoadDockerCompose.mockResolvedValue(mockComposeData as any);

		const result = await loadServices("test-compose-5", "cache");

		expect(result).toEqual(["web", "api"]);
		expect(consoleWarnSpy).not.toHaveBeenCalled();
	});

	test("should work with remote server", async () => {
		const mockCompose: Partial<Compose> = {
			composeId: "test-compose-6",
			appName: "test-app",
			serverId: "server-123",
			randomize: false,
		};

		const mockComposeData = {
			version: "3.8",
			services: {
				web: { image: "nginx:latest" },
			},
		};

		mockFindComposeById.mockResolvedValue(mockCompose as Compose);
		mockCloneComposeRemote.mockResolvedValue(undefined);
		mockLoadDockerComposeRemote.mockResolvedValue(mockComposeData as any);

		const result = await loadServices("test-compose-6", "fetch");

		expect(result).toEqual(["web"]);
		expect(consoleWarnSpy).not.toHaveBeenCalled();
	});

	test("should handle errors gracefully with randomized compose", async () => {
		const mockCompose: Partial<Compose> = {
			composeId: "test-compose-7",
			appName: "test-app",
			serverId: null,
			randomize: true,
			suffix: "test-suffix",
		};

		mockFindComposeById.mockResolvedValue(mockCompose as Compose);
		mockCloneCompose.mockResolvedValue(undefined);
		mockLoadDockerCompose.mockRejectedValue(new Error("Randomize failed"));

		const result = await loadServices("test-compose-7", "cache");

		expect(result).toEqual([]);
		expect(consoleWarnSpy).toHaveBeenCalled();
	});
});

