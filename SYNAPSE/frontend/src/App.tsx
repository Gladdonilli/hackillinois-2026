import { ReactNode } from "react";
import BrainView from "./components/BrainView";

function App() {
  return (
    <div className="flex h-screen w-full min-w-desktop bg-bg text-text overflow-hidden">
      {/* Left Panel: PromptConsole + InterventionPanel */}
      <aside className="w-[300px] h-full border-r border-border bg-surface p-4 flex flex-col gap-4">
        <div className="flex-1 border border-border/50 rounded p-2">
          {/* PromptConsole Placeholder */}
          <h2 className="text-dim text-xs font-mono mb-2 uppercase tracking-wider">Prompt Console</h2>
        </div>
        <div className="flex-1 border border-border/50 rounded p-2">
          {/* InterventionPanel Placeholder */}
          <h2 className="text-dim text-xs font-mono mb-2 uppercase tracking-wider">Interventions</h2>
        </div>
      </aside>

      {/* Center: BrainView (R3F Canvas) */}
      <main className="flex-1 h-full relative">
        <BrainView />
      </main>

      {/* Right Panel: ResponseComparator + FeatureJournal */}
      <aside className="w-[400px] h-full border-l border-border bg-surface p-4 flex flex-col gap-4">
         <div className="flex-1 border border-border/50 rounded p-2">
          {/* ResponseComparator Placeholder */}
          <h2 className="text-dim text-xs font-mono mb-2 uppercase tracking-wider">Response Flow</h2>
        </div>
        <div className="flex-1 border border-border/50 rounded p-2">
          {/* FeatureJournal Placeholder */}
           <h2 className="text-dim text-xs font-mono mb-2 uppercase tracking-wider">Feature Journal</h2>
        </div>
      </aside>
    </div>
  );
}

export default App;
