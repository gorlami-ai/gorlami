export function Home() {
  return (
    <div className="p-6 min-h-screen bg-white">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Home</h1>
          <p className="text-gray-600 mt-1">Your voice-driven AI assistant for macOS</p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold mb-2">Start Recording</h3>
                <div className="mb-3">
                  <kbd className="inline-flex items-center px-2 py-1 text-sm font-mono bg-white border border-gray-200 rounded text-gray-700">
                    ⌘
                  </kbd>
                  <span className="mx-1 text-gray-500">+</span>
                  <kbd className="inline-flex items-center px-2 py-1 text-sm font-mono bg-white border border-gray-200 rounded text-gray-700">
                    Ctrl
                  </kbd>
                  <span className="mx-1 text-gray-500">+</span>
                  <kbd className="inline-flex items-center px-2 py-1 text-sm font-mono bg-white border border-gray-200 rounded text-gray-700">
                    Space
                  </kbd>
                </div>
                <p className="text-sm text-gray-600">
                  Hold these keys to record your voice. Release to stop and automatically transcribe your speech.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold mb-2">Edit Mode</h3>
                <div className="mb-3">
                  <kbd className="inline-flex items-center px-2 py-1 text-sm font-mono bg-white border border-gray-200 rounded text-gray-700">
                    ⌘
                  </kbd>
                  <span className="mx-1 text-gray-500">+</span>
                  <kbd className="inline-flex items-center px-2 py-1 text-sm font-mono bg-white border border-gray-200 rounded text-gray-700">
                    Ctrl
                  </kbd>
                  <span className="mx-1 text-gray-500">+</span>
                  <kbd className="inline-flex items-center px-2 py-1 text-sm font-mono bg-white border border-gray-200 rounded text-gray-700">
                    E
                  </kbd>
                </div>
                <p className="text-sm text-gray-600">
                  Quickly edit your last recording. Perfect for making corrections or adding context to your transcriptions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Pro tip:</span> You can customize these shortcuts in Settings → Shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
