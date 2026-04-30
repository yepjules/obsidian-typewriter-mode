import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Vault } from "obsidian";
import { applyStartupMigrations } from "./settings";

// Snapshot of Object.prototype's own keys before each test so we can detect
// any pollution introduced during migration and clean it up between tests.
let originalProtoKeys: Set<string>;

function snapshotPrototype() {
  originalProtoKeys = new Set(Object.getOwnPropertyNames(Object.prototype));
}

function getPrototypeLeaks(): string[] {
  return Object.getOwnPropertyNames(Object.prototype).filter(
    (k) => !originalProtoKeys.has(k)
  );
}

function makeStubVault(opts: { exists?: boolean; read?: string }): Vault {
  return {
    adapter: {
      exists: async () => opts.exists ?? false,
      read: async () => opts.read ?? "{}",
    },
  } as unknown as Vault;
}

describe("applyStartupMigrations — prototype pollution resistance", () => {
  beforeEach(snapshotPrototype);
  afterEach(() => {
    // Clean up anything that did leak so one failure doesn't cascade.
    for (const key of Object.getOwnPropertyNames(Object.prototype)) {
      if (!originalProtoKeys.has(key)) {
        delete (Object.prototype as Record<string, unknown>)[key];
      }
    }
  });

  test("__proto__ key in legacy flat data does not pollute Object.prototype", async () => {
    const malicious = JSON.parse(
      '{"__proto__": {"polluted": "yes"}, "version": "1.0.0", "isPluginActivated": true}'
    );
    const result = await applyStartupMigrations(
      malicious,
      makeStubVault({ exists: false }),
      "."
    );

    expect(getPrototypeLeaks()).toEqual([]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(result.general.version).toBe("1.0.0");
    expect(result.general.isPluginActivated).toBe(true);
  });

  test("constructor.prototype injection in legacy flat data is ignored", async () => {
    const malicious = JSON.parse(
      '{"constructor": {"prototype": {"polluted": "yes"}}, "version": "1.0.0"}'
    );
    await applyStartupMigrations(
      malicious,
      makeStubVault({ exists: false }),
      "."
    );

    expect(getPrototypeLeaks()).toEqual([]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  test("unknown keys in legacy flat data are dropped (only enumerated keys are read)", async () => {
    const malicious = JSON.parse(
      '{"version": "1.0.0", "evilKey": {"x": 1}, "anotherEvil": "stuff", "__proto__": {"y": 2}}'
    );
    const result = (await applyStartupMigrations(
      malicious,
      makeStubVault({ exists: false }),
      "."
    )) as unknown as Record<string, unknown>;

    expect(getPrototypeLeaks()).toEqual([]);
    expect(result.evilKey).toBeUndefined();
    expect(result.anotherEvil).toBeUndefined();
  });

  test("__proto__ inside cursor-positions.json does not pollute Object.prototype", async () => {
    // Triggers the legacy-format branch so migrateCursorPositions runs.
    const minimalLegacy = { version: "1.0.0" };
    const cursorJson = JSON.stringify({
      __proto__: { polluted: "yes" },
      "/notes/foo.md": { line: 5, ch: 3 },
    });
    const result = await applyStartupMigrations(
      minimalLegacy,
      makeStubVault({ exists: true, read: cursorJson }),
      "."
    );

    expect(getPrototypeLeaks()).toEqual([]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // Real keys still survive the JSON.parse round-trip.
    expect(
      result.restoreCursorPosition.cursorPositions["/notes/foo.md"]
    ).toEqual({ line: 5, ch: 3 });
  });

  test("malformed cursor-positions.json is caught and does not throw", async () => {
    const minimalLegacy = { version: "1.0.0" };
    const result = await applyStartupMigrations(
      minimalLegacy,
      makeStubVault({ exists: true, read: "{not valid json" }),
      "."
    );

    expect(getPrototypeLeaks()).toEqual([]);
    // cursorPositions stays at the empty default after parse failure.
    expect(result.restoreCursorPosition.cursorPositions).toEqual({});
  });

  test("non-legacy data passes through untouched", async () => {
    const newFormat = {
      general: { version: "1.4.0-beta.1" },
    };
    const result = (await applyStartupMigrations(
      newFormat as never,
      makeStubVault({ exists: false }),
      "."
    )) as unknown as { general: { version: string } };

    expect(getPrototypeLeaks()).toEqual([]);
    expect(result.general.version).toBe("1.4.0-beta.1");
  });
});
