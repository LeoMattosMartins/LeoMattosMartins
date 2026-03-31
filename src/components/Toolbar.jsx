import { useTranslation } from 'react-i18next';

const Toolbar = ({ theme, soundEnabled, onThemeCycle, onContrast, onSoundToggle }) => {
  const { t } = useTranslation();
  const modeLabel = theme === 'dark' ? t('toolbar.lightMode') : t('toolbar.darkMode');

  return (
    <div className="toolbar-dock fixed z-40 flex items-center gap-2">
      <button type="button" onClick={onThemeCycle} className="toolbar-btn" aria-label={t('toolbar.toggleTheme')}>
        {modeLabel}
      </button>
      <button
        type="button"
        onClick={onContrast}
        className={`toolbar-btn ${theme === 'contrast' ? 'ring-2 ring-current' : ''}`}
        aria-label={t('toolbar.toggleContrast')}
      >
        {t('toolbar.contrast')}
      </button>
      <button type="button" onClick={onSoundToggle} className="toolbar-btn" aria-label={t('toolbar.toggleSound')}>
        {soundEnabled ? t('toolbar.soundOff') : t('toolbar.soundOn')}
      </button>
    </div>
  );
};

export default Toolbar;
