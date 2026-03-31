import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { asciiContact, asciiPortrait } from '../data/asciiPortrait';

const AsciiHeader = ({ hidden }) => {
  const { t } = useTranslation();
  const portraitRef = useRef(null);
  const [eyeOffsetX, setEyeOffsetX] = useState(0);

  const portraitModel = useMemo(() => {
    const lines = asciiPortrait.split('\n');
    const eyes = [];

    lines.forEach((line, y) => {
      for (let x = 0; x < line.length; x += 1) {
        if (line[x] === '@') {
          eyes.push({ x, y });
        }
      }
    });

    return { lines, eyes };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!portraitRef.current) return;

      const rect = portraitRef.current.getBoundingClientRect();
      if (!rect.width) return;

      const relativeX = event.clientX - rect.left;
      const normalizedX = (relativeX / rect.width) * 2 - 1;
      setEyeOffsetX(Math.max(-1, Math.min(1, Math.round(normalizedX))));
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, []);

  const animatedPortrait = useMemo(() => {
    const matrix = portraitModel.lines.map((line) => line.split(''));

    portraitModel.eyes.forEach(({ x, y }) => {
      if (matrix[y] && matrix[y][x] === '@') {
        matrix[y][x] = ' ';
      }
    });

    portraitModel.eyes.forEach(({ x, y }) => {
      const lineLength = matrix[y]?.length ?? 0;
      if (!lineLength) return;

      const targetX = Math.max(0, Math.min(lineLength - 1, x + eyeOffsetX));
      matrix[y][targetX] = '@';
    });

    return matrix.map((line) => line.join('')).join('\n');
  }, [eyeOffsetX, portraitModel]);

  return (
    <header className={`w-full px-4 py-3 ${hidden ? 'hidden' : 'block'}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <pre ref={portraitRef} className="leading-none tracking-tight font-mono text-[10px] md:text-[13px]">
          {animatedPortrait}
        </pre>

        <div className="font-mono text-sm md:text-base">
          <p>{t('header.name')}</p>
          <p className="opacity-80">{t('header.role')}</p>
          <p>
            <a href="https://github.com/LeoMattosMartins" target="_blank" rel="noreferrer" className="underline">
              {asciiContact[1]}
            </a>
          </p>
          <p>
            <a href="https://linkedin.com/in/leonardomattosmartins" target="_blank" rel="noreferrer" className="underline">
              {asciiContact[2]}
            </a>
          </p>
        </div>
      </div>
    </header>
  );
};

export default AsciiHeader;
