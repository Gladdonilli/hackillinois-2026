/** @vitest-environment jsdom */
process.env.NODE_ENV = 'test';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryPanel } from './HistoryPanel';
import { useLarynxStore } from '@/store/useLarynxStore';

vi.mock('@/store/useLarynxStore');

vi.mock('gsap', () => ({
  default: { to: vi.fn(), from: vi.fn(), timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn() })) },
  gsap: { to: vi.fn(), from: vi.fn(), timeline: vi.fn(() => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn() })) }
}));

vi.mock('@gsap/react', () => ({
  useGSAP: (cb: () => void) => {
    cb();
  }
}));

describe('HistoryPanel', () => {
  let mockFetchHistory: ReturnType<typeof vi.fn>;
  let mockToggleHistory: ReturnType<typeof vi.fn>;
  let mockSetVerdict: ReturnType<typeof vi.fn>;
  let mockSetStatus: ReturnType<typeof vi.fn>;
  let mockReset: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHistory = vi.fn();
    mockToggleHistory = vi.fn();
    mockSetVerdict = vi.fn();
    mockSetStatus = vi.fn();
    mockReset = vi.fn();
  });

  const setupMockStore = (overrides = {}) => {
    vi.mocked(useLarynxStore).mockReturnValue({
      showHistory: true,
      toggleHistory: mockToggleHistory,
      historyItems: [],
      historyLoading: false,
      fetchHistory: mockFetchHistory,
      setVerdict: mockSetVerdict,
      setStatus: mockSetStatus,
      reset: mockReset,
      ...overrides
    } as any);
  };

  it('renders nothing when showHistory is false', () => {
    setupMockStore({ showHistory: false });
    render(<HistoryPanel />);
    expect(screen.queryByText('ANALYSIS HISTORY')).not.toBeInTheDocument();
  });

  it('renders history panel when showHistory is true', () => {
    setupMockStore();
    render(<HistoryPanel />);
    expect(screen.getByText('ANALYSIS HISTORY')).toBeInTheDocument();
  });

  it('calls fetchHistory on mount if showHistory is true', () => {
    setupMockStore();
    render(<HistoryPanel />);
    expect(mockFetchHistory).toHaveBeenCalled();
  });

  it('renders loading skeleton when historyLoading is true', () => {
    setupMockStore({ historyLoading: true });
    const { container } = render(<HistoryPanel />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no history items', () => {
    setupMockStore({ historyItems: [] });
    render(<HistoryPanel />);
    expect(screen.getByText('No analyses yet. Upload audio to begin.')).toBeInTheDocument();
  });

  it('renders history items', () => {
    setupMockStore({
      historyItems: [
        {
          reportId: '123',
          createdAt: new Date().toISOString(),
          verdict: 'GENUINE',
          confidence: 0.95,
          peakVelocity: 10,
          threshold: 15,
          anomalousFrames: 0,
          totalFrames: 100,
          anomalyRatio: 0,
          processingTimeMs: 1000
        },
        {
          reportId: '456',
          createdAt: new Date().toISOString(),
          verdict: 'DEEPFAKE',
          confidence: 0.99,
          peakVelocity: 25,
          threshold: 15,
          anomalousFrames: 10,
          totalFrames: 100,
          anomalyRatio: 0.1,
          processingTimeMs: 1000
        }
      ]
    });
    render(<HistoryPanel />);
    expect(screen.getByText('GENUINE')).toBeInTheDocument();
    expect(screen.getByText('DEEPFAKE')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
    expect(screen.getByText('99.0%')).toBeInTheDocument();
  });

  it('handles item click to load report', () => {
    const item = {
      reportId: '123',
      createdAt: new Date().toISOString(),
      verdict: 'GENUINE',
      confidence: 0.95,
      peakVelocity: 10,
      threshold: 15,
      anomalousFrames: 0,
      totalFrames: 100,
      anomalyRatio: 0,
      processingTimeMs: 1000
    };
    setupMockStore({ historyItems: [item] });
    render(<HistoryPanel />);
    
    const record = screen.getByText('GENUINE').closest('div[data-interactive="true"]');
    if (record) {
      fireEvent.click(record);
    }
    
    expect(mockReset).toHaveBeenCalled();
    expect(mockSetVerdict).toHaveBeenCalledWith(expect.objectContaining({
      isGenuine: true,
      reportId: '123'
    }));
    expect(mockSetStatus).toHaveBeenCalledWith('complete');
    expect(mockToggleHistory).toHaveBeenCalled();
  });

  it('handles close button click', () => {
    setupMockStore();
    render(<HistoryPanel />);
    const closeBtn = screen.getByText('×');
    fireEvent.click(closeBtn);
    expect(mockToggleHistory).toHaveBeenCalled();
  });
  
  it('formats time correctly for recent items', () => {
    const now = new Date();
    const item = {
      reportId: '123',
      createdAt: new Date(now.getTime() - 30 * 1000).toISOString(),
      verdict: 'GENUINE',
      confidence: 0.95,
      peakVelocity: 10,
      threshold: 15,
      anomalousFrames: 0,
      totalFrames: 100,
      anomalyRatio: 0,
      processingTimeMs: 1000
    };
    setupMockStore({ historyItems: [item] });
    render(<HistoryPanel />);
    expect(screen.getByText('30s ago')).toBeInTheDocument();
  });

  it('formats time correctly for items hours ago', () => {
    const now = new Date();
    const item = {
      reportId: '123',
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      verdict: 'GENUINE',
      confidence: 0.95,
      peakVelocity: 10,
      threshold: 15,
      anomalousFrames: 0,
      totalFrames: 100,
      anomalyRatio: 0,
      processingTimeMs: 1000
    };
    setupMockStore({ historyItems: [item] });
    render(<HistoryPanel />);
    expect(screen.getByText('2h ago')).toBeInTheDocument();
  });
  
  it('formats time correctly for items days ago', () => {
    const now = new Date();
    const item = {
      reportId: '123',
      createdAt: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
      verdict: 'GENUINE',
      confidence: 0.95,
      peakVelocity: 10,
      threshold: 15,
      anomalousFrames: 0,
      totalFrames: 100,
      anomalyRatio: 0,
      processingTimeMs: 1000
    };
    setupMockStore({ historyItems: [item] });
    render(<HistoryPanel />);
    expect(screen.getByText('2d ago')).toBeInTheDocument();
  });
});
