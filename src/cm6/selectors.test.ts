/**
 * Tests for selectors.ts
 *
 * `getEditorDom`, `getScrollDom`, and `getSizerDom` each delegate to
 * `view.dom.ownerDocument.querySelector` with a specific CSS selector string.
 * We mock the view object so we can capture the selector and control the return
 * value without touching real DOM or Obsidian APIs.
 */

import { describe, expect, test } from "bun:test";
import { getEditorDom, getScrollDom, getSizerDom } from "@/cm6/selectors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal EditorView-like object whose `querySelector` records every
 * call and returns `returnValue`.
 */
function makeView(returnValue: HTMLElement | null = null) {
  const calls: string[] = [];
  const view = {
    dom: {
      ownerDocument: {
        querySelector: (selector: string) => {
          calls.push(selector);
          return returnValue;
        },
      },
    },
    _calls: calls,
  } as any;
  return view;
}

// Expected exact selector strings — kept in sync with src/cm6/selectors.ts.
// Pinning the full string (rather than using `toContain`) ensures the test
// fails if either comma-separated clause is dropped, reordered, or malformed.
const EXPECTED_EDITOR_SELECTOR =
  ".workspace-leaf.mod-active .cm-editor, .mod-inside-iframe .cm-editor";
const EXPECTED_SCROLL_SELECTOR =
  ".workspace-leaf.mod-active .cm-scroller, .mod-inside-iframe .cm-scroller";
const EXPECTED_SIZER_SELECTOR =
  ".workspace-leaf.mod-active .cm-sizer, .mod-inside-iframe .cm-sizer";

// ---------------------------------------------------------------------------
// getEditorDom
// ---------------------------------------------------------------------------

describe("getEditorDom", () => {
  test("queries with the exact active+iframe cm-editor selector", () => {
    const view = makeView();
    getEditorDom(view);
    expect(view._calls.length).toBe(1);
    expect(view._calls[0]).toBe(EXPECTED_EDITOR_SELECTOR);
  });

  test("returns the element found by querySelector", () => {
    const fakeEl = { id: "editor" } as unknown as HTMLElement;
    const view = makeView(fakeEl);
    expect(getEditorDom(view)).toBe(fakeEl);
  });

  test("returns null when querySelector returns null", () => {
    const view = makeView(null);
    expect(getEditorDom(view)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getScrollDom
// ---------------------------------------------------------------------------

describe("getScrollDom", () => {
  test("queries with the exact active+iframe cm-scroller selector", () => {
    const view = makeView();
    getScrollDom(view);
    expect(view._calls.length).toBe(1);
    expect(view._calls[0]).toBe(EXPECTED_SCROLL_SELECTOR);
  });

  test("returns the element found by querySelector", () => {
    const fakeEl = { id: "scroller" } as unknown as HTMLElement;
    const view = makeView(fakeEl);
    expect(getScrollDom(view)).toBe(fakeEl);
  });

  test("returns null when querySelector returns null", () => {
    const view = makeView(null);
    expect(getScrollDom(view)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSizerDom
// ---------------------------------------------------------------------------

describe("getSizerDom", () => {
  test("queries with the exact active+iframe cm-sizer selector", () => {
    const view = makeView();
    getSizerDom(view);
    expect(view._calls.length).toBe(1);
    expect(view._calls[0]).toBe(EXPECTED_SIZER_SELECTOR);
  });

  test("returns the element found by querySelector", () => {
    const fakeEl = { id: "sizer" } as unknown as HTMLElement;
    const view = makeView(fakeEl);
    expect(getSizerDom(view)).toBe(fakeEl);
  });

  test("returns null when querySelector returns null", () => {
    const view = makeView(null);
    expect(getSizerDom(view)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Selector uniqueness
// ---------------------------------------------------------------------------

describe("selector uniqueness", () => {
  test("getEditorDom and getScrollDom use different selectors", () => {
    const editorView = makeView();
    const scrollView = makeView();
    getEditorDom(editorView);
    getScrollDom(scrollView);
    expect(editorView._calls[0]).not.toBe(scrollView._calls[0]);
  });

  test("getScrollDom and getSizerDom use different selectors", () => {
    const scrollView = makeView();
    const sizerView = makeView();
    getScrollDom(scrollView);
    getSizerDom(sizerView);
    expect(scrollView._calls[0]).not.toBe(sizerView._calls[0]);
  });

  test("getEditorDom and getSizerDom use different selectors", () => {
    const editorView = makeView();
    const sizerView = makeView();
    getEditorDom(editorView);
    getSizerDom(sizerView);
    expect(editorView._calls[0]).not.toBe(sizerView._calls[0]);
  });
});
