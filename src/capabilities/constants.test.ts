/**
 * Tests for capabilities/constants.ts
 *
 * Verifies that each exported constant object has exactly the expected keys
 * and string values. Note: `as const` is a TypeScript type-level assertion
 * only — it does NOT freeze the object at runtime. These tests therefore
 * assert shape and value identity, not runtime immutability. If runtime
 * immutability is desired, the production module would need to wrap the
 * exports in `Object.freeze`.
 */

import { describe, expect, test } from "bun:test";
import {
  CURRENT_LINE_HIGHLIGHT_STYLE,
  DIM_UNFOCUSED_EDITORS_BEHAVIOR,
  DIM_UNFOCUSED_MODE,
  ENABLED_PLATFORMS,
  WRITING_FOCUS_VIGNETTE_STYLE,
} from "@/capabilities/constants";

// ---------------------------------------------------------------------------
// DIM_UNFOCUSED_EDITORS_BEHAVIOR
// ---------------------------------------------------------------------------

describe("DIM_UNFOCUSED_EDITORS_BEHAVIOR", () => {
  test("has NONE, DIM, and ALL keys", () => {
    expect(DIM_UNFOCUSED_EDITORS_BEHAVIOR).toHaveProperty("NONE");
    expect(DIM_UNFOCUSED_EDITORS_BEHAVIOR).toHaveProperty("DIM");
    expect(DIM_UNFOCUSED_EDITORS_BEHAVIOR).toHaveProperty("ALL");
  });

  test("NONE is 'dim-none'", () => {
    expect(DIM_UNFOCUSED_EDITORS_BEHAVIOR.NONE).toBe("dim-none");
  });

  test("DIM is 'dim'", () => {
    expect(DIM_UNFOCUSED_EDITORS_BEHAVIOR.DIM).toBe("dim");
  });

  test("ALL is 'dim-all'", () => {
    expect(DIM_UNFOCUSED_EDITORS_BEHAVIOR.ALL).toBe("dim-all");
  });

  test("has exactly three entries", () => {
    expect(Object.keys(DIM_UNFOCUSED_EDITORS_BEHAVIOR).length).toBe(3);
  });

  test("all values are strings", () => {
    for (const value of Object.values(DIM_UNFOCUSED_EDITORS_BEHAVIOR)) {
      expect(typeof value).toBe("string");
    }
  });

  test("all values are distinct", () => {
    const values = Object.values(DIM_UNFOCUSED_EDITORS_BEHAVIOR);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ---------------------------------------------------------------------------
// DIM_UNFOCUSED_MODE
// ---------------------------------------------------------------------------

describe("DIM_UNFOCUSED_MODE", () => {
  test("has PARAGRAPHS and SENTENCES keys", () => {
    expect(DIM_UNFOCUSED_MODE).toHaveProperty("PARAGRAPHS");
    expect(DIM_UNFOCUSED_MODE).toHaveProperty("SENTENCES");
  });

  test("PARAGRAPHS is 'paragraphs'", () => {
    expect(DIM_UNFOCUSED_MODE.PARAGRAPHS).toBe("paragraphs");
  });

  test("SENTENCES is 'sentences'", () => {
    expect(DIM_UNFOCUSED_MODE.SENTENCES).toBe("sentences");
  });

  test("has exactly two entries", () => {
    expect(Object.keys(DIM_UNFOCUSED_MODE).length).toBe(2);
  });

  test("all values are distinct strings", () => {
    const values = Object.values(DIM_UNFOCUSED_MODE);
    for (const value of values) {
      expect(typeof value).toBe("string");
    }
    expect(new Set(values).size).toBe(values.length);
  });
});

// ---------------------------------------------------------------------------
// CURRENT_LINE_HIGHLIGHT_STYLE
// ---------------------------------------------------------------------------

describe("CURRENT_LINE_HIGHLIGHT_STYLE", () => {
  test("has BOX and UNDERLINE keys", () => {
    expect(CURRENT_LINE_HIGHLIGHT_STYLE).toHaveProperty("BOX");
    expect(CURRENT_LINE_HIGHLIGHT_STYLE).toHaveProperty("UNDERLINE");
  });

  test("BOX is 'box'", () => {
    expect(CURRENT_LINE_HIGHLIGHT_STYLE.BOX).toBe("box");
  });

  test("UNDERLINE is 'underline'", () => {
    expect(CURRENT_LINE_HIGHLIGHT_STYLE.UNDERLINE).toBe("underline");
  });

  test("has exactly two entries", () => {
    expect(Object.keys(CURRENT_LINE_HIGHLIGHT_STYLE).length).toBe(2);
  });

  test("all values are distinct strings", () => {
    const values = Object.values(CURRENT_LINE_HIGHLIGHT_STYLE);
    for (const value of values) {
      expect(typeof value).toBe("string");
    }
    expect(new Set(values).size).toBe(values.length);
  });
});

// ---------------------------------------------------------------------------
// WRITING_FOCUS_VIGNETTE_STYLE
// ---------------------------------------------------------------------------

describe("WRITING_FOCUS_VIGNETTE_STYLE", () => {
  test("has BOX and COLUMN keys", () => {
    expect(WRITING_FOCUS_VIGNETTE_STYLE).toHaveProperty("BOX");
    expect(WRITING_FOCUS_VIGNETTE_STYLE).toHaveProperty("COLUMN");
  });

  test("BOX is 'box'", () => {
    expect(WRITING_FOCUS_VIGNETTE_STYLE.BOX).toBe("box");
  });

  test("COLUMN is 'column'", () => {
    expect(WRITING_FOCUS_VIGNETTE_STYLE.COLUMN).toBe("column");
  });

  test("has exactly two entries", () => {
    expect(Object.keys(WRITING_FOCUS_VIGNETTE_STYLE).length).toBe(2);
  });

  test("all values are distinct strings", () => {
    const values = Object.values(WRITING_FOCUS_VIGNETTE_STYLE);
    for (const value of values) {
      expect(typeof value).toBe("string");
    }
    expect(new Set(values).size).toBe(values.length);
  });
});

// ---------------------------------------------------------------------------
// ENABLED_PLATFORMS
// ---------------------------------------------------------------------------

describe("ENABLED_PLATFORMS", () => {
  test("has BOTH, DESKTOP, and MOBILE keys", () => {
    expect(ENABLED_PLATFORMS).toHaveProperty("BOTH");
    expect(ENABLED_PLATFORMS).toHaveProperty("DESKTOP");
    expect(ENABLED_PLATFORMS).toHaveProperty("MOBILE");
  });

  test("BOTH is 'both'", () => {
    expect(ENABLED_PLATFORMS.BOTH).toBe("both");
  });

  test("DESKTOP is 'desktop'", () => {
    expect(ENABLED_PLATFORMS.DESKTOP).toBe("desktop");
  });

  test("MOBILE is 'mobile'", () => {
    expect(ENABLED_PLATFORMS.MOBILE).toBe("mobile");
  });

  test("has exactly three entries", () => {
    expect(Object.keys(ENABLED_PLATFORMS).length).toBe(3);
  });

  test("all values are distinct strings", () => {
    const values = Object.values(ENABLED_PLATFORMS);
    for (const value of values) {
      expect(typeof value).toBe("string");
    }
    expect(new Set(values).size).toBe(values.length);
  });
});
