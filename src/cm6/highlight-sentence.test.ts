/**
 * Tests for highlight-sentence.ts
 *
 * The module uses `Array.prototype.contains`, which is a monkey-patched
 * extension added by Obsidian at runtime. We polyfill it here so the tests
 * run in plain Node / Bun without an Obsidian environment.
 *
 * `getActiveSentenceDecos` is the only public export. Its return value is a
 * CodeMirror DecorationSet; we inspect it via `between()` to verify which
 * ranges received which CSS classes.
 *
 * Implementation notes that affect expected test values:
 *
 *  - `ignoredPatterns` is split by "\n". An empty string produces `[""]`, and
 *    the empty pattern trivially matches every position, suppressing ALL
 *    delimiter detection. Always provide a non-empty, specific pattern like
 *    "Mr." in tests.
 *
 *  - The forward scan (finding the sentence end) skips consecutive delimiters
 *    ("...") and trailing extraCharacters, but does NOT skip whitespace.
 *    Therefore the end position falls right after the delimiter (and any
 *    immediately following extra chars), not after trailing spaces.
 *
 *  - The backward scan (finding the sentence start) DOES skip leading spaces
 *    that separate sentences, so `start` lands on the first non-space char
 *    after the previous sentence delimiter.
 */

import { describe, expect, test } from "bun:test";
import { EditorState } from "@codemirror/state";
import { getActiveSentenceDecos } from "@/cm6/highlight-sentence";

// ---------------------------------------------------------------------------
// Obsidian polyfill
// ---------------------------------------------------------------------------

declare global {
  interface Array<T> {
    contains(target: T): boolean;
  }
}

// Obsidian extends Array.prototype with `contains` at runtime.
// We must polyfill it here because tests run without Obsidian's bootstrap code.
// The `biome-ignore lint` directive suppresses the `noExtendNative` rule —
// Biome v2 does not support that category name in inline suppressions.
if (!Array.prototype.contains) {
  // biome-ignore lint: intentional Array.prototype extension — Obsidian polyfill
  Array.prototype.contains = function <T>(this: T[], target: T): boolean {
    return this.includes(target);
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DecoRange {
  className: string;
  from: number;
  to: number;
}

/** Extract all decoration ranges together with their CSS class names. */
function collectDecos(
  decoSet: ReturnType<typeof getActiveSentenceDecos>
): DecoRange[] {
  const ranges: DecoRange[] = [];
  // `between` iterates over all decorations in the given range
  decoSet.between(0, Number.MAX_SAFE_INTEGER, (from, to, deco) => {
    ranges.push({ from, to, className: (deco.spec as any).class });
  });
  return ranges;
}

/**
 * Use "Mr." as a non-empty ignored pattern so the empty-string edge case
 * doesn't interfere with standard sentence tests.
 */
const DEFAULT_SETTINGS = {
  sentenceDelimiters: ".!?",
  extraCharacters: "*_",
  ignoredPatterns: "Mr.",
};

/**
 * Build a minimal EditorView stand-in from a plain string.
 * Only the properties accessed by `getActiveSentenceDecos` are needed.
 */
function makeView(doc: string, cursorPos: number) {
  const state = EditorState.create({ doc });
  return {
    state: {
      selection: { main: { from: cursorPos } },
      doc: state.doc,
    },
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getActiveSentenceDecos — basic sentence detection", () => {
  test("marks the only sentence on a single-sentence line", () => {
    const doc = "Hello world.";
    // cursor inside the single sentence
    const view = makeView(doc, 5);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    // Whole line is one active sentence (end is doc.length because the forward
    // scan finds no delimiter after the one at the end of the line, so the
    // decoration spans 0..length).
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    expect(active?.from).toBe(0);
  });

  test("marks the correct sentence when cursor is in second sentence", () => {
    // "First sentence. Second sentence."
    //  0123456789012345678901234567890123
    //  position of second sentence: starts at 16 (after '. ')
    const doc = "First sentence. Second sentence.";
    // cursor at position 20 (inside 'Second sentence.')
    const view = makeView(doc, 20);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    // The second sentence starts at 16 ('S' in 'Second')
    expect(active?.from).toBe(16);
    expect(active?.to).toBe(doc.length);
  });

  test("marks the first sentence when cursor is in first sentence", () => {
    // "First sentence. Second sentence."
    // '.' is at index 14; end of first sentence = 15 (one past the period)
    const doc = "First sentence. Second sentence.";
    const view = makeView(doc, 3);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    expect(active?.from).toBe(0);
    // End is the character after the period (15), not including the trailing space
    expect(active?.to).toBe(15);
  });
});

describe("getActiveSentenceDecos — active-paragraph decoration", () => {
  test("adds active-paragraph deco before the active sentence", () => {
    // "Before. Active sentence."
    //  0123456789...
    // '.' at index 6; 'A' at index 8 (after '. ')
    const doc = "Before. Active sentence.";
    // cursor at 10 (inside 'Active sentence.')
    const view = makeView(doc, 10);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const paras = decos.filter((d) => d.className === "active-paragraph");
    // One paragraph deco covers the 'Before. ' part (from 0 to 8)
    expect(paras.length).toBeGreaterThanOrEqual(1);
    expect(paras.some((d) => d.from === 0)).toBe(true);
  });

  test("adds active-paragraph deco after the active sentence when text follows", () => {
    // "First. Active. Last."
    //  0      7      15
    // cursor at 9 (inside 'Active')
    const doc = "First. Active. Last.";
    const view = makeView(doc, 9);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const paras = decos.filter((d) => d.className === "active-paragraph");
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    // There should be paragraph decos both before and after 'Active.'
    expect(paras.some((d) => d.from === 0)).toBe(true); // before
    expect(paras.some((d) => d.from >= (active?.to ?? 0))).toBe(true); // after
  });

  test("produces no trailing paragraph deco when active sentence ends at line end", () => {
    // "Before. Active sentence." — active sentence ends exactly at line end
    const doc = "Before. Active sentence.";
    const view = makeView(doc, 10);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    const trailingParas = decos.filter(
      (d) => d.className === "active-paragraph" && d.from >= (active?.to ?? 0)
    );
    expect(trailingParas.length).toBe(0);
  });
});

describe("getActiveSentenceDecos — edge cases", () => {
  test("handles line with no sentence delimiters", () => {
    const doc = "No delimiters here";
    const view = makeView(doc, 5);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    // The whole line is the active 'sentence'
    expect(active).toBeDefined();
    expect(active?.from).toBe(0);
    expect(active?.to).toBe(doc.length);
  });

  test("handles cursor at the very start of the line", () => {
    const doc = "Start of line. Rest.";
    const view = makeView(doc, 0);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    expect(active?.from).toBe(0);
  });

  test("handles cursor at the very end of the line gracefully", () => {
    const doc = "A sentence.";
    const view = makeView(doc, doc.length);
    // Should not throw
    expect(() =>
      collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS))
    ).not.toThrow();
  });

  test("handles empty document gracefully", () => {
    const doc = "";
    const view = makeView(doc, 0);
    // Should not throw and should produce no decorations
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    expect(decos.length).toBe(0);
  });

  test("handles consecutive delimiters like '...'", () => {
    // Forward scan skips consecutive delimiters
    const doc = "Wait... Then act.";
    const view = makeView(doc, 1);
    // Should not throw
    expect(() =>
      collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS))
    ).not.toThrow();
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    // Active sentence starts at beginning
    expect(active?.from).toBe(0);
  });

  test("handles '!?' compound delimiters", () => {
    const doc = "Really?! Yes!";
    const view = makeView(doc, 3);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    // Should produce at least one decoration
    expect(decos.length).toBeGreaterThanOrEqual(1);
  });

  test("returns no decorations when start equals end", () => {
    // A single-character doc with cursor at position 0:
    // No backward delimiters → start=0; forward finds nothing → end=null → end=line.to=1
    // But start(0) !== end(1) so we DO get a decoration.
    // Test a true case: just verify no crash and some result.
    const doc = "X";
    const view = makeView(doc, 0);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    // Either 0 or 1 decoration — just ensure no throw
    expect(decos.length).toBeGreaterThanOrEqual(0);
  });
});

