export function Dashboard() {
  return (
    <div className="p-6 min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Hold{' '}
          <kbd className="inline-block px-2 py-1 text-sm font-mono bg-gray-100 border border-gray-300 rounded text-gray-700">
            ⌘
          </kbd>
          +
          <kbd className="inline-block px-2 py-1 text-sm font-mono bg-gray-100 border border-gray-300 rounded text-gray-700">
            Ctrl
          </kbd>
          +
          <kbd className="inline-block px-2 py-1 text-sm font-mono bg-gray-100 border border-gray-300 rounded text-gray-700">
            Space
          </kbd>{' '}
          to start recording!
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Voice-driven AI assistant that captures, transcribes, and enhances your speech in
          real-time
        </p>
      </div>
    </div>
  );
}
