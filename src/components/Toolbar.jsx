const Toolbar = ({ theme, onThemeCycle, onContrast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
      <button type="button" onClick={onThemeCycle} className="toolbar-btn" aria-label="Toggle theme">
        ☼/☾
      </button>
      <button
        type="button"
        onClick={onContrast}
        className={`toolbar-btn ${theme === 'contrast' ? 'ring-2 ring-current' : ''}`}
        aria-label="Toggle high contrast"
      >
        Contrast
      </button>
    </div>
  );
};

export default Toolbar;