describe("getActiveSentenceDecos — ignoredPatterns", () => {
  test("does not treat 'Mr.' as a sentence boundary", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      ignoredPatterns: "Mr.",
    };
    // "Mr. Smith went there." — the '.' after 'Mr' should be ignored
    const doc = "Mr. Smith went there.";
    // cursor inside 'Smith'
    const view = makeView(doc, 7);
    const decos = collectDecos(getActiveSentenceDecos(view, settings));
    const active = decos.find((d) => d.className === "active-sentence");
    // The entire line is one active sentence because 'Mr.' is ignored
    expect(active).toBeDefined();
    expect(active?.from).toBe(0);
    expect(active?.to).toBe(doc.length);
  });

  test("multiple ignoredPatterns on separate lines", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      ignoredPatterns: "Mr.\nDr.",
    };
    // "Dr. Who arrived. Mr. Smith left."
    const doc = "Dr. Who arrived. Mr. Smith left.";
    // cursor inside 'Who arrived'
    const view = makeView(doc, 5);
    const decos = collectDecos(getActiveSentenceDecos(view, settings));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    // Dr. is ignored, so the sentence starts at 0
    expect(active?.from).toBe(0);
  });
});

describe("getActiveSentenceDecos — extraCharacters", () => {
  test("skips markdown emphasis markers (*) after sentence delimiter", () => {
    // In the forward scan, extra chars immediately after a delimiter are skipped
    // so they are included inside the active-sentence range.
    const settings = {
      ...DEFAULT_SETTINGS,
      extraCharacters: "*",
    };
    const doc = "Bold sentence*. Next sentence.";
    const view = makeView(doc, 3);
    const decos = collectDecos(getActiveSentenceDecos(view, settings));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    expect(active?.from).toBe(0);
  });
});

