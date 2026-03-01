import { useEffect, useRef } from 'react'
import { useLarynxStore } from '@/store/useLarynxStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export function HistoryPanel() {
  const { showHistory, toggleHistory, historyItems, historyLoading, fetchHistory, setVerdict, setStatus, reset } = useLarynxStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showHistory) {
      fetchHistory()
    }
  }, [showHistory, fetchHistory])

  useGSAP(() => {
    if (showHistory && !historyLoading && listRef.current?.children) {
      gsap.from(listRef.current.children, {
        opacity: 0,
        y: 10,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'all'
      })
    }
  }, [showHistory, historyLoading, historyItems])

  if (!showHistory) return null

  const handleItemClick = (item: any) => {
    reset()
    setVerdict({
      isGenuine: item.verdict === 'GENUINE',
      confidence: item.confidence,
      peakVelocity: item.peakVelocity,
      threshold: item.threshold,
      anomalousFrameCount: item.anomalousFrames,
      totalFrameCount: item.totalFrames,
      anomalyRatio: item.anomalyRatio,
      reportId: item.reportId,
      processingTimeMs: item.processingTimeMs
    })
    setStatus('complete')
    toggleHistory()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
      <div 
        ref={containerRef}
        className="hud-panel w-full max-w-2xl max-h-[80vh] flex flex-col border border-cyan/30 shadow-[0_0_30px_rgba(56,189,248,0.1)] rounded-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-cyan/20 bg-black/40">
          <div>
            <h2 className="text-2xl font-mono tracking-widest text-cyan text-glow-cyan glitch-text" data-text="ANALYSIS HISTORY">
              ANALYSIS HISTORY
            </h2>
            <p className="text-xs font-mono text-dim tracking-widest mt-1">FORENSIC RECORDS (D1)</p>
          </div>
          <Button 
            variant="ghost"
            size="icon"
            onClick={toggleHistory}
            className="text-2xl"
            data-interactive
          >
            ×
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-cyan/30 scrollbar-track-transparent">
          {historyLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-cyan/5 rounded-sm animate-pulse border border-cyan/10" />
              ))}
            </div>
          ) : historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-cyan/50 font-mono text-sm tracking-wider animate-pulse">
              No analyses yet. Upload audio to begin.
            </div>
          ) : (
            <div ref={listRef} className="flex flex-col gap-3">
              {historyItems.map((item) => {
                const isGenuine = item.verdict === 'GENUINE'
                return (
                  <div 
                    key={item.reportId}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex items-center justify-between p-4 border rounded-sm transition-all cursor-pointer group hover:bg-white/5",
                      isGenuine ? "border-genuine/20 hover:border-genuine/60" : "border-violation/20 hover:border-violation/60"
                    )}
                    data-interactive
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={isGenuine ? "genuine" : "deepfake"} 
                          className={cn(
                            "px-3 border-none tracking-widest text-xs",
                            isGenuine ? "bg-genuine text-black" : "bg-violation text-white"
                          )}
                        >
                          {item.verdict}
                        </Badge>
                        <span className={cn(
                          "font-mono text-lg font-bold",
                          isGenuine ? "text-genuine text-glow-genuine" : "text-violation text-glow-warn"
                        )}>
                          {(item.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex gap-4 font-mono text-xs">
                        <span className="text-dim">
                          PEAK: <span className="text-white/80">{item.peakVelocity.toFixed(1)} cm/s</span>
                        </span>
                        <span className="text-dim">
                          RATIO: <span className="text-white/80">{(item.anomalyRatio * 100).toFixed(1)}%</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs text-dim">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                      <span className="font-sans text-[10px] text-cyan/40 font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        LOAD RECORD →
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
