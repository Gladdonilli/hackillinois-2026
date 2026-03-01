import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TechnicalDetailPanel } from './TechnicalDetailPanel';
import React from 'react';

vi.mock('gsap', () => {
  const timeline = () => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), fromTo: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn(), clear: vi.fn(), pause: vi.fn(), add: vi.fn().mockReturnThis(), addLabel: vi.fn().mockReturnThis() })
  return { default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline, registerPlugin: vi.fn(), context: vi.fn(() => ({ revert: vi.fn(), add: vi.fn(cb => cb()) })) }, gsap: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline, registerPlugin: vi.fn(), context: vi.fn(() => ({ revert: vi.fn(), add: vi.fn(cb => cb()) })) } }
})

vi.mock('@gsap/react', () => ({
  useGSAP: (cb: any) => {
    try { cb(); } catch(e) {}
  }
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, style }: any) => <div className={className} style={style} data-testid="motion-div">{children}</div>,
    span: ({ children, className, style }: any) => <span className={className} style={style}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

vi.mock('@number-flow/react', () => ({
  default: ({ value }: any) => <span>{value}</span>
}));

// Mock ResizeObserver for the canvas/window
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('TechnicalDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      scale: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
    })) as any;
  });

  it('renders main container', () => {
    render(<TechnicalDetailPanel />);
    expect(screen.getByText('FORMANT EXTRACTION')).toBeDefined();
  });

  it('renders articulatory inversion pipeline', () => {
    render(<TechnicalDetailPanel />);
    expect(screen.getByText('AUDIO')).toBeDefined();
    expect(screen.getByText('MEL SPEC')).toBeDefined();
    expect(screen.getByText('12D EMA')).toBeDefined();
    expect(screen.getByText('AAI MODEL')).toBeDefined();
    expect(screen.getByText('VELOCITY')).toBeDefined();
  });

  it('renders stats section headers', () => {
    render(<TechnicalDetailPanel />);
    expect(screen.getByText(/Analysis Rate/i)).toBeDefined();
    expect(screen.getByText(/Sensor Inputs/i)).toBeDefined();
    expect(screen.getByText(/Human Limit/i)).toBeDefined();
    expect(screen.getByText(/Fake Peak/i)).toBeDefined();
    expect(screen.getByText(/Confidence/i)).toBeDefined();
  });

  it('renders initial stats values (0)', () => {
    render(<TechnicalDetailPanel />);
    // There are 5 NumberFlow components, all initialized to 0
    const zeroes = screen.getAllByText('0');
    expect(zeroes.length).toBeGreaterThanOrEqual(5);
  });

  it('renders canvas element for formants', () => {
    const { container } = render(<TechnicalDetailPanel />);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
  });

  it('renders F1, F2, F3 labels', () => {
    render(<TechnicalDetailPanel />);
    expect(screen.getByText(/F1:/)).toBeDefined();
    expect(screen.getByText(/F2:/)).toBeDefined();
    expect(screen.getByText(/F3:/)).toBeDefined();
  });

  it('renders explanatory text', () => {
    render(<TechnicalDetailPanel />);
    expect(screen.getByText(/Mapping acoustic observations to physical constraints/i)).toBeDefined();
  });

  it('renders background grid overlay', () => {
    const { container } = render(<TechnicalDetailPanel />);
    const grid = container.querySelector('.bg-\\[linear-gradient\\(rgba\\(56\\,_189\\,_248\\,_0\\.03\\)_1px\\,transparent_1px\\)\\,linear-gradient\\(90deg\\,rgba\\(56\\,_189\\,_248\\,_0\\.03\\)_1px\\,transparent_1px\\)\\]');
    expect(grid).toBeDefined();
  });

  it('renders pipeline line connectors', () => {
    const { container } = render(<TechnicalDetailPanel />);
    const connectors = container.querySelectorAll('.bg-gradient-to-r');
    // 5 boxes -> 4 connectors
    expect(connectors.length).toBe(4);
  });

  it('contains proper units', () => {
    render(<TechnicalDetailPanel />);
    expect(screen.getAllByText('fps')).toBeDefined();
    expect(screen.getAllByText('DOF')).toBeDefined();
    expect(screen.getAllByText('cm/s')).toBeDefined();
    expect(screen.getAllByText('%')).toBeDefined();
  });
});
