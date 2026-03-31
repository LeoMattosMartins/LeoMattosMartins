import { useTranslation } from 'react-i18next';

const Toolbar = ({ theme, onThemeCycle, onContrast }) => {
  const { t } = useTranslation();

  return (
    <div className="toolbar-dock fixed z-40 flex items-center gap-2">
      <button type="button" onClick={onThemeCycle} className="toolbar-btn" aria-label={t('toolbar.toggleTheme')}>
        ☼/☾
      </button>
      <button
        type="button"
        onClick={onContrast}
        className={`toolbar-btn ${theme === 'contrast' ? 'ring-2 ring-current' : ''}`}
        aria-label={t('toolbar.toggleContrast')}
      >
        {t('toolbar.contrast')}
      </button>
    </div>
  );
};

export default Toolbar;
