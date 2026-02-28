import React, { useEffect, useState } from 'react';
import { useSynapseStore } from '../store';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { diffWords, Change } from 'diff';
import { Copy, Check, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ResponseComparator() {
  const { originalResponse, steeredResponse, phase, generationTime } = useSynapseStore();
  
  const [copiedOrig, setCopiedOrig] = useState(false);
  const [copiedSteered, setCopiedSteered] = useState(false);
  const [diffs, setDiffs] = useState<Change[]>([]);

  // Compute diffs when responses change
  useEffect(() => {
    if (originalResponse && steeredResponse) {
      setDiffs(diffWords(originalResponse, steeredResponse));
    } else {
      setDiffs([]);
    }
  }, [originalResponse, steeredResponse]);

  const handleCopy = (text: string, isOrig: boolean) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isOrig) {
      setCopiedOrig(true);
      setTimeout(() => setCopiedOrig(false), 2000);
    } else {
      setCopiedSteered(true);
      setTimeout(() => setCopiedSteered(false), 2000);
    }
  };

  const isGenerating = phase === 'generating' || phase === 'extracting';
  const isAblating = phase === 'ablating';

  // Calculate generic distance for the bar (simple ratio of changed words based on diff)
  const calculateDistance = () => {
     if (!diffs.length) return 0;
     let changedChars = 0;
     let totalChars = 0;
     diffs.forEach(d => {
         if (d.added || d.removed) changedChars += d.value.length;
         if (!d.removed) totalChars += d.value.length; 
     });
     return totalChars === 0 ? 0 : Math.min(changedChars / totalChars, 1.0);
  };

  const distance = calculateDistance();

  // If we haven't even generated the first response
  if (!originalResponse && phase === 'idle') {
    return (
      <div className="flex flex-col p-4 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg h-full min-h-[500px] w-full flex-1 items-center justify-center">
         <span className="text-sm font-sans text-[#666666] italic">Responses will appear here...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg h-full min-h-[500px] w-full flex-1 space-y-4">
      
      {/* Top Bar: Stats & Distance */}
      <div className="flex justify-between items-center border-b border-[#1F1F1F] pb-3">
         <div className="flex space-x-6">
            <div className="flex items-center space-x-2 text-[#666666]">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-mono">{generationTime ? `${generationTime.toFixed(2)}s` : '--'}</span>
            </div>
            <div className="flex items-center space-x-2 text-[#666666]">
                <FileText className="w-3 h-3" />
                <span className="text-xs font-mono">
                    ~{originalResponse ? originalResponse.split(' ').length : 0} / ~{steeredResponse ? steeredResponse.split(' ').length : 0} tokens
                </span>
            </div>
         </div>

         {/* Semantic Distance Bar */}
         {steeredResponse && (
             <div className="flex items-center space-x-3 w-48">
                 <span className="text-[10px] font-mono text-[#666666] uppercase">Diff</span>
                 <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden relative">
                     <div 
                        className="absolute top-0 left-0 h-full transition-all duration-500"
                        style={{ 
                            width: `${distance * 100}%`,
                            background: `linear-gradient(90deg, #00FFFF, ${distance > 0.5 ? '#FF3366' : '#00AAAA'})` 
                        }} 
                     />
                 </div>
                 <span className="text-[10px] font-mono" style={{ color: distance > 0.5 ? '#FF3366' : '#00FFFF'}}>{distance.toFixed(2)}</span>
             </div>
         )}
      </div>

      {/* Main Content Columns */}
      <div className="flex flex-1 space-x-4 min-h-0 overflow-hidden relative">
          
          {/* Origin Column */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-[#1F1F1F] pr-4">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-mono text-[#666666] uppercase tracking-wider">Original Base Model</span>
                 {originalResponse && (
                     <button onClick={() => handleCopy(originalResponse, true)} className="text-[#666666] hover:text-[#EDEDED] transition-colors p-1 rounded hover:bg-[#1A1A1A]">
                         {copiedOrig ? <Check className="w-3.5 h-3.5 text-[#00FFFF]" /> : <Copy className="w-3.5 h-3.5" />}
                     </button>
                 )}
             </div>
             
             <div className={cn("flex-1 overflow-y-auto font-mono text-sm leading-relaxed p-2 rounded bg-black/50 scrollbar-thin scrollbar-thumb-[#333333]", isGenerating && "opacity-50 blur-sm transition-all")}>
                 {isGenerating ? (
                     <div className="animate-pulse flex space-x-2 items-center text-[#666666] h-full justify-center">
                         <span className="w-2 h-4 bg-[#00FFFF]/50 animate-bounce"></span>
                         <span className="w-2 h-4 bg-[#00FFFF]/50 animate-bounce" style={{animationDelay: '0.1s'}}></span>
                         <span className="w-2 h-4 bg-[#00FFFF]/50 animate-bounce" style={{animationDelay: '0.2s'}}></span>
                     </div>
                 ) : (
                     <TextStreamer text={originalResponse || ''} />
                 )}
             </div>
          </div>

          {/* Steered Column */}
          <div className="flex-1 flex flex-col min-w-0 pl-2">
             <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-mono text-[#00FFFF] border border-[#00FFFF]/20 bg-[#00FFFF]/5 px-2 py-0.5 rounded uppercase tracking-wider flex items-center space-x-2">
                    <span>Intervened</span>
                    {isAblating && <span className="w-1.5 h-1.5 rounded-full bg-[#00FFFF] animate-ping ml-2"/>}
                 </span>
                 {steeredResponse && (
                     <button onClick={() => handleCopy(steeredResponse, false)} className="text-[#666666] hover:text-[#EDEDED] transition-colors p-1 rounded hover:bg-[#1A1A1A]">
                         {copiedSteered ? <Check className="w-3.5 h-3.5 text-[#00FFFF]" /> : <Copy className="w-3.5 h-3.5" />}
                     </button>
                 )}
             </div>
             
             <div className={cn("flex-1 overflow-y-auto font-mono text-sm leading-relaxed p-2 rounded bg-black/50 scrollbar-thin scrollbar-thumb-[#333333]", (isGenerating || isAblating) && "opacity-50 blur-[2px] transition-all duration-300")}>
                 {isAblating ? (
                     <div className="flexflex-col items-center justify-center h-full text-[#666666] font-mono text-xs opacity-50 text-center">
                        <div className="mt-10 mx-auto w-10 h-10 border-2 border-[#FF3366] border-t-transparent rounded-full animate-spin"></div>
                        <div className="mt-4 tracking-widest uppercase">Rewiring Path...</div>
                     </div>
                 ) : steeredResponse ? (
                     // Show diffs if we have them
                     <div className="whitespace-pre-wrap word-break">
                         {diffs.map((part, index) => (
                             <span 
                                key={index} 
                                className={cn(
                                    "transition-colors duration-300",
                                    part.added ? "bg-[#00FFFF]/20 text-[#00FFFF]" : 
                                    part.removed ? "bg-[#FF3366]/20 text-[#FF3366] line-through opacity-60" : "text-[#EDEDED]"
                                )}
                             >
                                 {part.value}
                             </span>
                         ))}
                     </div>
                 ) : (
                     <div className="text-[#666666] italic opacity-50">Waiting for intervention...</div>
                 )}
             </div>
          </div>

      </div>
    </div>
  );
}

// Sub-component for typing effect
function TextStreamer({ text }: { text: string }) {
    if (!text) return null;
    
    // We split by word roughly to not kill React rendering, 
    // staggerChildren is too slow for big text char-by-char
    const words = text.split(/(\s+)/);
    
    return (
        <motion.div 
           initial="hidden" 
           animate="visible"
           variants={{
               visible: { transition: { staggerChildren: 0.005 } },
               hidden: {}
           }}
           className="whitespace-pre-wrap word-break text-[#EDEDED]"
        >
            {words.map((char, i) => (
               <motion.span 
                 key={i}
                 variants={{
                     hidden: { opacity: 0 },
                     visible: { opacity: 1 }
                 }}
               >
                   {char}
               </motion.span>
            ))}
        </motion.div>
    );
}