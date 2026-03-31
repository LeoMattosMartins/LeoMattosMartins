import { useTranslation } from 'react-i18next';
import { asciiContact, asciiPortrait } from '../data/asciiPortrait';

const AsciiHeader = ({ hidden }) => {
  const { t } = useTranslation();

  return (
    <header className={`w-full px-4 py-3 ${hidden ? 'hidden' : 'block'}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <pre className="leading-none tracking-tight font-mono text-[10px] md:text-[13px]">
          {asciiPortrait}
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
