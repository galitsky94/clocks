import { useState } from 'react';

const InfoOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Info button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 bg-zinc-800 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors z-50"
        aria-label={isOpen ? 'Close information' : 'Open information'}
      >
        {isOpen ? '×' : 'i'}
      </button>

      {/* Info overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-40">
          <div className="bg-zinc-900 max-w-2xl rounded-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 gradient-text">43,200 Broken Clocks</h2>

            <div className="space-y-4 text-zinc-300">
              <p>
                <strong className="text-white">The Concept:</strong> They say that even a broken clock is right twice a day.
                So what if we had 43,200 broken clocks, one for each second in 12 hours?
              </p>

              <h3 className="text-lg font-semibold text-white">How It Works</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>Each point in this visualization represents a clock permanently stopped at a specific second.</li>
                <li>There are exactly 43,200 seconds in 12 hours (12 × 60 × 60 = 43,200).</li>
                <li>The clocks are arranged in a 240×180 grid (240 × 180 = 43,200).</li>
                <li>At any given moment, exactly two clocks in this grid show the correct time.</li>
                <li>The brightness of each point shows how close that clock is to being correct.</li>
              </ul>

              <h3 className="text-lg font-semibold text-white">The Mathematics</h3>
              <p>
                The brightest points (white) are the currently correct clocks. The darkest points are the clocks that are
                exactly 6 hours (21,600 seconds) off from the current time - as far away as possible from being correct.
              </p>

              <h3 className="text-lg font-semibold text-white">The Visualization</h3>
              <p>
                As time passes, you'll see waves of brightness move across the grid. This creates fascinating mathematical
                patterns as two points of correctness travel through the 43,200 possible states.
              </p>

              <h3 className="text-lg font-semibold text-white">Color Schemes</h3>
              <p>
                Try different color schemes to see different representations of the same mathematical concept:
              </p>
              <ul className="list-disc list-inside">
                <li><strong>Default:</strong> Cool blues to warm reds based on correctness</li>
                <li><strong>Rainbow:</strong> Full color spectrum from blue to red</li>
                <li><strong>Greyscale:</strong> Simple black to white gradient</li>
              </ul>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-6 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoOverlay;
