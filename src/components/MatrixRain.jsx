import { useEffect, useRef } from 'react';

const RAIN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-?';

const randomGlyph = () => {
  const index = Math.floor(Math.random() * RAIN_CHARS.length);
  return RAIN_CHARS[index];
};

const MatrixRain = ({ active, theme, onDone }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const fontSize = Math.max(22, Math.floor(window.innerWidth / 58));
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array.from({ length: columns }, () => Math.random() * -100);

    const start = performance.now();
    let raf;

    const rainColor =
      theme === 'light' ? '#7dd3fc' : theme === 'contrast' ? '#FFFFFF' : '#5EEBFF';

    const draw = (timestamp) => {
      const elapsed = timestamp - start;
      const alpha = Math.max(0, 1 - elapsed / 2500);

      context.fillStyle =
        theme === 'light' ? 'rgba(245, 245, 245, 0.11)' : 'rgba(2, 12, 44, 0.18)';
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.font = `${fontSize}px Monocraft`;
      context.fillStyle = rainColor;

      for (let i = 0; i < drops.length; i += 1) {
        const text = randomGlyph();
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        context.globalAlpha = alpha;
        context.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.965) {
          drops[i] = 0;
        }

        drops[i] += 1.15;
      }

      context.globalAlpha = 1;

      if (elapsed >= 2500) {
        onDone();
        return;
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [active, onDone, theme]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50 transition-opacity duration-500"
      aria-hidden="true"
    />
  );
};

export default MatrixRain;
