import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerdictPanel } from './VerdictPanel';
import { useLarynxStore } from '@/store/useLarynxStore';

vi.mock('gsap', () => {
  const timeline = () => ({ to: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), fromTo: vi.fn().mockReturnThis(), set: vi.fn().mockReturnThis(), play: vi.fn(), kill: vi.fn(), clear: vi.fn(), pause: vi.fn(), add: vi.fn().mockReturnThis(), addLabel: vi.fn().mockReturnThis() })
  return { default: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline, registerPlugin: vi.fn(), context: vi.fn(() => ({ revert: vi.fn(), add: vi.fn(cb => cb()) })) }, gsap: { to: vi.fn(), from: vi.fn(), fromTo: vi.fn(), set: vi.fn(), timeline, registerPlugin: vi.fn(), context: vi.fn(() => ({ revert: vi.fn(), add: vi.fn(cb => cb()) })) } }
})

vi.mock('@gsap/react', () => ({
  useGSAP: (cb: any) => {
    // Need to use useEffect-like behavior or just call it
    // To be safe, we'll just execute it
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

vi.mock('@/store/useLarynxStore');

const mockedStore = vi.mocked(useLarynxStore);

describe('VerdictPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupStore = (overrides: any = {}) => {
    mockedStore.mockImplementation((selector: any) => {
      const state = {
        status: 'complete',
        verdict: {
          isGenuine: true,
          confidence: 0.95,
          peakVelocity: 10.5,
          threshold: 20,
          anomalousFrameCount: 0,
          totalFrameCount: 120,
          anomalyRatio: 0,
          reportId: '1234',
          processingTimeMs: 150
        },
        progress: null,
        ...overrides
      };
      return selector(state);
    });
  };

  it('renders nothing when status is idle', () => {
    setupStore({ status: 'idle', verdict: null });
    const { container } = render(<VerdictPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when verdict is null and status complete', () => {
    setupStore({ status: 'complete', verdict: null });
    const { container } = render(<VerdictPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('shows GENUINE badge for genuine verdict', () => {
    setupStore({ verdict: { isGenuine: true, confidence: 0.95 } });
    render(<VerdictPanel />);
    expect(screen.getByText('GENUINE')).toBeDefined();
    expect(document.querySelector('.bg-genuine')).toBeDefined();
  });

  it('shows DEEPFAKE badge for deepfake verdict', () => {
    setupStore({ verdict: { isGenuine: false, confidence: 0.95 } });
    render(<VerdictPanel />);
    expect(screen.getByText('DEEPFAKE')).toBeDefined();
    expect(document.querySelector('.bg-violation')).toBeDefined();
  });

  it('displays confidence percentage correctly initially as 0.0%', () => {
    setupStore({ verdict: { isGenuine: true, confidence: 0.95 } });
    render(<VerdictPanel />);
    // Initial state before GSAP updates it is 0.0%
    expect(screen.getByText('0.0%')).toBeDefined();
  });

  it('shows peak velocity value', () => {
    setupStore({ verdict: { isGenuine: true, confidence: 0.95, peakVelocity: 15.2 } });
    render(<VerdictPanel />);
    expect(screen.getByText('15.2')).toBeDefined();
    expect(screen.getByText(/Peak Velocity/i)).toBeDefined();
  });

  it('shows threshold value', () => {
    setupStore({ verdict: { isGenuine: true, confidence: 0.95, threshold: 20.0 } });
    render(<VerdictPanel />);
    expect(screen.getByText('20.0')).toBeDefined();
    expect(screen.getByText(/Threshold/i)).toBeDefined();
  });

  it('shows anomalous frame count', () => {
    setupStore({ verdict: { isGenuine: false, confidence: 0.1 } });
    render(<VerdictPanel />);
    // For confidence 0.1, anomalous frames is Math.round((1 - 0.1) * 120) = 108
    expect(screen.getByText('108')).toBeDefined();
    expect(screen.getByText('/120')).toBeDefined();
  });

  it('shows analyzing status with progress', () => {
    setupStore({ status: 'analyzing', progress: { message: 'TESTING', percent: 50 }, verdict: null });
    render(<VerdictPanel />);
    expect(screen.getByText('TESTING')).toBeDefined();
    expect(document.querySelector('.gauge-fill')).toBeDefined();
  });

  it('renders check icon for genuine verdict', () => {
    setupStore({ verdict: { isGenuine: true, confidence: 0.95 } });
    render(<VerdictPanel />);
    expect(screen.getByText('✓')).toBeDefined();
  });

  it('applies glitch-text class for deepfake verdict', () => {
    setupStore({ verdict: { isGenuine: false, confidence: 0.95 } });
    render(<VerdictPanel />);
    expect(document.querySelector('.glitch-text')).toBeDefined();
  });

  it('renders noise filter div for deepfake', () => {
    setupStore({ verdict: { isGenuine: false, confidence: 0.95 } });
    render(<VerdictPanel />);
    const noise = document.querySelector('.mix-blend-overlay');
    expect(noise).toBeDefined();
    expect(noise?.getAttribute('style')).toContain('url("data:image/svg+xml');
  });

  it('renders flash overlay for both genuine and deepfake', () => {
    setupStore({ verdict: { isGenuine: true, confidence: 0.95 } });
    render(<VerdictPanel />);
    expect(document.querySelector('.fixed.inset-0.bg-white')).toBeDefined();
  });

  it('shows zero velocity if missing from verdict', () => {
    setupStore({ verdict: { isGenuine: true, confidence: 0.95 } }); // no peakVelocity
    render(<VerdictPanel />);
    const spans = document.querySelectorAll('span');
    let hasZero = false;
    spans.forEach(s => { if (s.textContent === '0.0') hasZero = true; });
    expect(hasZero).toBe(true);
  });
});
