import { describe, expect, test } from "bun:test";
import {
  CURRENT_LINE_HIGHLIGHT_STYLE,
  DIM_UNFOCUSED_EDITORS_BEHAVIOR,
  DIM_UNFOCUSED_MODE,
  ENABLED_PLATFORMS,
  WRITING_FOCUS_VIGNETTE_STYLE,
} from "./constants";
import type { TypewriterModeSettings } from "./settings";
import {
  applyStartupMigrations,
  DEFAULT_SETTINGS,
  getSettingByPath,
  setSettingByPath,
} from "./settings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSettings(): TypewriterModeSettings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

/** Minimal Vault stub that never finds the legacy cursor-positions.json file. */
function makeVault(fileExists = false, fileContent = "{}") {
  return {
    adapter: {
      exists: async (_path: string) => fileExists,
      read: async (_path: string) => fileContent,
    },
  } as any;
}

// ---------------------------------------------------------------------------
// DEFAULT_SETTINGS shape
// ---------------------------------------------------------------------------

describe("DEFAULT_SETTINGS", () => {
  test("has all top-level category keys", () => {
    const keys = [
      "general",
      "typewriter",
      "keepLinesAboveAndBelow",
      "maxChars",
      "dimming",
      "currentLine",
      "writingFocus",
      "restoreCursorPosition",
      "hemingwayMode",
    ];
    for (const key of keys) {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    }
  });

  test("general defaults are sensible", () => {
    expect(DEFAULT_SETTINGS.general.version).toBeNull();
    expect(DEFAULT_SETTINGS.general.isPluginActivated).toBe(true);
    expect(DEFAULT_SETTINGS.general.isAnnounceUpdatesEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.general.enabledPlatforms).toBe(
      ENABLED_PLATFORMS.BOTH
    );
    expect(DEFAULT_SETTINGS.general.enabledFilePaths).toEqual([]);
    expect(DEFAULT_SETTINGS.general.disabledFilePaths).toEqual([]);
  });

  test("typewriter defaults are sensible", () => {
    expect(DEFAULT_SETTINGS.typewriter.isTypewriterScrollEnabled).toBe(true);
    expect(DEFAULT_SETTINGS.typewriter.typewriterOffset).toBe(0.5);
    expect(
      DEFAULT_SETTINGS.typewriter
        .isOnlyMaintainTypewriterOffsetWhenReachedEnabled
    ).toBe(false);
    expect(DEFAULT_SETTINGS.typewriter.isTypewriterOnlyUseCommandsEnabled).toBe(
      false
    );
  });

  test("keepLinesAboveAndBelow defaults are sensible", () => {
    expect(
      DEFAULT_SETTINGS.keepLinesAboveAndBelow.isKeepLinesAboveAndBelowEnabled
    ).toBe(false);
    expect(DEFAULT_SETTINGS.keepLinesAboveAndBelow.linesAboveAndBelow).toBe(5);
  });

  test("maxChars defaults are sensible", () => {
    expect(DEFAULT_SETTINGS.maxChars.isMaxCharsPerLineEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.maxChars.maxCharsPerLine).toBe(64);
  });

  test("dimming defaults are sensible", () => {
    expect(DEFAULT_SETTINGS.dimming.isDimUnfocusedEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.dimming.dimmedOpacity).toBe(0.25);
    expect(DEFAULT_SETTINGS.dimming.dimUnfocusedMode).toBe(
      DIM_UNFOCUSED_MODE.PARAGRAPHS
    );
    expect(DEFAULT_SETTINGS.dimming.dimUnfocusedEditorsBehavior).toBe(
      DIM_UNFOCUSED_EDITORS_BEHAVIOR.DIM
    );
    expect(
      DEFAULT_SETTINGS.dimming.isPauseDimUnfocusedWhileScrollingEnabled
    ).toBe(true);
    expect(
      DEFAULT_SETTINGS.dimming.isPauseDimUnfocusedWhileSelectingEnabled
    ).toBe(true);
  });

  test("currentLine defaults are sensible", () => {
    expect(DEFAULT_SETTINGS.currentLine.isHighlightCurrentLineEnabled).toBe(
      true
    );
    expect(DEFAULT_SETTINGS.currentLine.currentLineHighlightStyle).toBe(
      CURRENT_LINE_HIGHLIGHT_STYLE.BOX
    );
    expect(DEFAULT_SETTINGS.currentLine.isFadeLinesEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.currentLine.fadeLinesIntensity).toBe(0.5);
  });

  test("writingFocus defaults are sensible", () => {
    expect(DEFAULT_SETTINGS.writingFocus.doesWritingFocusShowVignette).toBe(
      true
    );
    expect(DEFAULT_SETTINGS.writingFocus.isWritingFocusFullscreen).toBe(true);
    expect(DEFAULT_SETTINGS.writingFocus.writingFocusVignetteStyle).toBe(
      WRITING_FOCUS_VIGNETTE_STYLE.BOX
    );
    expect(DEFAULT_SETTINGS.writingFocus.writingFocusFontSize).toBe(0);
  });

  test("hemingwayMode defaults are sensible", () => {
    expect(DEFAULT_SETTINGS.hemingwayMode.isHemingwayModeEnabled).toBe(false);
    expect(
      DEFAULT_SETTINGS.hemingwayMode.isAllowBackspaceInHemingwayModeEnabled
    ).toBe(false);
    expect(
      DEFAULT_SETTINGS.hemingwayMode.isShowHemingwayModeStatusBarEnabled
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getSettingByPath
// ---------------------------------------------------------------------------

describe("getSettingByPath", () => {
  test("reads a boolean setting from general category", () => {
    const settings = makeSettings();
    const value = getSettingByPath(settings, "general.isPluginActivated");
    expect(value).toBe(true);
  });

  test("reads a number setting", () => {
    const settings = makeSettings();
    const value = getSettingByPath(settings, "typewriter.typewriterOffset");
    expect(value).toBe(0.5);
  });

  test("reads a string-enum setting", () => {
    const settings = makeSettings();
    const value = getSettingByPath(settings, "dimming.dimUnfocusedMode");
    expect(value).toBe(DIM_UNFOCUSED_MODE.PARAGRAPHS);
  });

  test("reads an array setting", () => {
    const settings = makeSettings();
    const value = getSettingByPath(settings, "general.enabledFilePaths");
    expect(value).toEqual([]);
  });

  test("reads a null version setting", () => {
    const settings = makeSettings();
    const value = getSettingByPath(settings, "general.version");
    expect(value).toBeNull();
  });

  test("reads the correct value after manual mutation", () => {
    const settings = makeSettings();
    settings.typewriter.typewriterOffset = 0.75;
    const value = getSettingByPath(settings, "typewriter.typewriterOffset");
    expect(value).toBe(0.75);
  });
});

// ---------------------------------------------------------------------------
// setSettingByPath
// ---------------------------------------------------------------------------

describe("setSettingByPath", () => {
  test("sets a boolean setting", () => {
    const settings = makeSettings();
    setSettingByPath(settings, "general.isPluginActivated", false);
    expect(settings.general.isPluginActivated).toBe(false);
  });

  test("sets a number setting", () => {
    const settings = makeSettings();
    setSettingByPath(settings, "typewriter.typewriterOffset", 0.3);
    expect(settings.typewriter.typewriterOffset).toBe(0.3);
  });

  test("sets a string-enum setting", () => {
    const settings = makeSettings();
    setSettingByPath(
      settings,
      "dimming.dimUnfocusedMode",
      DIM_UNFOCUSED_MODE.SENTENCES
    );
    expect(settings.dimming.dimUnfocusedMode).toBe(
      DIM_UNFOCUSED_MODE.SENTENCES
    );
  });

  test("sets a string setting", () => {
    const settings = makeSettings();
    setSettingByPath(settings, "general.version", "1.2.3");
    expect(settings.general.version).toBe("1.2.3");
  });

  test("mutates only the targeted key", () => {
    const settings = makeSettings();
    const originalOffset = settings.typewriter.typewriterOffset;
    setSettingByPath(settings, "typewriter.isTypewriterScrollEnabled", false);
    // Other typewriter keys must remain unchanged
    expect(settings.typewriter.typewriterOffset).toBe(originalOffset);
  });

  test("round-trips correctly with getSettingByPath", () => {
    const settings = makeSettings();
    setSettingByPath(settings, "maxChars.maxCharsPerLine", 80);
    expect(getSettingByPath(settings, "maxChars.maxCharsPerLine")).toBe(80);
  });
});

// ---------------------------------------------------------------------------
// applyStartupMigrations — new format (passthrough)
// ---------------------------------------------------------------------------

describe("applyStartupMigrations — new grouped format", () => {
  test("passes through an already-grouped settings object unchanged", async () => {
    const input = makeSettings();
    input.typewriter.typewriterOffset = 0.4;
    const result = await applyStartupMigrations(input, makeVault(), "/plugin");
    expect(result.typewriter.typewriterOffset).toBe(0.4);
    expect(result.general.isPluginActivated).toBe(true);
  });

  test("returns the same reference when already in new format", async () => {
    const input = makeSettings();
    const result = await applyStartupMigrations(input, makeVault(), "/plugin");
    // The passthrough branch returns the input directly (cast)
    expect(result).toBe(input);
  });
});

// ---------------------------------------------------------------------------
// applyStartupMigrations — legacy flat format (migration)
// ---------------------------------------------------------------------------

describe("applyStartupMigrations — legacy flat format", () => {
  test("migrates an empty legacy object to defaults", async () => {
    const result = await applyStartupMigrations({}, makeVault(), "/plugin");
    expect(result.general.isPluginActivated).toBe(
      DEFAULT_SETTINGS.general.isPluginActivated
    );
    expect(result.typewriter.typewriterOffset).toBe(
      DEFAULT_SETTINGS.typewriter.typewriterOffset
    );
  });

  test("preserves explicitly set legacy values", async () => {
    const legacy = {
      isTypewriterScrollEnabled: false,
      typewriterOffset: 0.3,
      isPluginActivated: false,
      version: "1.0.0",
    };
    const result = await applyStartupMigrations(legacy, makeVault(), "/plugin");
    expect(result.typewriter.isTypewriterScrollEnabled).toBe(false);
    expect(result.typewriter.typewriterOffset).toBe(0.3);
    expect(result.general.isPluginActivated).toBe(false);
    expect(result.general.version).toBe("1.0.0");
  });

  test("migrates dimming settings from flat format", async () => {
    const legacy = {
      isDimUnfocusedEnabled: true,
      dimmedOpacity: 0.5,
      dimUnfocusedMode: DIM_UNFOCUSED_MODE.SENTENCES,
    };
    const result = await applyStartupMigrations(legacy, makeVault(), "/plugin");
    expect(result.dimming.isDimUnfocusedEnabled).toBe(true);
    expect(result.dimming.dimmedOpacity).toBe(0.5);
    expect(result.dimming.dimUnfocusedMode).toBe(DIM_UNFOCUSED_MODE.SENTENCES);
  });

  test("migrates currentLine settings from flat format", async () => {
    const legacy = {
      isHighlightCurrentLineEnabled: false,
      currentLineHighlightStyle: CURRENT_LINE_HIGHLIGHT_STYLE.UNDERLINE,
      currentLineHighlightUnderlineThickness: 3,
      "currentLineHighlightColor-dark": "#000",
      "currentLineHighlightColor-light": "#fff",
    };
    const result = await applyStartupMigrations(legacy, makeVault(), "/plugin");
    expect(result.currentLine.isHighlightCurrentLineEnabled).toBe(false);
    expect(result.currentLine.currentLineHighlightStyle).toBe(
      CURRENT_LINE_HIGHLIGHT_STYLE.UNDERLINE
    );
    expect(result.currentLine.currentLineHighlightUnderlineThickness).toBe(3);
    expect(result.currentLine["currentLineHighlightColor-dark"]).toBe("#000");
    expect(result.currentLine["currentLineHighlightColor-light"]).toBe("#fff");
  });

  test("migrates hemingwayMode settings from flat format", async () => {
    const legacy = {
      isHemingwayModeEnabled: true,
      isAllowBackspaceInHemingwayModeEnabled: true,
      hemingwayModeStatusBarText: "Focus",
    };
    const result = await applyStartupMigrations(legacy, makeVault(), "/plugin");
    expect(result.hemingwayMode.isHemingwayModeEnabled).toBe(true);
    expect(result.hemingwayMode.isAllowBackspaceInHemingwayModeEnabled).toBe(
      true
    );
    expect(result.hemingwayMode.hemingwayModeStatusBarText).toBe("Focus");
  });

  test("migrates writingFocus settings from flat format", async () => {
    const legacy = {
      doesWritingFocusShowHeader: true,
      doesWritingFocusShowStatusBar: true,
      doesWritingFocusShowVignette: false,
      isWritingFocusFullscreen: false,
      writingFocusFontSize: 18,
      writingFocusVignetteStyle: WRITING_FOCUS_VIGNETTE_STYLE.COLUMN,
    };
    const result = await applyStartupMigrations(legacy, makeVault(), "/plugin");
    expect(result.writingFocus.doesWritingFocusShowHeader).toBe(true);
    expect(result.writingFocus.doesWritingFocusShowStatusBar).toBe(true);
    expect(result.writingFocus.doesWritingFocusShowVignette).toBe(false);
    expect(result.writingFocus.isWritingFocusFullscreen).toBe(false);
    expect(result.writingFocus.writingFocusFontSize).toBe(18);
    expect(result.writingFocus.writingFocusVignetteStyle).toBe(
      WRITING_FOCUS_VIGNETTE_STYLE.COLUMN
    );
  });

  test("migrates keepLinesAboveAndBelow settings from flat format", async () => {
    const legacy = {
      isKeepLinesAboveAndBelowEnabled: true,
      linesAboveAndBelow: 3,
    };
    const result = await applyStartupMigrations(legacy, makeVault(), "/plugin");
    expect(result.keepLinesAboveAndBelow.isKeepLinesAboveAndBelowEnabled).toBe(
      true
    );
    expect(result.keepLinesAboveAndBelow.linesAboveAndBelow).toBe(3);
  });

  test("migrates maxChars settings from flat format", async () => {
    const legacy = {
      isMaxCharsPerLineEnabled: true,
      maxCharsPerLine: 80,
    };
    const result = await applyStartupMigrations(legacy, makeVault(), "/plugin");
    expect(result.maxChars.isMaxCharsPerLineEnabled).toBe(true);
    expect(result.maxChars.maxCharsPerLine).toBe(80);
  });

  test("cursor positions start empty when legacy file does not exist", async () => {
    const result = await applyStartupMigrations(
      {},
      makeVault(false),
      "/plugin"
    );
    expect(result.restoreCursorPosition.cursorPositions).toEqual({});
  });

  test("migrates cursor positions from legacy file when it exists", async () => {
    const positions = { "file.md": { line: 5, ch: 3 } };
    const result = await applyStartupMigrations(
      {},
      makeVault(true, JSON.stringify(positions)),
      "/plugin"
    );
    expect(result.restoreCursorPosition.cursorPositions).toEqual(positions);
  });

  test("handles invalid JSON in legacy cursor-positions.json gracefully", async () => {
    const vaultWithBadJson = {
      adapter: {
        exists: async () => true,
        read: async () => "not valid json {{",
      },
    } as any;
    // Should not throw; cursor positions fall back to empty object
    const result = await applyStartupMigrations(
      {},
      vaultWithBadJson,
      "/plugin"
    );
    expect(result.restoreCursorPosition.cursorPositions).toEqual({});
  });

  test("handles vault read error gracefully", async () => {
    const vaultWithError = {
      adapter: {
        exists: async () => true,
        read: () => {
          throw new Error("disk error");
        },
      },
    } as any;
    // Should not throw
    const result = await applyStartupMigrations({}, vaultWithError, "/plugin");
    expect(result.restoreCursorPosition.cursorPositions).toEqual({});
  });
});
