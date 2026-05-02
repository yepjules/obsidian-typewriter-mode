/**
 * Tests for TypewriterOffsetCalculator
 *
 * TypewriterOffsetCalculator computes the scroll offset needed to keep the
 * cursor line at the configured typewriter position. It depends on:
 *  - An EditorView whose DOM can be queried for `.cm-editor` / `.cm-scroller`
 *  - A TypewriterModeLib instance carrying the plugin settings
 *
 * Both are mocked here without importing Obsidian or mounting a real editor.
 */

import { describe, expect, test } from "bun:test";
import type { TypewriterModeSettings } from "@/capabilities/settings";
import { DEFAULT_SETTINGS } from "@/capabilities/settings";
import { TypewriterOffsetCalculator } from "@/cm6/typewriter-offset-calculator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockDomConfig {
  /** Line height CSS value returned for ".cm-active.cm-line" */
  activeLineHeight?: string;
  /** coordsAtPos result; null simulates no caret position available */
  caretCoords?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null;
  /** defaultLineHeight exposed on the EditorView */
  defaultLineHeight?: number;
  /** clientHeight of the .cm-editor element */
  editorClientHeight?: number;
  /** getBoundingClientRect().top of the .cm-editor element */
  editorRectTop?: number;
  /** Whether querySelector returns null (simulates missing elements) */
  missingEditor?: boolean;
  /** Whether the scroller element is missing */
  missingScroller?: boolean;
  /** scrollTop of the .cm-scroller element */
  scrollTop?: number;
}

function makeView(cfg: MockDomConfig = {}) {
  const {
    editorClientHeight = 600,
    editorRectTop = 100,
    scrollTop = 0,
    missingEditor = false,
    missingScroller = false,
    activeLineHeight = "20px",
    caretCoords = { top: 200, bottom: 220, left: 0, right: 0 },
    defaultLineHeight = 20,
  } = cfg;

  const editorDom = missingEditor
    ? null
    : {
        getBoundingClientRect: () => ({ top: editorRectTop }),
        clientHeight: editorClientHeight,
      };
  const scrollDom = missingScroller ? null : { scrollTop };

  return {
    contentDOM: {
      querySelector: () =>
        activeLineHeight
          ? {
              // Obsidian extends HTMLElement with `getCssPropertyValue`
              // (not a standard DOM API). The mock matches the extension.
              getCssPropertyValue: (_prop: string) => activeLineHeight,
            }
          : null,
    },
    dom: {
      ownerDocument: {
        querySelector: (selector: string) => {
          if (selector.includes("cm-editor")) {
            return editorDom;
          }
          if (selector.includes("cm-scroller")) {
            return scrollDom;
          }
          return null;
        },
      },
    },
    state: {
      selection: { main: { head: 0 } },
    },
    coordsAtPos: (_pos: number) => caretCoords,
    defaultLineHeight,
  } as any;
}

function makeSettings(
  overrides: Partial<TypewriterModeSettings> = {}
): TypewriterModeSettings {
  return {
    ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    ...overrides,
  };
}

function makeTm(settingOverrides: Partial<TypewriterModeSettings> = {}) {
  return { settings: makeSettings(settingOverrides) } as any;
}

// ---------------------------------------------------------------------------
// getTypewriterOffset
// ---------------------------------------------------------------------------

