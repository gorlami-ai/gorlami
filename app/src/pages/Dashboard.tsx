
export function Dashboard() {
  return (
    <div className="p-10 min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold text-slate-50 mb-6 leading-tight">
          Hold <kbd className="inline-block px-2 py-1 text-sm font-mono bg-slate-800 border border-slate-600 rounded text-slate-300">⌘</kbd>+<kbd className="inline-block px-2 py-1 text-sm font-mono bg-slate-800 border border-slate-600 rounded text-slate-300">Ctrl</kbd>+<kbd className="inline-block px-2 py-1 text-sm font-mono bg-slate-800 border border-slate-600 rounded text-slate-300">Space</kbd> to start recording!
        </h1>
        <p className="text-lg md:text-xl text-slate-400 leading-relaxed">
          Voice-driven AI assistant that captures, transcribes, and enhances your speech in
          real-time
        </p>
      </div>
    </div>
  );
}