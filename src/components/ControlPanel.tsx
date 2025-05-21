import { useState } from 'react';

interface ControlPanelProps {
  onColorSchemeChange: (scheme: 'default' | 'rainbow' | 'greyscale') => void;
  onSizeChange: (width: number, height: number) => void;
}

const ControlPanel = ({
  onColorSchemeChange,
  onSizeChange
}: ControlPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('large');
  const [selectedColorScheme, setSelectedColorScheme] = useState<string>('default');

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);

    switch(size) {
      case 'small':
        onSizeChange(600, 450);
        break;
      case 'medium':
        onSizeChange(900, 675);
        break;
      case 'large':
      default:
        onSizeChange(1200, 900);
        break;
    }
  };

  const handleColorSchemeChange = (scheme: 'default' | 'rainbow' | 'greyscale') => {
    setSelectedColorScheme(scheme);
    onColorSchemeChange(scheme);
  };

  return (
    <div className="bg-zinc-900/90 text-white rounded-lg shadow-lg backdrop-blur-sm w-full max-w-md border border-zinc-800">
      <div
        className="flex justify-between items-center cursor-pointer px-4 py-3 border-b border-zinc-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-medium">Control Panel</h3>
        <span className="bg-zinc-800 w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:bg-zinc-700">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-sm uppercase tracking-wider text-zinc-400 mb-3">Color Scheme</h4>
            <div className="grid grid-cols-3 gap-3">
              <button
                className={`relative overflow-hidden rounded-md transition ${
                  selectedColorScheme === 'default'
                    ? 'ring-2 ring-white ring-opacity-70'
                    : 'hover:opacity-90'
                }`}
                onClick={() => handleColorSchemeChange('default')}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-blue-600 via-purple-600 to-red-600 opacity-80"></div>
                <span className="relative block py-2 text-white font-medium text-sm text-center">Default</span>
              </button>

              <button
                className={`relative overflow-hidden rounded-md transition ${
                  selectedColorScheme === 'rainbow'
                    ? 'ring-2 ring-white ring-opacity-70'
                    : 'hover:opacity-90'
                }`}
                onClick={() => handleColorSchemeChange('rainbow')}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-green-500 to-red-600 opacity-80"></div>
                <span className="relative block py-2 text-white font-medium text-sm text-center">Rainbow</span>
              </button>

              <button
                className={`relative overflow-hidden rounded-md transition ${
                  selectedColorScheme === 'greyscale'
                    ? 'ring-2 ring-white ring-opacity-70'
                    : 'hover:opacity-90'
                }`}
                onClick={() => handleColorSchemeChange('greyscale')}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-200 to-zinc-800 opacity-80"></div>
                <span className="relative block py-2 text-white font-medium text-sm text-center">Greyscale</span>
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm uppercase tracking-wider text-zinc-400 mb-3">Display Size</h4>
            <div className="grid grid-cols-3 gap-3">
              <button
                className={`px-3 py-2 rounded-md font-medium text-sm transition ${
                  selectedSize === 'small'
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
                onClick={() => handleSizeChange('small')}
              >
                Small
              </button>
              <button
                className={`px-3 py-2 rounded-md font-medium text-sm transition ${
                  selectedSize === 'medium'
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
                onClick={() => handleSizeChange('medium')}
              >
                Medium
              </button>
              <button
                className={`px-3 py-2 rounded-md font-medium text-sm transition ${
                  selectedSize === 'large'
                    ? 'bg-zinc-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                }`}
                onClick={() => handleSizeChange('large')}
              >
                Large
              </button>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-sm text-zinc-400 bg-zinc-800/70 p-3 rounded-md">
              <p className="mb-2">
                <strong className="text-white">There are 43,200 seconds in 12 hours.</strong>
              </p>
              <p>
                Each pixel represents a broken clock displaying a specific second.
                The brightness shows how close each clock is to displaying the current time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