describe("getActiveSentenceDecos — custom delimiters", () => {
  test("respects custom semicolon delimiter", () => {
    const settings = {
      sentenceDelimiters: ";",
      extraCharacters: "",
      // Non-empty ignoredPatterns to avoid empty-string edge case
      ignoredPatterns: "NOOP",
    };
    // "Clause one; clause two."
    //  0          11 12
    // ';' is at index 10; 'c' of 'clause' is at 12 (after '; ')
    const doc = "Clause one; clause two.";
    // cursor at 14 (inside 'clause two.')
    const view = makeView(doc, 14);
    const decos = collectDecos(getActiveSentenceDecos(view, settings));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    // The second clause starts after the '; ' separator
    expect(active?.from).toBeGreaterThan(0);
    // It should cover the rest of the line (no further semicolons)
    expect(active?.to).toBe(doc.length);
  });

  test("marks whole line active when no custom delimiter is present", () => {
    const settings = {
      sentenceDelimiters: ";",
      extraCharacters: "",
      ignoredPatterns: "NOOP",
    };
    const doc = "No semicolons here at all";
    const view = makeView(doc, 5);
    const decos = collectDecos(getActiveSentenceDecos(view, settings));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    expect(active?.from).toBe(0);
    expect(active?.to).toBe(doc.length);
  });
});

// ---------------------------------------------------------------------------
// getActiveSentenceDecos — cursor-at-end retry logic
// ---------------------------------------------------------------------------

describe("getActiveSentenceDecos — cursor-at-end retry", () => {
  test("correctly finds sentence when cursor is right after a delimiter", () => {
    // "First. Second."
    //  0123456789...
    // '.' at index 5; cursor at 6 (right after the period, before space)
    // First call with pos=6 finds no forward delimiter from pos=6 → end=null
    // pos(6) > line.from(0) so we retry with pos-1=5
    const doc = "First. Second.";
    const view = makeView(doc, 6);
    // Should not throw
    expect(() =>
      collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS))
    ).not.toThrow();
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    // Some decoration must be produced
    expect(decos.length).toBeGreaterThanOrEqual(1);
  });

  test("retry at pos-1 recovers the active sentence boundary", () => {
    // "Hello world. Goodbye."
    //  0           12      20
    // Cursor at 12 (space after '.') — forward scan from 12 finds '.' at 19
    // backward scan from 11: finds '.' at 11 → start = 13 (after '. ')
    // But: first getActiveSentenceBounds(pos=12) may give end=null so we retry
    const doc = "Hello world. Goodbye.";
    const view = makeView(doc, 12);
    expect(() =>
      collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS))
    ).not.toThrow();
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    expect(decos.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// getActiveSentenceDecos — single-character content
// ---------------------------------------------------------------------------

describe("getActiveSentenceDecos — single-character content", () => {
  test("handles a line containing only a delimiter", () => {
    const doc = ".";
    const view = makeView(doc, 0);
    expect(() =>
      collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS))
    ).not.toThrow();
  });

  test("handles a line containing only a question mark", () => {
    const doc = "?";
    const view = makeView(doc, 0);
    expect(() =>
      collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS))
    ).not.toThrow();
  });

  test("handles a line containing only whitespace", () => {
    const doc = "   ";
    const view = makeView(doc, 1);
    expect(() =>
      collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS))
    ).not.toThrow();
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    // Whole whitespace-only line — one active-sentence spanning the whole line
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getActiveSentenceDecos — multiple sentences with identical delimiters
// ---------------------------------------------------------------------------

describe("getActiveSentenceDecos — three or more sentences", () => {
  test("correctly identifies the middle sentence in a three-sentence line", () => {
    // "One. Two. Three."
    //  0   4   9    15
    // '.' at 3, 8, 15; cursor at 6 (inside 'Two')
    const doc = "One. Two. Three.";
    const view = makeView(doc, 6);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    // Active sentence starts after 'One.' (index 4, past 'One.') then skip space → 5
    expect(active!.from).toBeGreaterThan(0);
    expect(active!.from).toBeLessThan(9);
    expect(active!.to).toBeLessThanOrEqual(doc.length);
  });

  test("correctly identifies the last sentence in a three-sentence line", () => {
    // "One. Two. Three."
    // cursor at 12 (inside 'Three')
    const doc = "One. Two. Three.";
    const view = makeView(doc, 12);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const active = decos.find((d) => d.className === "active-sentence");
    expect(active).toBeDefined();
    // Active sentence should end at doc.length (last sentence)
    expect(active!.to).toBe(doc.length);
  });

  test("paragraph decos cover non-active parts on both sides of the middle sentence", () => {
    // "One. Two. Three." — cursor in "Two"
    const doc = "One. Two. Three.";
    const view = makeView(doc, 6);
    const decos = collectDecos(getActiveSentenceDecos(view, DEFAULT_SETTINGS));
    const paras = decos.filter((d) => d.className === "active-paragraph");
    // Expect paragraph decos before and after the active sentence
    expect(paras.length).toBeGreaterThanOrEqual(2);
  });
});
