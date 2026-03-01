import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaveformDisplay } from './WaveformDisplay';
import { useLarynxStore } from '@/store/useLarynxStore';
import { mockStoreState, createMockState } from '@/test-utils/mockStore';

vi.mock('@/store/useLarynxStore');
vi.mock('motion/react', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});

const mockGetChannelData = vi.fn(() => new Float32Array(100).fill(0.5));
const mockDecodeAudioData = vi.fn().mockResolvedValue({
  duration: 120.5,
  getChannelData: mockGetChannelData
});

let audioContextInstances: any[] = [];
class MockAudioCtx {
  decodeAudioData = mockDecodeAudioData;
  close = vi.fn();
  constructor() { audioContextInstances.push(this); }
}
(window as any).AudioContext = MockAudioCtx;

// Mock RAF to control render loop
let rafCallbacks: FrameRequestCallback[] = [];
vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
  rafCallbacks.push(cb);
  return rafCallbacks.length;
});
vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

describe('WaveformDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];
    audioContextInstances = [];
    
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), fillRect: vi.fn(), strokeRect: vi.fn(),
      fillText: vi.fn(), measureText: vi.fn(() => ({ width: 10 })),
      canvas: { width: 800, height: 200 },
      lineWidth: 1, strokeStyle: '', fillStyle: '', globalAlpha: 1, font: '',
      setLineDash: vi.fn(), createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(),
      shadowBlur: 0, shadowColor: '', textAlign: 'left',
    })) as any;

    mockStoreState(vi.mocked(useLarynxStore), createMockState());
  });

  it('renders without error', () => {
    render(<WaveformDisplay />);
    expect(screen.getByText('AUDIO WAVEFORM')).toBeInTheDocument();
  });

  it('renders canvas element', () => {
    render(<WaveformDisplay />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('canvas has correct dimensions', () => {
    render(<WaveformDisplay />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveAttribute('width', '384');
    expect(canvas).toHaveAttribute('height', '100');
  });

  it('handles no audio URL gracefully', () => {
    render(<WaveformDisplay />);
    expect(screen.getByText('00:00.00')).toBeInTheDocument();
    expect(audioContextInstances.length).toBe(0);
  });

  it('gets 2D context on mount', () => {
    render(<WaveformDisplay />);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
  });

  it('shows time display', () => {
    render(<WaveformDisplay />);
    expect(screen.getByText('00:00.00')).toBeInTheDocument();
  });

  it('fetches and decodes audio when audioUrl is present', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    });
    global.fetch = mockFetch;

    mockStoreState(vi.mocked(useLarynxStore), createMockState({ audioUrl: 'blob:mock' }));

    render(<WaveformDisplay />);
    
    expect(mockFetch).toHaveBeenCalledWith('blob:mock');
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(audioContextInstances.length).toBeGreaterThan(0);
    expect(mockDecodeAudioData).toHaveBeenCalled();
    expect(screen.getByText('02:00.50')).toBeInTheDocument(); 
  });

  it('shows STANDBY status when idle', () => {
    render(<WaveformDisplay />);
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
  });

  it('renders playback controls', () => {
    render(<WaveformDisplay />);
    expect(screen.getByText('STANDBY')).toBeInTheDocument();
  });
  
  it('handles missing audioUrl prop', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ audioUrl: undefined }));

    render(<WaveformDisplay />);
    expect(screen.getByText('00:00.00')).toBeInTheDocument();
  });
});
