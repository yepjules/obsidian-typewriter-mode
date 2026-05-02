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

// ---------------------------------------------------------------------------
// getEditorDom
// ---------------------------------------------------------------------------

describe("getEditorDom", () => {
  test("queries for the active workspace-leaf cm-editor element", () => {
    const view = makeView();
    getEditorDom(view);
    expect(view._calls.length).toBe(1);
    const selector = view._calls[0] as string;
    expect(selector).toContain(".cm-editor");
    expect(selector).toContain(".workspace-leaf.mod-active");
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

  test("also handles iframe-hosted editors via mod-inside-iframe selector", () => {
    const view = makeView();
    getEditorDom(view);
    const selector = view._calls[0] as string;
    expect(selector).toContain(".mod-inside-iframe");
  });
});

// ---------------------------------------------------------------------------
// getScrollDom
// ---------------------------------------------------------------------------

describe("getScrollDom", () => {
  test("queries for the active workspace-leaf cm-scroller element", () => {
    const view = makeView();
    getScrollDom(view);
    expect(view._calls.length).toBe(1);
    const selector = view._calls[0] as string;
    expect(selector).toContain(".cm-scroller");
    expect(selector).toContain(".workspace-leaf.mod-active");
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

  test("also handles iframe-hosted editors via mod-inside-iframe selector", () => {
    const view = makeView();
    getScrollDom(view);
    const selector = view._calls[0] as string;
    expect(selector).toContain(".mod-inside-iframe");
  });
});

// ---------------------------------------------------------------------------
// getSizerDom
// ---------------------------------------------------------------------------

describe("getSizerDom", () => {
  test("queries for the active workspace-leaf cm-sizer element", () => {
    const view = makeView();
    getSizerDom(view);
    expect(view._calls.length).toBe(1);
    const selector = view._calls[0] as string;
    expect(selector).toContain(".cm-sizer");
    expect(selector).toContain(".workspace-leaf.mod-active");
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

  test("also handles iframe-hosted editors via mod-inside-iframe selector", () => {
    const view = makeView();
    getSizerDom(view);
    const selector = view._calls[0] as string;
    expect(selector).toContain(".mod-inside-iframe");
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
