/** @vitest-environment jsdom */
process.env.NODE_ENV = 'test';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UploadPanel from './UploadPanel';
import { useLarynxStore } from '@/store/useLarynxStore';

vi.mock('@/store/useLarynxStore');

const mockStartStream = vi.fn();
const mockCancelStream = vi.fn();
vi.mock('@/hooks/useAnalysisStream', () => ({
  useAnalysisStream: () => ({ startStream: mockStartStream, cancelStream: mockCancelStream })
}));
vi.mock('@/hooks/useComparisonStream', () => ({
  useComparisonStream: () => ({ startComparison: vi.fn(), cancelComparison: vi.fn() })
}));
vi.mock('motion/react', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef((props: any, ref: any) => React.createElement('div', { ...props, ref })),
      span: React.forwardRef((props: any, ref: any) => React.createElement('span', { ...props, ref })),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  };
});
vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn() })) },
  gsap: { to: vi.fn(), from: vi.fn(), timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn() })) }
}));
vi.mock('lucide-react', () => ({
  AudioWaveform: () => React.createElement('span', null, 'waveform-icon'),
  AlertCircle: () => React.createElement('span', null, 'alert-icon'),
  X: () => React.createElement('span', null, 'x-icon'),
}));

vi.mock('@/hooks/useUIEarcons', () => ({
  useUIEarcons: () => ({
    playClick: vi.fn(),
    playSwoosh: vi.fn(),
    playDropHover: vi.fn(),
    playSuccess: vi.fn()
  })
}));

describe('UploadPanel', () => {
  let mockSetAudioFile: ReturnType<typeof vi.fn>;
  let mockSetPortalState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartStream.mockClear();
    mockSetAudioFile = vi.fn();
    mockSetPortalState = vi.fn();
    
    vi.mocked(useLarynxStore).mockImplementation((selector: unknown) => {
      const state = {
        audioFile: null,
        setAudioFile: mockSetAudioFile,
        setPortalState: mockSetPortalState,
        status: 'idle'
      };
      return (selector as Function)(state);
    });
    
    (window as unknown as { AudioContext: unknown }).AudioContext = class {
      decodeAudioData = vi.fn().mockResolvedValue({ duration: 120 });
      close = vi.fn();
    };
  });

  it('renders upload zone', () => {
    render(<UploadPanel />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it('shows drag-over visual state', () => {
    render(<UploadPanel />);
    const dropZone = document.querySelector('input[type="file"]')?.parentElement;
    expect(dropZone).toBeInTheDocument();
    
    if (dropZone) {
      fireEvent.dragOver(dropZone);
      expect(dropZone.className).toContain('bg-cyan/[0.03]');
      fireEvent.dragLeave(dropZone);
      expect(dropZone.className).not.toContain('bg-cyan/[0.03]');
    }
  });

  it('handles valid file change via input', async () => {
    render(<UploadPanel />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['dummy content'], 'test.wav', { type: 'audio/wav' });
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockSetAudioFile).toHaveBeenCalledWith(file);
    });
  });

  it('shows error for invalid file type', async () => {
    render(<UploadPanel />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/Invalid file format/i)).toBeInTheDocument();
    });
    expect(mockSetAudioFile).not.toHaveBeenCalled();
  });

  it('shows error for file size exceeding limit', async () => {
    render(<UploadPanel />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['dummy content'], 'test.wav', { type: 'audio/wav' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/File size exceeds 10MB limit/i)).toBeInTheDocument();
    });
  });

  it('triggers startStream after file is processed', async () => {
    render(<UploadPanel />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'test.wav', { type: 'audio/wav' });
    
    fireEvent.change(input, { target: { files: [file] } });
    
    // Verify file was set in store
    await waitFor(() => {
      expect(mockSetAudioFile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSetPortalState).toHaveBeenCalledWith('entering')
      expect(mockStartStream).toHaveBeenCalled()
    })
  });

  it('does not process when dragging file but no drop', () => {
    render(<UploadPanel />);
    const dropZone = document.querySelector('input[type="file"]')?.parentElement;
    if (dropZone) {
      fireEvent.dragOver(dropZone);
      expect(mockSetAudioFile).not.toHaveBeenCalled();
    }
  });

  it('clicks file input when dropzone is clicked', () => {
    render(<UploadPanel />);
    const dropZone = document.querySelector('input[type="file"]')?.parentElement;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');
    
    if (dropZone) {
      fireEvent.click(dropZone);
    }
    
    expect(clickSpy).toHaveBeenCalled();
  });
});
