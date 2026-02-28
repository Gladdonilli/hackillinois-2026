import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useLarynxStore } from '@/store/useLarynxStore';
import type { FormantData } from '@/types/larynx';

export function WaveformDisplay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioUrl = useLarynxStore((state) => state.audioUrl);
  const [duration, setDuration] = useState('00:00.00');
  
  const waveformDataRef = useRef<Float32Array | null>(null);
  const durationRef = useRef<number>(0);

  useEffect(() => {
    if (!audioUrl) {
      waveformDataRef.current = null;
      durationRef.current = 0;
      setDuration('00:00.00');
      return;
    }

    let isMounted = true;
    const ctx = new window.AudioContext();

    fetch(audioUrl)
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(audioBuffer => {
        if (!isMounted) return;

        const d = audioBuffer.duration;
        durationRef.current = d;
        const m = Math.floor(d / 60).toString().padStart(2, '0');
        const s = Math.floor(d % 60).toString().padStart(2, '0');
        const ms = Math.floor((d % 1) * 100).toString().padStart(2, '0');
        setDuration(`${m}:${s}.${ms}`);

        const channelData = audioBuffer.getChannelData(0);
        const bins = 128; // Need enough bins for 2px rect + 1px gap across 384px width
        const step = Math.ceil(channelData.length / bins);
        const downsampled = new Float32Array(bins);
        for (let i = 0; i < bins; i++) {
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
      const tongueVelocity = storeState.tongueVelocity || 0;
      const status = storeState.status || 'idle';
      const verdict = storeState.verdict;

      const analyzing = status === 'analyzing';
      const breathingAlpha = analyzing ? 0.1 + Math.sin(Date.now() / 200) * 0.1 : 0; // 0.1 to 0.3 at ~2.5Hz

      // Draw background grid (25%, 50%, 75%)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i <= 3; i++) {
        const y = Math.floor((height / 4) * i) + 0.5;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      let currentLevel = 0;

      // Draw Waveform bars
      if (waveformDataRef.current) {
        const data = waveformDataRef.current;
        const bins = data.length;
        const barWidth = 2;
        const gap = 1;

        // Compute current level
        if (totalFrames > 0 && currentFrame > 0) {
            const progress = Math.min(1, currentFrame / totalFrames);
            const playheadBin = Math.floor(progress * bins);
            const start = Math.max(0, playheadBin - 2);
            const end = Math.min(bins - 1, playheadBin + 2);
            let sum = 0;
            for (let b = start; b <= end; b++) sum += data[b] || 0;
            const avg = sum / (end - start + 1);
            currentLevel = Math.min(100, avg * 100);
        }

        // Draw active segment highlight
        if (analyzing && totalFrames > 0 && currentFrame > 0) {
            const playheadX = (currentFrame / totalFrames) * width;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.fillRect(Math.max(0, playheadX - 12), 0, 24, height);
        }

        const isViolent = tongueVelocity > 50;
        const isExtreme = tongueVelocity > 80;

        for (let i = 0; i < bins; i++) {
          const x = i * (barWidth + gap);
          
          if (isExtreme && Math.random() > 0.8) {
             // Fragmented gaps at extreme velocity
             continue;
          }

          let amplitude = data[i] * (height * 0.8);
          if (amplitude < 1) amplitude = 1;
          
          let y = height - Math.min(height, amplitude);
          if (isViolent) {
             y += (Math.random() * 4) - 2; // ±2px jitter
          }

          const grad = ctx.createLinearGradient(0, height, 0, y);
          if (isExtreme) {
             grad.addColorStop(0, 'rgba(255, 50, 50, 0.2)');
             grad.addColorStop(1, 'rgba(255, 50, 50, 0.8)');
          } else {
             grad.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
             grad.addColorStop(1, 'rgba(0, 255, 255, 0.6)');
          }
          
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, amplitude);
        }
      }

      // Draw Formants overlapping with History Trail
      const formantsData = storeState.formants;
      if (Array.isArray(formantsData) && formantsData.length > 0 && totalFrames > 0) {
        const drawFormantLineWithTrail = (key: keyof FormantData, baseColorRgb: string, maxFreq: number, label: string) => {
          const historyFrames = 5;
          const currentIdx = currentFrame > 0 ? currentFrame : formantsData.length;
          
          for (let offset = historyFrames; offset >= 0; offset--) {
            const trailIdx = currentIdx - offset;
            if (trailIdx <= 0) continue;
            
            // Fade out older trails: 1.0 down to 0.1
            const alpha = offset === 0 ? (analyzing ? 1.0 : 0.4) : (0.4 - (offset / historyFrames) * 0.3);
            ctx.strokeStyle = `rgba(${baseColorRgb}, ${alpha})`;
            
            // Only main line gets dash, glow intensely if analyzing
            if (offset === 0) {
               ctx.lineWidth = analyzing ? 2.5 : 1.5;
               ctx.setLineDash([2, 5]);
               if (analyzing) {
                  ctx.shadowBlur = 10;
                  ctx.shadowColor = `rgba(${baseColorRgb}, 0.8)`;
               }
            } else {
               ctx.lineWidth = 1;
               ctx.setLineDash([]);
               ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            let started = false;
            let lastX = 0;
            let lastY = 0;
            
            // Draw up to the trail index
            const dataLength = formantsData.length;
            for (let i = 0; i < dataLength && i <= trailIdx; i++) {
              const progress = i / Math.max(1, (totalFrames || dataLength));
              const x = progress * width;
              // In React array state we might not have every frame populated if sparsely updating
              const formantFrame = formantsData[i];
              if (!formantFrame) continue;
              
              const freq = formantFrame[key];
              if (typeof freq === 'number' && !isNaN(freq)) {
                const y = height - Math.min(1, Math.max(0, freq / maxFreq)) * height;
                if (!started) {
                  ctx.moveTo(x, y);
                  started = true;
                } else {
                  ctx.lineTo(x, y);
                }
                lastX = x;
                lastY = y;
              } else {
                started = false;
              }
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0; // reset

            if (offset === 0 && started) {
              ctx.font = '8px monospace';
              ctx.fillStyle = `rgba(${baseColorRgb}, 1)`;
              ctx.fillText(label, Math.min(width - 12, lastX + 4), lastY + 3);
            }
          }
        };

        drawFormantLineWithTrail('f1', '255, 100, 100', 1500, 'F1');
        drawFormantLineWithTrail('f2', '100, 255, 200', 3000, 'F2');
        drawFormantLineWithTrail('f3', '255, 255, 100', 4500, 'F3');
      }

      // Draw Playhead & Timestamps
      if (totalFrames > 0 && currentFrame > 0) {
        let playheadX = (currentFrame / totalFrames) * width;
        if (playheadX > width) playheadX = width;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 4;
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00FFFF';
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Draw timestamp overlay
        const pt = (currentFrame / totalFrames) * (durationRef.current || 0);
        const m = Math.floor(pt / 60).toString().padStart(2, '0');
        const s = Math.floor(pt % 60).toString().padStart(2, '0');
        const ms = Math.floor((pt % 1) * 100).toString().padStart(2, '0');
        const timeStr = `${m}:${s}.${ms}`;
        
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
        ctx.textAlign = 'right';
        ctx.fillText(timeStr, width - 4, height - 6);
      }

      // Update DOM values directly to avoid React state re-renders
      if (formantsData && currentFrame > 0 && currentFrame < formantsData.length) {
         const f1El = document.getElementById('wave-f1-val');
         const f2El = document.getElementById('wave-f2-val');
         const f3El = document.getElementById('wave-f3-val');
         const frameData: any = formantsData[currentFrame];
         if (frameData) {
            if(f1El) f1El.textContent = `F1: ${Math.round(frameData.f1 || 0)} Hz`;
            if(f2El) f2El.textContent = `F2: ${Math.round(frameData.f2 || 0)} Hz`;
            if(f3El) f3El.textContent = `F3: ${Math.round(frameData.f3 || 0)} Hz`;
         }
      }

      // Update Audio Level meter
      const levelBar = document.getElementById('wave-level-bar');
      const levelVal = document.getElementById('wave-level-val');
      if (levelBar) {
          levelBar.style.width = `${currentLevel.toFixed(1)}%`;
          if (tongueVelocity > 80) {
              levelBar.style.background = 'linear-gradient(90deg, #00FFFF, #FF0000)';
          } else if (tongueVelocity > 50) {
              levelBar.style.background = 'linear-gradient(90deg, #00FFFF, #FFA500)';
          } else {
              levelBar.style.background = ''; // Use CSS default
          }
      }
      if (levelVal) levelVal.textContent = `${currentLevel.toFixed(0)}%`;

      // Update Status Text directly
      const statusEl = document.getElementById('wave-status-text');
      if (statusEl) {
         if (status === 'idle') {
            statusEl.textContent = 'STANDBY';
            statusEl.className = 'font-mono text-[9px] text-[#666] tracking-widest w-1/4 text-right truncate pl-2';
         } else if (status === 'uploading') {
            statusEl.textContent = 'INGESTING...';
            statusEl.className = 'font-mono text-[9px] text-cyan animate-pulse tracking-widest w-1/4 text-right truncate pl-2';
         } else if (status === 'analyzing') {
            statusEl.textContent = 'SCANNING FORMANTS';
            statusEl.className = 'font-mono text-[9px] text-cyan animate-pulse tracking-widest w-1/4 text-right truncate pl-2';
         } else if (status === 'complete') {
            statusEl.textContent = 'ANALYSIS COMPLETE';
            statusEl.className = `font-mono text-[9px] tracking-widest w-1/4 text-right truncate pl-2 ${verdict && !verdict.isGenuine ? 'text-red-500 [text-shadow:0_0_8px_rgba(255,0,0,0.6)]' : 'text-green-500'}`;
         }
      }

      // Update breathing border
      let containerEl = document.getElementById('waveform-container');
      if (containerEl) {
         if (analyzing) {
           containerEl.style.boxShadow = `0 0 15px rgba(0, 255, 255, ${breathingAlpha})`;
           containerEl.style.borderColor = `rgba(0, 255, 255, ${Math.max(0.1, breathingAlpha + 0.1)})`;
         } else {
           containerEl.style.boxShadow = '';
           containerEl.style.borderColor = '';
         }
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
      id="waveform-container"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed top-4 left-4 w-96 hud-panel hud-sweep !bg-black/80 backdrop-blur-md p-3 z-50 pointer-events-none transition-all duration-300 border border-border/30"
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#666] font-mono">AUDIO WAVEFORM</span>
            <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0s' }} />
                <span className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0.4s' }} />
            </span>
        </div>
        <div className="font-mono text-[10px] text-cyan">
          {duration}
        </div>
      </div>
      
      <div className="relative w-full h-[100px] bg-transparent">
        <canvas
          ref={canvasRef}
          width={384}
          height={100}
          className="block w-full h-full mix-blend-screen"
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[8px] font-mono text-[#444] tracking-wider uppercase">LEVEL</span>
        <div className="flex-1 gauge-track relative h-1 bg-[#1a1a1a]">
          <div id="wave-level-bar" className="gauge-fill absolute top-0 left-0 h-full transition-all duration-75 bg-cyan" style={{ width: '0%' }} />
          {/* Tick marks */}
          <div className="absolute top-0 bottom-0 left-1/4 w-[1px] bg-white/20" />
          <div className="absolute top-0 bottom-0 left-2/4 w-[1px] bg-white/40" />
          <div className="absolute top-0 bottom-0 left-3/4 w-[1px] bg-white/20" />
        </div>
        <span id="wave-level-val" className="text-[8px] font-mono text-[#555] w-6 text-right">0%</span>
      </div>

      <div className="flex flex-row justify-between items-center mt-2 border-t border-border/30 pt-2">
        <div id="wave-f1-val" className="font-mono text-[9px] text-[#555] w-1/4">F1: --- Hz</div>
        <div id="wave-f2-val" className="font-mono text-[9px] text-[#555] w-1/4 text-center">F2: --- Hz</div>
        <div id="wave-f3-val" className="font-mono text-[9px] text-[#555] w-1/4 text-center">F3: --- Hz</div>
        <div id="wave-status-text" className="font-mono text-[9px] text-[#666] tracking-widest w-1/4 text-right truncate pl-2">STANDBY</div>
      </div>
    </motion.div>
  );
}
