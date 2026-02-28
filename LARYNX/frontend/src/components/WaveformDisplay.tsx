import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useLarynxStore } from '@/store/useLarynxStore';

export function WaveformDisplay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioUrl = useLarynxStore((state) => state.audioUrl);
  
  const waveformDataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      waveformDataRef.current = null;
      return;
    }

    let isMounted = true;
    const ctx = new window.AudioContext();

    fetch(audioUrl)
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuffer => {
        if (!isMounted) return;
        const channelData = audioBuffer.getChannelData(0);
        // Downsample for visual rendering
        const step = Math.ceil(channelData.length / 384);
        const downsampled = new Float32Array(384);
        for (let i = 0; i < 384; i++) {
          let min = 1.0;
          let max = -1.0;
          for (let j = 0; j < step; j++) {
            const datum = channelData[i * step + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
          }
          downsampled[i] = Math.max(Math.abs(min), Math.abs(max));
        }
        waveformDataRef.current = downsampled;
      })
      .catch(err => {
        console.error("Error decoding audio for waveform:", err);
      });

    return () => {
      isMounted = false;
      ctx.close();
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Access transient state
      const storeState = useLarynxStore.getState();
      const currentFrame = storeState.currentFrame || 0;
      const totalFrames = Array.isArray(storeState.frames) ? storeState.frames.length : Math.max(1, currentFrame);

      // Draw background grid
      ctx.strokeStyle = '#1F1F1F';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // 4 horizontal lines
      for (let i = 1; i <= 3; i++) {
        const y = Math.floor((height / 4) * i) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Tick marks at bottom
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const x = Math.floor((width / 10) * i) + 0.5;
        ctx.moveTo(x, height - 5);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // Draw Waveform
      if (waveformDataRef.current) {
        const data = waveformDataRef.current;
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = i;
          const amplitude = data[i] * Math.max(10, (height / 2));
          const y1 = (height / 2) - amplitude;
          const y2 = (height / 2) + amplitude;
          
          ctx.moveTo(x, Math.floor(y1));
          ctx.lineTo(x, Math.floor(y2));
        }
        ctx.stroke();
      }

      // Draw Formants overlapping
      const formantsData = storeState.formants;
      if (Array.isArray(formantsData) && formantsData.length > 0) {
        const xStep = width / formantsData.length;
        
        const drawFormantLine = (key: string, color: string, maxFreq: number) => {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          let started = false;
          for (let i = 0; i < formantsData.length; i++) {
            const formantFrame = formantsData[i] as any;
            const freq = formantFrame[key];
            if (typeof freq === 'number') {
              const x = i * xStep;
              const y = height - Math.min(1, Math.max(0, freq / maxFreq)) * height;
              if (!started) {
                ctx.moveTo(x, y);
                started = true;
              } else {
                ctx.lineTo(x, y);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();
        };

        drawFormantLine('f1', '#FF6B6B', 1500);
        drawFormantLine('f2', '#4ECDC4', 4000);
        drawFormantLine('f3', '#FFE66D', 6000);
      }

      // Draw Playhead
      if (totalFrames > 0) {
        const playheadX = (currentFrame / totalFrames) * width;
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00FFFF';
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-4 left-4 w-96 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 z-50 text-text shadow-lg"
    >
      <div className="font-mono text-xs text-dim tracking-widest mb-2">WAVEFORM</div>
      
      <div className="relative w-full h-[120px] rounded overflow-hidden bg-black/50 border border-[#1F1F1F]">
        {!audioUrl && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs text-dim z-10 pointer-events-none">
            NO AUDIO DATA
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={384}
          height={120}
          className="block w-full h-full object-cover mix-blend-screen"
          style={{ width: '384px', height: '120px' }}
        />
      </div>
    </motion.div>
  );
}
