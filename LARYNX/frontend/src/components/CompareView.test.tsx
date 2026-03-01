/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompareView } from './CompareView';
import { useLarynxStore } from '@/store/useLarynxStore';
import { mockStoreState, createMockState } from '@/test-utils/mockStore';

vi.mock('@/store/useLarynxStore');

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({ gl: {}, scene: {}, camera: {}, size: { width: 1920, height: 1080 } })),
  extend: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn(() => ({ scene: { clone: vi.fn(() => ({ traverse: vi.fn() })) } })),
  Environment: () => <div data-testid="drei-environment" />,
  Html: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  OrbitControls: () => null,
}));

vi.mock('gsap', () => {
  const tl = () => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), kill: vi.fn(), clear: vi.fn() });
  return { default: { to: vi.fn(), from: vi.fn(), timeline: tl, context: vi.fn(() => ({ revert: vi.fn(), add: vi.fn((cb: any) => cb()) })) } };
});

vi.mock('@/audio/SoundEngine', () => ({ SoundEngine: { init: vi.fn(), startTicking: vi.fn(), stopTicking: vi.fn(), updateVelocity: vi.fn() } }));

describe('CompareView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      comparison: {
        channelFrames: [[], []],
        channelVerdicts: [null, null],
        comparisonSummary: null,
      },
      status: 'idle',
      progress: { message: 'Initializing...', percent: 0 },
    }));
  });

  it('renders without error', () => {
    render(<CompareView />);
    expect(screen.getAllByText('HUMAN').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AI GENERATED').length).toBeGreaterThan(0);
  });

  it('shows dual-panel layout with File A and File B labels when has data', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      comparison: {
        channelFrames: [[{ tongueVelocity: 10 }] as any, [{ tongueVelocity: 20 }] as any],
        channelVerdicts: [null, null],
        comparisonSummary: null,
      },
      status: 'comparing',
      progress: { message: '', percent: 0 },
    }));
    render(<CompareView />);
    expect(screen.getByText('FILE A')).toBeInTheDocument();
    expect(screen.getByText('FILE B')).toBeInTheDocument();
  });

  it('shows verdict for each channel when available', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      comparison: {
        channelFrames: [[{ tongueVelocity: 10 }] as any, [{ tongueVelocity: 20 }] as any],
        channelVerdicts: [
          { isGenuine: true, confidence: 0.95 } as any,
          { isGenuine: false, confidence: 0.99 } as any,
        ],
        comparisonSummary: null,
      },
      status: 'comparing',
      progress: { message: '', percent: 0 },
    }));
    render(<CompareView />);
    expect(screen.getAllByText('GENUINE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DEEPFAKE').length).toBeGreaterThan(0);
    expect(screen.getByText('(95%)')).toBeInTheDocument();
    expect(screen.getByText('(99%)')).toBeInTheDocument();
  });

  it('renders comparison summary when complete', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      comparison: {
        channelFrames: [[], []],
        channelVerdicts: [null, null],
        comparisonSummary: 'Analysis Complete: Audio matches deepfake signature.',
      },
      status: 'idle',
      progress: { message: '', percent: 0 },
    }));
    render(<CompareView />);
    expect(screen.getByText('Analysis Complete: Audio matches deepfake signature.')).toBeInTheDocument();
  });

  it('shows progress for each channel during comparison', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      comparison: {
        channelFrames: [[], []],
        channelVerdicts: [null, null],
        comparisonSummary: null,
      },
      status: 'comparing',
      progress: { message: 'Processing files...', percent: 50 },
    }));
    render(<CompareView />);
    expect(screen.getByText('Processing files...')).toBeInTheDocument();
  });

  it('handles channelFrames correctly', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      comparison: {
        channelFrames: [[{ tongueVelocity: 100 }] as any, [{ tongueVelocity: 200 }] as any],
        channelVerdicts: [null, null],
        comparisonSummary: null,
      },
      status: 'comparing',
      progress: { message: '', percent: 0 },
    }));
    render(<CompareView />);
    expect(screen.getAllByTestId('r3f-canvas').length).toBe(2);
  });

  it('shows "no data" state when channels empty', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      comparison: {
        channelFrames: [[], []],
        channelVerdicts: [null, null],
        comparisonSummary: null,
      },
      status: 'idle',
      progress: { message: '', percent: 0 },
    }));
    render(<CompareView />);
    expect(screen.getByText('THE PHYSICS DON\'T LIE.')).toBeInTheDocument();
  });

  it('renders correctly', () => {
    const { container } = render(<CompareView />);
    expect(container).toBeDefined();
  });
});
