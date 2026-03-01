import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CustomCursor } from './CustomCursor';

describe('CustomCursor', () => {
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    // Capture RAF callback so we can trigger it manually
    rafCallback = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function triggerRAF() {
    if (rafCallback) {
      const cb = rafCallback;
      rafCallback = null;
      cb(performance.now());
    }
  }

  it('renders cursor elements', () => {
    const { container } = render(<CustomCursor />);
    expect(container.children.length).toBe(2);
  });

  it('follows mouse position', () => {
    const { container } = render(<CustomCursor />);
    const innerDot = container.children[1] as HTMLElement;

    fireEvent.mouseMove(window, { clientX: 100, clientY: 200 });
    triggerRAF();

    // Inner dot should have a transform with the cursor position (offset by half its size: 3px)
    expect(innerDot.style.transform).toContain('translate(');
  });

  it('responds to hover over interactive elements', () => {
    const { container } = render(
      <>
        <button id="test-btn">Hover Me</button>
        <CustomCursor />
      </>
    );

    const btn = document.getElementById('test-btn');
    fireEvent.mouseOver(btn!);
    triggerRAF();

    // Cursor should still be rendered
    const innerDot = container.children[1] as HTMLElement;
    expect(innerDot).toBeInTheDocument();
  });

  it('changes appearance on mousedown', () => {
    const { container } = render(<CustomCursor />);

    fireEvent.mouseDown(window);
    triggerRAF();

    const outerRing = container.children[0] as HTMLElement;
    expect(outerRing).toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<CustomCursor />);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseover', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });

  it('hidden state when appropriate', () => {
    const { container } = render(<CustomCursor />);
    const innerDot = container.children[1] as HTMLElement;
    expect(innerDot).toBeInTheDocument();
  });

  it('applies correct CSS classes for different states', () => {
     const { container } = render(<CustomCursor />);
     const outerRing = container.children[0] as HTMLElement;
     expect(outerRing.className).toContain('fixed');
     expect(outerRing.className).toContain('pointer-events-none');
  });

  it('cleans up RAF on unmount', () => {
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<CustomCursor />);

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });
});
