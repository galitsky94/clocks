import { useEffect, useRef, useState } from 'react';

interface ClockHeatmapProps {
  width?: number;
  height?: number;
  colorScheme?: 'default' | 'rainbow' | 'greyscale';
}

// Constants
const GRID_WIDTH = 240;
const GRID_HEIGHT = 180;
const TOTAL_SECONDS = GRID_WIDTH * GRID_HEIGHT; // 43,200 seconds in 12 hours
const MAX_ZOOM_LEVEL = 40;

// Clock display constants
const MIN_CLOCK_SIZE = 30; // Minimum size in pixels needed to display time text
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 10;
const CELL_PADDING_PERCENT = 0.1; // 10% padding between cells

// Clock display modes based on zoom level
enum ClockDisplayMode {
  COLOR_ONLY = 'color_only',      // Just show colored cell
  MINIMAL = 'minimal',            // Show HH:MM
  FULL = 'full'                   // Show HH:MM:SS
}

const ClockHeatmap = ({
  width = 1200,
  height = 900,
  colorScheme = 'default'
}: ClockHeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(15);
  const [hoveredClock, setHoveredClock] = useState<{ x: number, y: number, time: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Convert time to seconds since midnight (mod 12 hours)
  const timeToSeconds = (time: Date): number => {
    const hours = time.getHours() % 12;
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    return hours * 3600 + minutes * 60 + seconds;
  };

  // Convert seconds to time string
  const secondsToTimeString = (totalSeconds: number, mode: ClockDisplayMode = ClockDisplayMode.FULL): string => {
    const hours = Math.floor(totalSeconds / 3600) % 12;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Format with hours, minutes, and seconds with consistent width
    const displayHours = hours === 0 ? 12 : hours;

    if (mode === ClockDisplayMode.MINIMAL) {
      return `${displayHours}:${minutes.toString().padStart(2, '0')}`;
    }

    return `${displayHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate "correctness" value - how close a clock is to being right
  // Returns 1 for correct clocks, 0 for maximally wrong (6 hours off)
  const getCorrectness = (clockSeconds: number, currentSeconds: number): number => {
    const diff = Math.abs(clockSeconds - currentSeconds);
    const wrappedDiff = Math.min(diff, TOTAL_SECONDS - diff);
    const maxDiff = TOTAL_SECONDS / 2; // 6 hours in seconds

    return 1 - wrappedDiff / maxDiff;
  };

  // Get color based on correctness value and selected color scheme
  const getColor = (correctness: number, scheme: string): string => {
    if (correctness > 0.999) {
      // The clock is correct (allowing for tiny rounding errors)
      return 'rgb(255, 255, 255)';
    }

    switch(scheme) {
      case 'rainbow':
        const hue = correctness * 240; // Blue (240) to Red (0)
        return `hsl(${hue}, 100%, ${50 + correctness * 50}%)`;
      case 'greyscale':
        const brightness = Math.floor(correctness * 255);
        return `rgb(${brightness}, ${brightness}, ${brightness})`;
      case 'default':
      default:
        // Cool blues for low correctness to warm reds for high correctness
        const r = Math.floor(255 * Math.pow(correctness, 0.8));
        const g = Math.floor(70 * Math.pow(correctness, 2));
        const b = Math.floor(255 * Math.pow(1 - correctness, 0.5));
        return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Helper function for HSL to RGB conversion
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  // Get display mode based on cell size
  const getDisplayMode = (cellWidth: number, cellHeight: number): ClockDisplayMode => {
    if (cellWidth >= MIN_CLOCK_SIZE && cellHeight >= MIN_CLOCK_SIZE * 0.75) {
      return ClockDisplayMode.FULL;
    } else if (cellWidth >= MIN_CLOCK_SIZE * 0.6 && cellHeight >= MIN_CLOCK_SIZE * 0.5) {
      return ClockDisplayMode.MINIMAL;
    } else {
      return ClockDisplayMode.COLOR_ONLY;
    }
  };

  // Get grid position from canvas coordinates
  const getGridPositionFromCanvas = (canvasX: number, canvasY: number): { x: number, y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (canvasX - rect.left) * scaleX;
    const y = (canvasY - rect.top) * scaleY;

    if (isZoomed) {
      // In zoomed mode, calculate based on zoom position and level
      const viewWidth = canvas.width / zoomLevel;
      const viewHeight = canvas.height / zoomLevel;
      const startX = Math.max(0, Math.min(GRID_WIDTH - viewWidth, zoomPosition.x - viewWidth / 2));
      const startY = Math.max(0, Math.min(GRID_HEIGHT - viewHeight, zoomPosition.y - viewHeight / 2));

      const pixelSize = Math.min(canvas.width / viewWidth, canvas.height / viewHeight);
      const gridX = startX + x / pixelSize;
      const gridY = startY + y / pixelSize;

      return {
        x: Math.floor(gridX),
        y: Math.floor(gridY)
      };
    } else {
      // In normal mode
      const pixelWidth = canvas.width / GRID_WIDTH;
      const pixelHeight = canvas.height / GRID_HEIGHT;

      return {
        x: Math.floor(x / pixelWidth),
        y: Math.floor(y / pixelHeight)
      };
    }
  };

  // Draw a single clock cell with appropriate styling and content based on display mode
  const drawClockCell = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    clockSeconds: number,
    currentSeconds: number,
    displayMode: ClockDisplayMode
  ) => {
    const correctness = getCorrectness(clockSeconds, currentSeconds);
    const isCorrect = correctness > 0.999;

    // Determine background color
    let bgColor: string;
    if (isCorrect) {
      bgColor = 'rgba(255, 255, 255, 0.9)'; // White for correct clocks
    } else {
      // Use a dark background for all non-correct clocks
      bgColor = 'rgba(0, 0, 0, 0.85)';
    }

    // Draw clock background with rounded corners
    const cornerRadius = Math.max(2, Math.min(4, width * 0.1));
    ctx.fillStyle = bgColor;

    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + width - cornerRadius, y);
    ctx.arcTo(x + width, y, x + width, y + cornerRadius, cornerRadius);
    ctx.lineTo(x + width, y + height - cornerRadius);
    ctx.arcTo(x + width, y + height, x + width - cornerRadius, y + height, cornerRadius);
    ctx.lineTo(x + cornerRadius, y + height);
    ctx.arcTo(x, y + height, x, y + height - cornerRadius, cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.arcTo(x, y, x + cornerRadius, y, cornerRadius);
    ctx.closePath();
    ctx.fill();

    // Draw time text if appropriate for the display mode
    if (displayMode !== ClockDisplayMode.COLOR_ONLY) {
      const timeStr = secondsToTimeString(clockSeconds, displayMode);

      // Calculate optimal font size based on cell size and display mode
      const fontMultiplier = displayMode === ClockDisplayMode.MINIMAL ? 0.12 : 0.11;
      const fontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, width * fontMultiplier));

      // Set text properties
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Set text color (black on white, white on dark)
      ctx.fillStyle = isCorrect ? 'black' : 'white';

      // Draw the time centered in the cell
      ctx.fillText(
        timeStr,
        x + width / 2,
        y + height / 2
      );
    } else if (width >= 4 && height >= 4) {
      // For very small cells, just show a colored indicator of correctness
      // Calculate a suitable inner indicator size
      const indicatorSize = Math.min(width, height) * 0.5;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // Use a colored dot to indicate correctness
      const indicatorColor = getClockColorForIndicator(correctness, colorScheme);
      ctx.fillStyle = indicatorColor;

      // Draw a small circle or square
      if (indicatorSize >= 3) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, indicatorSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // For very tiny cells, just fill a small centered rect
        ctx.fillRect(
          centerX - indicatorSize / 2,
          centerY - indicatorSize / 2,
          indicatorSize,
          indicatorSize
        );
      }
    }

    // Add a colored border to indicate correctness
    if (isCorrect) {
      // Highlight correct clocks with yellow
      ctx.strokeStyle = 'rgba(255, 220, 0, 0.9)';
      ctx.lineWidth = Math.max(2, width * 0.05);
    } else {
      // For non-correct clocks, use a border that gets brighter with correctness
      const intensity = 0.3 + correctness * 0.6;
      ctx.strokeStyle = `rgba(80, 80, 80, ${intensity})`;
      ctx.lineWidth = Math.max(1, width * 0.02);
    }

    ctx.stroke();
  };

  // Get a color for the small indicator based on correctness
  const getClockColorForIndicator = (correctness: number, scheme: string): string => {
    // For tiny indicators, use more vibrant colors
    if (correctness > 0.999) {
      return 'rgb(255, 255, 255)'; // White for correct clocks
    }

    switch(scheme) {
      case 'rainbow':
        const hue = correctness * 240; // Blue (240) to Red (0)
        return `hsl(${hue}, 100%, 60%)`;
      case 'greyscale':
        const brightness = 30 + Math.floor(correctness * 70);
        return `rgb(${brightness}, ${brightness}, ${brightness})`;
      case 'default':
      default:
        // More vibrant version for small indicators
        const r = Math.floor(255 * Math.pow(correctness, 0.7));
        const g = Math.floor(100 * Math.pow(correctness, 1.5));
        const b = Math.floor(255 * Math.pow(1 - correctness, 0.4));
        return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Draw the heatmap on canvas
  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas dimensions are set correctly
    canvas.width = width;
    canvas.height = height;

    // Clear canvas with a dark background
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, width, height);

    // Get current time in seconds
    const currentSeconds = timeToSeconds(currentTime);

    if (isZoomed) {
      // Zoomed view
      const viewWidth = Math.ceil(canvas.width / zoomLevel);
      const viewHeight = Math.ceil(canvas.height / zoomLevel);

      // Calculate the starting grid position to ensure we center on zoomPosition
      const startX = Math.max(0, Math.min(GRID_WIDTH - viewWidth, zoomPosition.x - viewWidth / 2));
      const startY = Math.max(0, Math.min(GRID_HEIGHT - viewHeight, zoomPosition.y - viewHeight / 2));

      // Calculate cell dimensions
      const cellWidth = canvas.width / viewWidth;
      const cellHeight = canvas.height / viewHeight;

      // Determine display mode based on cell size
      const displayMode = getDisplayMode(cellWidth, cellHeight);

      // Calculate actual cell dimensions with padding
      const actualCellWidth = cellWidth * (1 - CELL_PADDING_PERCENT);
      const actualCellHeight = cellHeight * (1 - CELL_PADDING_PERCENT);
      const paddingX = (cellWidth - actualCellWidth) / 2;
      const paddingY = (cellHeight - actualCellHeight) / 2;

      // Draw grid lines if cells are big enough
      if (cellWidth >= 8 && cellHeight >= 8) {
        ctx.strokeStyle = 'rgba(40, 40, 40, 0.5)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= viewWidth; x++) {
          ctx.beginPath();
          ctx.moveTo(x * cellWidth, 0);
          ctx.lineTo(x * cellWidth, canvas.height);
          ctx.stroke();
        }

        for (let y = 0; y <= viewHeight; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * cellHeight);
          ctx.lineTo(canvas.width, y * cellHeight);
          ctx.stroke();
        }
      }

      // Draw the visible portion of the grid at zoomed level
      for (let y = 0; y < viewHeight && y + startY < GRID_HEIGHT; y++) {
        for (let x = 0; x < viewWidth && x + startX < GRID_WIDTH; x++) {
          const gridX = Math.floor(startX + x);
          const gridY = Math.floor(startY + y);

          // Skip if out of bounds
          if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) continue;

          const clockSeconds = gridY * GRID_WIDTH + gridX;

          // Calculate position with padding
          const posX = x * cellWidth + paddingX;
          const posY = y * cellHeight + paddingY;

          // Draw the clock cell
          drawClockCell(
            ctx,
            posX,
            posY,
            actualCellWidth,
            actualCellHeight,
            clockSeconds,
            currentSeconds,
            displayMode
          );
        }
      }

      // Display hover information if available
      if (hoveredClock) {
        const clockSeconds = hoveredClock.y * GRID_WIDTH + hoveredClock.x;
        const clockTime = secondsToTimeString(clockSeconds);
        const correctness = getCorrectness(clockSeconds, currentSeconds);

        // Create an enhanced tooltip
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(10, height - 40, 350, 30);
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        // Format the correctness as a percentage
        const correctnessPercent = Math.round(correctness * 100);

        ctx.fillText(
          `Clock (${hoveredClock.x}, ${hoveredClock.y}): ${clockTime} | ${correctnessPercent}% correct`,
          20,
          height - 25
        );
      }

      // Draw zoom out button
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(width - 110, 10, 100, 40);
      ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
      ctx.fillRect(width - 100, 20, 80, 25);
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Zoom Out', width - 60, 32);

    } else {
      // Normal view - draw a grid of mini-clocks
      const cellWidth = width / GRID_WIDTH;
      const cellHeight = height / GRID_HEIGHT;

      // Determine if we should draw cell borders
      const drawBorders = cellWidth >= 3 && cellHeight >= 3;

      // Calculate cell dimensions with minimal padding
      const padding = drawBorders ? 0.5 : 0.2;
      const actualCellWidth = Math.max(1, cellWidth * (1 - padding));
      const actualCellHeight = Math.max(1, cellHeight * (1 - padding));
      const paddingX = (cellWidth - actualCellWidth) / 2;
      const paddingY = (cellHeight - actualCellHeight) / 2;

      // Draw each clock as a mini cell
      for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          const clockSeconds = y * GRID_WIDTH + x;
          const correctness = getCorrectness(clockSeconds, currentSeconds);

          // Calculate position
          const posX = x * cellWidth + paddingX;
          const posY = y * cellHeight + paddingY;

          // For the normal view, use a simpler rendering that's still visually clear
          if (correctness > 0.999) {
            // Draw correct clocks as white with yellow border
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(posX, posY, actualCellWidth, actualCellHeight);

            if (drawBorders) {
              ctx.strokeStyle = 'rgba(255, 220, 0, 0.9)';
              ctx.lineWidth = 1;
              ctx.strokeRect(posX, posY, actualCellWidth, actualCellHeight);
            }
          } else {
            // Draw other clocks with a colored fill based on correctness
            let fillColor: string;

            if (colorScheme === 'rainbow') {
              const hue = correctness * 240; // Blue (240) to Red (0)
              fillColor = `hsl(${hue}, 100%, ${40 + correctness * 30}%)`;
            } else if (colorScheme === 'greyscale') {
              const brightness = Math.floor(20 + correctness * 70);
              fillColor = `rgb(${brightness}, ${brightness}, ${brightness})`;
            } else {
              // Default color scheme
              const r = Math.floor(255 * Math.pow(correctness, 0.8));
              const g = Math.floor(70 * Math.pow(correctness, 2));
              const b = Math.floor(255 * Math.pow(1 - correctness, 0.5));
              fillColor = `rgb(${r}, ${g}, ${b})`;
            }

            ctx.fillStyle = fillColor;
            ctx.fillRect(posX, posY, actualCellWidth, actualCellHeight);

            if (drawBorders) {
              // Add subtle borders with brighter borders for more correct clocks
              const intensity = 0.2 + correctness * 0.3;
              ctx.strokeStyle = `rgba(60, 60, 60, ${intensity})`;
              ctx.lineWidth = 0.5;
              ctx.strokeRect(posX, posY, actualCellWidth, actualCellHeight);
            }
          }
        }
      }

      // Add zoom instructions
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(10, 10, 250, 30);
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click to zoom in and see clock times', 20, 25);
    }
  };

  // Handle canvas click events
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking the zoom out button
    if (isZoomed && x > width - 100 && x < width - 20 && y > 20 && y < 45) {
      setIsZoomed(false);
      setHoveredClock(null);
      return;
    }

    // Get grid position
    const gridPos = getGridPositionFromCanvas(e.clientX, e.clientY);

    if (isZoomed) {
      // If already zoomed, update position
      setZoomPosition(gridPos);
      // Increase zoom level if not already at maximum
      if (zoomLevel < MAX_ZOOM_LEVEL) {
        setZoomLevel(Math.min(MAX_ZOOM_LEVEL, zoomLevel + 5)); // Zoom in more
      }
    } else {
      // Zoom in to this position
      setZoomPosition(gridPos);
      setIsZoomed(true);
    }
  };

  // Handle mouse movement for hover effects
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isZoomed) return;

    if (isDragging) {
      // Handle dragging (panning the view)
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      const rect = canvas.getBoundingClientRect();
      const scaleX = GRID_WIDTH / rect.width;
      const scaleY = GRID_HEIGHT / rect.height;

      // Update zoom position based on drag distance - allow panning across the entire grid
      setZoomPosition({
        x: Math.max(0, Math.min(GRID_WIDTH, zoomPosition.x - dx * scaleX)),
        y: Math.max(0, Math.min(GRID_HEIGHT, zoomPosition.y - dy * scaleY))
      });

      // Update drag start
      setDragStart({ x: e.clientX, y: e.clientY });

    } else {
      // Handle hover to display clock info
      const gridPos = getGridPositionFromCanvas(e.clientX, e.clientY);

      if (gridPos.x >= 0 && gridPos.x < GRID_WIDTH && gridPos.y >= 0 && gridPos.y < GRID_HEIGHT) {
        const clockSeconds = gridPos.y * GRID_WIDTH + gridPos.x;
        const clockTime = secondsToTimeString(clockSeconds);

        setHoveredClock({
          x: gridPos.x,
          y: gridPos.y,
          time: clockTime
        });
      } else {
        setHoveredClock(null);
      }
    }
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isZoomed) return;

    // Don't start drag if clicking the zoom out button
    if (e.clientX > width - 110 && e.clientX < width - 10 && e.clientY < 45) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });

    // Change cursor style
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'grabbing';
    }
  };

  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);

    // Reset cursor style
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = isZoomed ? 'grab' : 'pointer';
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredClock(null);
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isZoomed) return;

    e.preventDefault();

    if (e.ctrlKey) {
      // Pinch to zoom gesture
      const zoomDirection = e.deltaY < 0 ? 1 : -1;
      const newZoomLevel = Math.max(5, Math.min(MAX_ZOOM_LEVEL, zoomLevel + zoomDirection * 2));
      setZoomLevel(newZoomLevel);
    } else {
      // Normal wheel - pan
      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = GRID_WIDTH / rect.width;
      const scaleY = GRID_HEIGHT / rect.height;

      // Pan amount - increase to allow panning across the entire grid
      const moveX = e.deltaX * scaleX * 0.5;
      const moveY = e.deltaY * scaleY * 0.5;

      // Update position (panning) - allow panning across the entire grid
      setZoomPosition({
        x: Math.max(0, Math.min(GRID_WIDTH, zoomPosition.x + moveX)),
        y: Math.max(0, Math.min(GRID_HEIGHT, zoomPosition.y + moveY))
      });
    }
  };

  // Handle key presses for keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isZoomed) return;

    const panAmount = 5; // Fixed pan speed that doesn't depend on zoom level

    switch (e.key) {
      case 'ArrowLeft':
        setZoomPosition({
          x: Math.max(0, zoomPosition.x - panAmount),
          y: zoomPosition.y
        });
        e.preventDefault();
        break;
      case 'ArrowRight':
        setZoomPosition({
          x: Math.min(GRID_WIDTH, zoomPosition.x + panAmount),
          y: zoomPosition.y
        });
        e.preventDefault();
        break;
      case 'ArrowUp':
        setZoomPosition({
          x: zoomPosition.x,
          y: Math.max(0, zoomPosition.y - panAmount)
        });
        e.preventDefault();
        break;
      case 'ArrowDown':
        setZoomPosition({
          x: zoomPosition.x,
          y: Math.min(GRID_HEIGHT, zoomPosition.y + panAmount)
        });
        e.preventDefault();
        break;
      case '+':
      case '=': // plus key on most keyboards
        setZoomLevel(Math.min(MAX_ZOOM_LEVEL, zoomLevel + 2));
        e.preventDefault();
        break;
      case '-':
      case '_': // minus key on most keyboards
        setZoomLevel(Math.max(5, zoomLevel - 2));
        e.preventDefault();
        break;
      case 'Escape':
        setIsZoomed(false);
        e.preventDefault();
        break;
      default:
        break;
    }
  };

  // Effect for handling resize and initial setup
  useEffect(() => {
    // Initial draw
    drawHeatmap();

    // Handle window resize if needed
    const handleResize = () => {
      drawHeatmap();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [width, height, colorScheme, isZoomed, zoomPosition, zoomLevel, hoveredClock]);

  // Effect for updating time
  useEffect(() => {
    // Initial draw
    drawHeatmap();

    // Update the time every second
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
      drawHeatmap(); // Explicitly call drawHeatmap here to ensure it runs
    }, 1000);

    return () => clearInterval(intervalId);
  }, [colorScheme, isZoomed, zoomPosition, zoomLevel]); // Only re-setup the interval when these change

  // Effect for redrawing when time changes
  useEffect(() => {
    drawHeatmap();
  }, [currentTime]);

  return (
    <div className="relative" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`rounded-lg shadow-lg ${isZoomed ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'}`}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
        {currentTime.toLocaleTimeString()}
      </div>
      {isZoomed && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
          <p>
            <kbd className="px-2 py-1 bg-zinc-800 rounded">Arrow Keys</kbd> to pan •
            <kbd className="ml-1 px-2 py-1 bg-zinc-800 rounded">+/-</kbd> to zoom
          </p>
        </div>
      )}
    </div>
  );
};

export default ClockHeatmap;
