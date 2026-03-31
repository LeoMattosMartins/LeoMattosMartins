import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AsciiHeader from './components/AsciiHeader';
import MatrixRain from './components/MatrixRain';
import TerminalShell from './components/TerminalShell';
import Toolbar from './components/Toolbar';
import { useAppContext } from './context/AppContext';

const THEMES = ['dark', 'light'];
const SOUND_PREF_STORAGE_KEY = 'leo_terminal_sound_enabled_v1';

const App = () => {
  const { i18n } = useTranslation();
  const { state, dispatch } = useAppContext();

  const [bootActive, setBootActive] = useState(true);
  const [mobileKeyboardOpen, setMobileKeyboardOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(SOUND_PREF_STORAGE_KEY);
      if (saved == null) return true;
      return saved === 'true';
    } catch (_error) {
      return true;
    }
  });

  const rootClass = useMemo(() => `theme-${state.theme}`, [state.theme]);

  useEffect(() => {
    dispatch({ type: 'SET_LANGUAGE', payload: i18n.language });
  }, [dispatch, i18n.language]);

  useEffect(() => {
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-contrast');
    document.documentElement.classList.add(rootClass);
  }, [rootClass]);

  useEffect(() => {
    if (!window.visualViewport) return undefined;

    const handleViewport = () => {
      const isOpen = window.visualViewport.height < window.innerHeight * 0.75;
      setMobileKeyboardOpen(isOpen);
    };

    window.visualViewport.addEventListener('resize', handleViewport);
    handleViewport();

    return () => window.visualViewport.removeEventListener('resize', handleViewport);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SOUND_PREF_STORAGE_KEY, String(soundEnabled));
    } catch (_error) {
      // no-op
    }
  }, [soundEnabled]);

  const cycleTheme = () => {
    if (state.theme === 'contrast') {
      dispatch({ type: 'SET_THEME', payload: 'dark' });
      return;
    }

    const index = THEMES.indexOf(state.theme);
    const next = THEMES[(index + 1) % THEMES.length];
    dispatch({ type: 'SET_THEME', payload: next });
  };

  const toggleContrast = () => {
    dispatch({ type: 'SET_THEME', payload: state.theme === 'contrast' ? 'dark' : 'contrast' });
  };

  const toggleSound = () => {
    setSoundEnabled((current) => !current);
  };

  return (
    <main className="site-shell relative flex h-dvh flex-col overflow-hidden">
      <Toolbar
        theme={state.theme}
        soundEnabled={soundEnabled}
        onThemeCycle={cycleTheme}
        onContrast={toggleContrast}
        onSoundToggle={toggleSound}
      />

      <MatrixRain active={bootActive} theme={state.theme} onDone={() => setBootActive(false)} />

      <AsciiHeader hidden={mobileKeyboardOpen} />

      <TerminalShell
        theme={state.theme}
        soundEnabled={soundEnabled}
        onClearTrigger={() => {
          setBootActive(false);
          requestAnimationFrame(() => setBootActive(true));
          dispatch({ type: 'CLEAR_HISTORY' });
        }}
      />
    </main>
  );
};

export default App;
