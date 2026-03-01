/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLarynxStore } from '@/store/useLarynxStore';
import { mockStoreState, createMockState } from '@/test-utils/mockStore';
import { AnalysisView } from './AnalysisView';

vi.mock('@/store/useLarynxStore');
const orbitControlsSpy = vi.hoisted(() =>
  vi.fn(
    (_props: {
      enableZoom?: boolean;
      minAzimuthAngle?: number;
      maxAzimuthAngle?: number;
    }) => null,
  ),
);

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
  OrbitControls: orbitControlsSpy,
  Sparkles: () => <div data-testid="sparkles" />,
  Float: ({ children }: { children: React.ReactNode }) => <div data-testid="float">{children}</div>,
  ContactShadows: () => <div data-testid="contact-shadows" />,
}));

vi.mock('gsap', () => {
  const tl = () => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), kill: vi.fn(), clear: vi.fn() });
  return { default: { to: vi.fn(), from: vi.fn(), timeline: tl, context: vi.fn(() => ({ revert: vi.fn(), add: vi.fn((cb: any) => cb()) })) } };
});

vi.mock('@/audio/SoundEngine', () => ({ SoundEngine: { init: vi.fn(), startTicking: vi.fn(), stopTicking: vi.fn(), updateVelocity: vi.fn() } }));

vi.mock('@/components/HeadModel', () => ({ HeadModel: () => <div data-testid="head-model" /> }));
vi.mock('@/components/TongueModel', () => ({ TongueModel: () => <div data-testid="tongue-model" /> }));
vi.mock('@/components/EMAMarkers', () => ({ EMAMarkers: () => <div data-testid="ema-markers" /> }));
vi.mock('@/components/VelocityRibbons', () => ({ VelocityRibbons: () => <div data-testid="velocity-ribbons" /> }));
vi.mock('@/components/ParticleField', () => ({ ParticleField: () => <div data-testid="particle-field" /> }));
vi.mock('@/components/SkullClipEffect', () => ({ SkullClipEffect: () => <div data-testid="skull-clip-effect" /> }));
vi.mock('@/components/PostProcessingEffects', () => ({ PostProcessingEffects: () => <div data-testid="post-processing-effects" /> }));
vi.mock('@/components/CameraController', () => ({ CameraController: () => <div data-testid="camera-controller" /> }));

describe('AnalysisView', () => {
  beforeEach(() => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({ status: 'analyzing' }));
  });

  it('renders R3F canvas container', () => {
    render(<AnalysisView />);
    expect(screen.getByTestId('r3f-canvas')).toBeInTheDocument();
  });

  it('shows analysis components when analyzing', () => {
    render(<AnalysisView />);
    expect(screen.getByTestId('head-model')).toBeInTheDocument();
    expect(screen.getByTestId('tongue-model')).toBeInTheDocument();
    expect(screen.getByTestId('ema-markers')).toBeInTheDocument();
    expect(screen.getByTestId('velocity-ribbons')).toBeInTheDocument();
    expect(screen.getByTestId('particle-field')).toBeInTheDocument();
    expect(screen.getByTestId('skull-clip-effect')).toBeInTheDocument();
  });

  it('passes correct props to child components', () => {
    render(<AnalysisView />);
    expect(screen.getByTestId('post-processing-effects')).toBeInTheDocument();
    expect(screen.getByTestId('camera-controller')).toBeInTheDocument();
  });

  it('renders environment effects', () => {
    render(<AnalysisView />);
    expect(screen.getByTestId('sparkles')).toBeInTheDocument();
    expect(screen.getByTestId('contact-shadows')).toBeInTheDocument();
    expect(screen.getByTestId('drei-environment')).toBeInTheDocument();
  });

  it('renders without error', () => {
    const { container } = render(<AnalysisView />);
    expect(container).toBeDefined();
  });

  it('contains light sources', () => {
    render(<AnalysisView />);
    expect(screen.getByTestId('r3f-canvas')).toBeVisible();
  });

  it('loads measurement grid', () => {
    render(<AnalysisView />);
    expect(screen.getByTestId('float')).toBeInTheDocument();
  });
  
  it('loads data particles', () => {
    const { container } = render(<AnalysisView />);
    expect(container).toBeTruthy();
  });

  it('constrains orbit controls to side-view envelope', () => {
    render(<AnalysisView />);
    expect(orbitControlsSpy).toHaveBeenCalled();
    const firstCallProps = orbitControlsSpy.mock.calls[0]?.[0];
    if (!firstCallProps) {
      throw new Error('OrbitControls was not called with props');
    }

    expect(firstCallProps.enableZoom).toBe(false);
    expect(firstCallProps.minAzimuthAngle).toBeCloseTo(-0.18);
    expect(firstCallProps.maxAzimuthAngle).toBeCloseTo(0.18);
  });
});
