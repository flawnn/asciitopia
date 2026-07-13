import type { AsciiPattern, PatternId } from '@asciitopia/core';
import { cleanup, render } from '@testing-library/react';
import { createRef, StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { AsciiBackground } from './ascii-background.js';

// jsdom has no canvas backend, no ResizeObserver, and no reliable rAF — the
// engine's whole environment is mocked; assertions run against stub patterns
// and the spies below.

// --- mocks ---

// measureText('M') → charW = 8; ascent 12 + descent 4 → charH = 16.
const createMockCtx = (): CanvasRenderingContext2D =>
  ({
    font: '',
    fillStyle: '',
    fillText: () => {},
    clearRect: () => {},
    measureText: () => ({ width: 8, fontBoundingBoxAscent: 12, fontBoundingBoxDescent: 4 }),
  }) as unknown as CanvasRenderingContext2D;

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  readonly unobserve = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }

  emit(width: number, height: number): void {
    const entry = { contentRect: { width, height } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
}

const createStubPattern = () => ({
  init: vi.fn<AsciiPattern['init']>(),
  update: vi.fn<AsciiPattern['update']>(),
  render: vi.fn<AsciiPattern['render']>(),
  dispose: vi.fn<() => void>(),
});

let getContextSpy: MockInstance;
let cancelFrameSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  MockResizeObserver.instances = [];
  cancelFrameSpy = vi.fn();
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', cancelFrameSpy);
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => createMockCtx());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// --- tests ---

describe('<AsciiBackground>', () => {
  it('mounts a canvas, adopts the pattern, and passes className/style through', () => {
    const stub = createStubPattern();
    const { container } = render(
      <AsciiBackground className="bg" pattern={stub} style={{ opacity: 0.5 }} />,
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.className).toBe('bg');
    expect(canvas?.style.opacity).toBe('0.5');
    expect(stub.init).toHaveBeenCalledTimes(1);
  });

  it('forwards the canvas ref', () => {
    const ref = createRef<HTMLCanvasElement>();
    render(<AsciiBackground pattern={createStubPattern()} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLCanvasElement);
  });

  it('resizes the engine from the observed canvas box, ignoring zero-size boxes', () => {
    const stub = createStubPattern();
    const { container } = render(<AsciiBackground pattern={stub} />);
    const canvas = container.querySelector('canvas');
    const observer = MockResizeObserver.instances.at(-1);
    if (!canvas || !observer) throw new Error('canvas/observer missing');
    expect(observer.observe).toHaveBeenCalledWith(canvas);

    observer.emit(800, 600);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    // grid = floor(800 / charW 8) × floor(600 / charH 16)
    expect(stub.init).toHaveBeenLastCalledWith(100, 37);

    const initCalls = stub.init.mock.calls.length;
    observer.emit(0, 0);
    expect(stub.init).toHaveBeenCalledTimes(initCalls);
  });

  it('destroys the engine on unmount, disposing the active pattern', () => {
    const stub = createStubPattern();
    const { unmount } = render(<AsciiBackground pattern={stub} />);
    const observer = MockResizeObserver.instances.at(-1);

    unmount();

    expect(stub.dispose).toHaveBeenCalledTimes(1);
    expect(cancelFrameSpy).toHaveBeenCalled();
    expect(observer?.disconnect).toHaveBeenCalledTimes(1);
  });

  it('swaps patterns via setPattern without recreating the engine', () => {
    const first = createStubPattern();
    const second = createStubPattern();
    const { rerender } = render(<AsciiBackground pattern={first} />);
    const engineCount = getContextSpy.mock.calls.length;

    rerender(<AsciiBackground pattern={second} />);

    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.init).toHaveBeenCalledTimes(1);
    expect(getContextSpy).toHaveBeenCalledTimes(engineCount);
  });

  it('recreates the engine when engineOptions identity changes, re-adopting the pattern', () => {
    const stub = createStubPattern();
    const { rerender } = render(
      <AsciiBackground engineOptions={{ fontSize: 16 }} pattern={stub} />,
    );
    expect(getContextSpy).toHaveBeenCalledTimes(1);

    rerender(<AsciiBackground engineOptions={{ fontSize: 20 }} pattern={stub} />);

    expect(getContextSpy).toHaveBeenCalledTimes(2);
    // dispose fired by the old engine's destroy(), init by the new engine's adoption.
    expect(stub.dispose).toHaveBeenCalledTimes(1);
    expect(stub.init).toHaveBeenCalledTimes(2);
  });

  it('is StrictMode double-mount safe', () => {
    const stub = createStubPattern();
    const { unmount } = render(
      <StrictMode>
        <AsciiBackground pattern={stub} />
      </StrictMode>,
    );

    // The throwaway first engine is destroyed before it ever adopts the pattern.
    expect(stub.init).toHaveBeenCalledTimes(1);

    unmount();
    expect(stub.dispose).toHaveBeenCalledTimes(1);
  });

  it('resolves registry id strings through the core registry', () => {
    const { container } = render(<AsciiBackground pattern="rain" />);

    expect(container.querySelector('canvas')).not.toBeNull();
  });

  it('warns once for unknown pattern ids and keeps the canvas alive', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bogus = 'not-a-pattern' as PatternId;
    const { container, rerender } = render(<AsciiBackground pattern={bogus} />);

    expect(container.querySelector('canvas')).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);

    // Fresh config identity forces re-resolution — the warning must not repeat.
    rerender(<AsciiBackground config={{}} pattern={bogus} />);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
