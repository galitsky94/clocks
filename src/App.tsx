import { useState } from 'react';
import ClockHeatmap from './components/ClockHeatmap';
import ControlPanel from './components/ControlPanel';
import InfoOverlay from './components/InfoOverlay';

function App() {
  const [colorScheme, setColorScheme] = useState<'default' | 'rainbow' | 'greyscale'>('default');
  const [dimensions, setDimensions] = useState({ width: 1200, height: 900 });

  const handleColorSchemeChange = (scheme: 'default' | 'rainbow' | 'greyscale') => {
    setColorScheme(scheme);
  };

  const handleSizeChange = (width: number, height: number) => {
    setDimensions({ width, height });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <InfoOverlay />

      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 gradient-text">43,200 Broken Clocks</h1>
          <p className="text-zinc-400">
            A visual representation of 43,200 clocks - one for each second in 12 hours.
            <br />
            At any moment, exactly two clocks display the correct time.
          </p>
        </header>

        <main className="flex flex-col items-center gap-8">
          <ClockHeatmap
            width={dimensions.width}
            height={dimensions.height}
            colorScheme={colorScheme}
          />

          <ControlPanel
            onColorSchemeChange={handleColorSchemeChange}
            onSizeChange={handleSizeChange}
          />
        </main>

        <footer className="mt-16 text-center text-zinc-500 text-sm">
          <p>43,200 broken clocks - always right twice a day.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
