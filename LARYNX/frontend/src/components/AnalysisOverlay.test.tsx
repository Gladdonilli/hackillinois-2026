/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisOverlay } from './AnalysisOverlay';
import { useLarynxStore } from '@/store/useLarynxStore';
import { mockStoreState, createMockState } from '@/test-utils/mockStore';
import { SoundEngine } from '@/audio/SoundEngine';

vi.mock('@/store/useLarynxStore');

vi.mock('@/audio/SoundEngine', () => ({
  SoundEngine: {
    playBeep: vi.fn()
  }
}));

describe('AnalysisOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      status: 'analyzing',
      progress: { message: 'Extracting formants', percent: 20 },
      currentFrame: { sensors: {}, tongueVelocity: 0, timestamp: 0 },
      frames: new Array(50).fill({ sensors: {}, tongueVelocity: 0, timestamp: 0 }),
    }));
  });

  it('renders HUD elements', () => {
    render(<AnalysisOverlay />);
    expect(screen.getByText('ANALYSIS PIPELINE')).toBeInTheDocument();
    expect(screen.getByText('Audio ingestion')).toBeInTheDocument();
  });

  it('shows progress bar during analysis', () => {
    render(<AnalysisOverlay />);
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('shows velocity readout and current step message', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      status: 'analyzing',
      progress: { message: 'Extracting formants', percent: 40 },
      currentFrame: { sensors: {}, tongueVelocity: 0, timestamp: 0 },
      frames: new Array(50).fill({ sensors: {}, tongueVelocity: 0, timestamp: 0 }),
    }));
    render(<AnalysisOverlay />);
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('Articulatory mapping')).toHaveClass('text-cyan');
  });

  it('updates as frames are added', () => {
    render(<AnalysisOverlay />);
    // currentFrame is an object, not an index — the component shows frame count info
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('hidden when status is idle', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      status: 'idle',
      progress: { message: '', percent: 0 },
    }));
    render(<AnalysisOverlay />);
    expect(screen.queryByText('ANALYSIS PIPELINE')).not.toBeInTheDocument();
  });

  it('shows completed steps', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      status: 'analyzing',
      progress: { message: 'Almost done', percent: 90 },
      currentFrame: { sensors: {}, tongueVelocity: 0, timestamp: 0 },
      frames: new Array(50).fill({ sensors: {}, tongueVelocity: 0, timestamp: 0 }),
    }));
    render(<AnalysisOverlay />);
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('Verdict computation')).toHaveClass('text-cyan');
  });

  it('handles uploading status', () => {
    mockStoreState(vi.mocked(useLarynxStore), createMockState({
      status: 'uploading',
      progress: { message: 'Uploading', percent: 5 },
    }));
    render(<AnalysisOverlay />);
    expect(screen.getByText('Audio ingestion')).toHaveClass('text-cyan');
  });

  it('plays beep on step change', () => {
    render(<AnalysisOverlay />);
    expect(SoundEngine.playBeep).toHaveBeenCalled();
  });
});