describe("getTypewriterOffset", () => {
  test("returns editorHeight * typewriterOffset (0.5 → centre)", () => {
    const view = makeView({ editorClientHeight: 600 });
    const tm = makeTm({
      typewriter: {
        ...DEFAULT_SETTINGS.typewriter,
        typewriterOffset: 0.5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getTypewriterOffset()).toBe(300);
  });

  test("returns 0 when editor DOM is missing", () => {
    const view = makeView({ missingEditor: true });
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getTypewriterOffset()).toBe(0);
  });

  test("reflects a custom typewriterOffset (0.25 → quarter screen)", () => {
    const view = makeView({ editorClientHeight: 800 });
    const tm = makeTm({
      typewriter: {
        ...DEFAULT_SETTINGS.typewriter,
        typewriterOffset: 0.25,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getTypewriterOffset()).toBe(200);
  });

  test("returns full height when typewriterOffset is 1.0", () => {
    const view = makeView({ editorClientHeight: 500 });
    const tm = makeTm({
      typewriter: {
        ...DEFAULT_SETTINGS.typewriter,
        typewriterOffset: 1.0,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getTypewriterOffset()).toBe(500);
  });

  test("returns 0 when typewriterOffset is 0.0", () => {
    const view = makeView({ editorClientHeight: 400 });
    const tm = makeTm({
      typewriter: {
        ...DEFAULT_SETTINGS.typewriter,
        typewriterOffset: 0.0,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getTypewriterOffset()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getActiveLineOffset
// ---------------------------------------------------------------------------

describe("getActiveLineOffset", () => {
  test("computes caret top minus editor container top", () => {
    // container top = 100, caret top = 250 → offset = 150
    const view = makeView({ editorRectTop: 100 });
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    const offset = calc.getActiveLineOffset({
      top: 250,
      bottom: 270,
      left: 0,
      right: 0,
    });
    expect(offset).toBe(150);
  });

  test("returns 0 when editor DOM is missing", () => {
    const view = makeView({ missingEditor: true });
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    const offset = calc.getActiveLineOffset({
      top: 200,
      bottom: 220,
      left: 0,
      right: 0,
    });
    expect(offset).toBe(0);
  });

  test("can return a negative offset when caret is above the editor container", () => {
    const view = makeView({ editorRectTop: 300 });
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    const offset = calc.getActiveLineOffset({
      top: 200,
      bottom: 220,
      left: 0,
      right: 0,
    });
    expect(offset).toBe(-100);
  });
});

// ---------------------------------------------------------------------------
// getActiveLineProp
// ---------------------------------------------------------------------------

describe("getActiveLineProp", () => {
  test("returns parsed numeric value from CSS property", () => {
    const view = makeView({ activeLineHeight: "20px" });
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getActiveLineProp("line-height")).toBe(20);
  });

  test("returns null when .cm-active.cm-line element is missing", () => {
    // Override contentDOM.querySelector to return null
    const view = {
      ...makeView(),
      contentDOM: { querySelector: () => null },
    };
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getActiveLineProp("line-height")).toBeNull();
  });

  test("returns null when CSS property value is empty", () => {
    const view = {
      ...makeView(),
      contentDOM: {
        querySelector: () => ({
          getCssPropertyValue: () => "",
        }),
      },
    };
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getActiveLineProp("line-height")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getTypewriterPositionData — null / missing cases
// ---------------------------------------------------------------------------

describe("getTypewriterPositionData — null / missing cases", () => {
  test("returns null when coordsAtPos returns null (no caret)", () => {
    const view = makeView({ caretCoords: null });
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getTypewriterPositionData()).toBeNull();
  });

  test("returns null when active line CSS property is missing", () => {
    const view = {
      ...makeView(),
      contentDOM: { querySelector: () => null },
    };
    const tm = makeTm();
    const calc = new TypewriterOffsetCalculator(tm, view);
    expect(calc.getTypewriterPositionData()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getTypewriterPositionData — typewriter scroll enabled
// ---------------------------------------------------------------------------

describe("getTypewriterPositionData — typewriter scroll", () => {
  test("scrollOffset equals typewriterOffset when typewriter scroll is on", () => {
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      scrollTop: 300,
      caretCoords: { top: 200, bottom: 220, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: true,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    // scrollOffset should equal typewriterOffset (600 * 0.5 = 300)
    expect(data?.scrollOffset).toBe(300);
    expect(data?.typewriterOffset).toBe(300);
  });

  test("scrollOffset is 0 when missing editor/scroller DOM", () => {
    const view = makeView({
      missingEditor: true,
      caretCoords: { top: 200, bottom: 220, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: true,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getTypewriterPositionData — "only maintain when reached" mode
// ---------------------------------------------------------------------------

describe("getTypewriterPositionData — only maintain typewriter offset when reached", () => {
  test("clamps scrollOffset when activeLineOffset is above typewriterOffset", () => {
    // activeLineOffset = caretTop - editorTop = 50 - 0 = 50
    // typewriterOffset = 600 * 0.5 = 300
    // scrollTop = 0 → scrollTop + activeLineOffset = 50 < typewriterOffset = 300
    // → scrollOffset = min(300, 50) = 50
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      scrollTop: 0,
      caretCoords: { top: 50, bottom: 70, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: true,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: true,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(50);
  });

  test("uses full typewriterOffset once offset is reached", () => {
    // activeLineOffset = 350 - 0 = 350
    // typewriterOffset = 600 * 0.5 = 300
    // scrollTop = 200 → scrollTop + activeLineOffset = 550 ≥ 300
    // → scrollOffset = typewriterOffset = 300
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      scrollTop: 200,
      caretCoords: { top: 350, bottom: 370, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: true,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: true,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(300);
  });

  test("scrollOffset is 0 when activeLineOffset is negative", () => {
    // activeLineOffset = caret(50) - editor(200) = -150 (caret above editor)
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 200,
      scrollTop: 0,
      caretCoords: { top: 50, bottom: 70, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: true,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: true,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getTypewriterPositionData — keep lines above and below
// ---------------------------------------------------------------------------

describe("getTypewriterPositionData — keep lines above and below", () => {
  test("clamps to lower bound when activeLineOffset is too small", () => {
    // linesAboveAndBelow=3, defaultLineHeight=20 → lowerBound = 60
    // activeLineOffset = caretTop(30) - editorTop(0) = 30 < lowerBound(60)
    // scrollTop ≠ 0 (100) → belowLowerBound = true → scrollOffset = lowerBound = 60
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      scrollTop: 100,
      caretCoords: { top: 30, bottom: 50, left: 0, right: 0 },
      activeLineHeight: "20px",
      defaultLineHeight: 20,
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: true,
        linesAboveAndBelow: 3,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(60);
  });

  test("clamps to upper bound when activeLineOffset is too large", () => {
    // linesAboveAndBelow=3, defaultLineHeight=20
    // lowerBound = 60
    // upperBound = 600 - 20*(3+1) = 600 - 80 = 520
    // activeLineOffset = caret(600) - editor(0) = 600 > upperBound(520)
    // → scrollOffset = upperBound = 520
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      scrollTop: 100,
      caretCoords: { top: 600, bottom: 620, left: 0, right: 0 },
      activeLineHeight: "20px",
      defaultLineHeight: 20,
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: true,
        linesAboveAndBelow: 3,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(520);
  });

  test("passes through activeLineOffset when within bounds", () => {
    // linesAboveAndBelow=3, defaultLineHeight=20
    // lowerBound = 60, upperBound = 520
    // activeLineOffset = 300 → within bounds → scrollOffset = 300
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      scrollTop: 100,
      caretCoords: { top: 300, bottom: 320, left: 0, right: 0 },
      activeLineHeight: "20px",
      defaultLineHeight: 20,
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: true,
        linesAboveAndBelow: 3,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(300);
  });

  test("does not clamp when scrollTop is 0 and offset is near top", () => {
    // When scrollTop===0, belowLowerBound is forced false to avoid over-clamping
    // at the very top of the document.
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      scrollTop: 0,
      caretCoords: { top: 10, bottom: 30, left: 0, right: 0 },
      activeLineHeight: "20px",
      defaultLineHeight: 20,
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: true,
        linesAboveAndBelow: 3,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    // scrollTop=0 → belowLowerBound=false; activeLineOffset=10 ≤ upperBound(520)
    // → scrollOffset = activeLineOffset = 10
    expect(data?.scrollOffset).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// getTypewriterPositionData — plain scroll (no typewriter, no keep-above)
// ---------------------------------------------------------------------------

describe("getTypewriterPositionData — plain scroll fallback", () => {
  test("scrollOffset equals activeLineOffset when no special mode is enabled", () => {
    // caretTop=250, editorTop=100 → activeLineOffset=150
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 100,
      scrollTop: 0,
      caretCoords: { top: 250, bottom: 270, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(150);
    expect(data?.activeLineOffset).toBe(150);
  });
});

// ---------------------------------------------------------------------------
// getTypewriterPositionData — line height vs caret height
// ---------------------------------------------------------------------------

describe("getTypewriterPositionData — line height computation", () => {
  test("uses caretHeight as lineHeight when caret is taller than line-height", () => {
    // caretHeight = 30, lineHeightProp = 20 → lineHeight=30, lineOffset=0
    const view = makeView({
      caretCoords: { top: 200, bottom: 230, left: 0, right: 0 }, // height=30
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.lineHeight).toBe(30);
    expect(data?.lineOffset).toBe(0);
  });

  test("uses lineHeightProp as lineHeight when it is larger than caret", () => {
    // caretHeight = 10, lineHeightProp = 20 → lineHeight=20, lineOffset=(20-10)/2=5
    const view = makeView({
      caretCoords: { top: 200, bottom: 210, left: 0, right: 0 }, // height=10
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.lineHeight).toBe(20);
    expect(data?.lineOffset).toBe(5);
  });

  test("returns correct typewriterOffset in position data", () => {
    const view = makeView({
      editorClientHeight: 800,
      caretCoords: { top: 200, bottom: 220, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.75,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.typewriterOffset).toBe(600); // 800 * 0.75
  });
});

// ---------------------------------------------------------------------------
// getTypewriterPositionData — scroller missing but editor present
// ---------------------------------------------------------------------------

describe("getTypewriterPositionData — scroller missing, editor present", () => {
  test("scrollOffset is 0 when scroller DOM is missing even with typewriter scroll", () => {
    // missingScroller=true, missingEditor=false → editorDom present, scrollDom null
    // !(editorDom && scrollDom) → true → scrollOffset = 0
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      missingScroller: true,
      caretCoords: { top: 200, bottom: 220, left: 0, right: 0 },
      activeLineHeight: "20px",
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: true,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: false,
        linesAboveAndBelow: 5,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(0);
  });

  test("scrollOffset is 0 when scroller DOM is missing with keepLinesAboveAndBelow", () => {
    const view = makeView({
      editorClientHeight: 600,
      editorRectTop: 0,
      missingScroller: true,
      caretCoords: { top: 300, bottom: 320, left: 0, right: 0 },
      activeLineHeight: "20px",
      defaultLineHeight: 20,
    });
    const tm = makeTm({
      typewriter: {
        isTypewriterScrollEnabled: false,
        isOnlyMaintainTypewriterOffsetWhenReachedEnabled: false,
        isTypewriterOnlyUseCommandsEnabled: false,
        typewriterOffset: 0.5,
      },
      keepLinesAboveAndBelow: {
        isKeepLinesAboveAndBelowEnabled: true,
        linesAboveAndBelow: 3,
      },
    });
    const calc = new TypewriterOffsetCalculator(tm, view);
    const data = calc.getTypewriterPositionData();
    expect(data).not.toBeNull();
    expect(data?.scrollOffset).toBe(0);
  });
});
