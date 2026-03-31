import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useTranslation } from 'react-i18next';
import 'xterm/css/xterm.css';

import { fetchGitHubProjects } from '../services/githubService';
import { useAppContext } from '../context/AppContext';
import ProjectsPortal from './ProjectsPortal';

const themeMap = {
  dark: {
    background: '#000033',
    foreground: '#F5F5F5',
    cursor: '#0000FF'
  },
  light: {
    background: '#F5F5F5',
    foreground: '#000033',
    cursor: '#ADD8E6'
  },
  contrast: {
    background: '#000000',
    foreground: '#FFFFFF',
    cursor: '#FFFFFF'
  }
};

const nextLanguage = (current) => {
  if (current === 'en-GB') return 'pt-BR';
  if (current === 'pt-BR') return 'es-ES';
  return 'en-GB';
};

const ANSI = {
  reset: '\u001b[0m',
  cyan: '\u001b[36m',
  red: '\u001b[31m'
};

const OUTPUT_STORAGE_KEY = 'leo_terminal_output_v1';
const COMMAND_HISTORY_STORAGE_KEY = 'leo_terminal_command_history_v1';
const COMMANDS = ['help', 'projects', 'work', 'resume', 'lang', 'clear'];

const color = (text, tone) => `${ANSI[tone]}${text}${ANSI.reset}`;

const TerminalShell = ({ theme, onClearTrigger }) => {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const commandHistoryRef = useRef([]);
  const historyCursorRef = useRef(-1);
  const outputLinesRef = useRef([]);

  const { t, i18n } = useTranslation();
  const { dispatch } = useAppContext();

  const [projects, setProjects] = useState([]);
  const [projectsVisible, setProjectsVisible] = useState(false);
  const [commandInput, setCommandInput] = useState('');

  const prompt = useMemo(() => `${t('terminal.prompt')} `, [t]);

  const autocompleteSuffix = useMemo(() => {
    const query = commandInput.trim().toLowerCase();
    if (!query) return '';

    const match = COMMANDS.find((item) => item.startsWith(query));
    if (!match || match === query) return '';

    return match.slice(query.length);
  }, [commandInput]);

  const persistOutput = useCallback(() => {
    try {
      const clipped = outputLinesRef.current.slice(-600);
      localStorage.setItem(OUTPUT_STORAGE_KEY, JSON.stringify(clipped));
    } catch (_error) {
      // no-op
    }
  }, []);

  const persistCommandHistory = useCallback(() => {
    try {
      const clipped = commandHistoryRef.current.slice(-200);
      localStorage.setItem(COMMAND_HISTORY_STORAGE_KEY, JSON.stringify(clipped));
    } catch (_error) {
      // no-op
    }
  }, []);

  const writeln = useCallback((line = '') => {
    outputLinesRef.current.push(line);
    persistOutput();
    terminalRef.current?.writeln(line);
  }, [persistOutput]);

  const printHelp = useCallback(() => {
    writeln('');
    writeln(color(t('terminal.helpBlurbTitle'), 'cyan'));
    writeln(t('terminal.helpBlurbBody'));
    writeln(t('terminal.helpUsageHistory'));
    writeln(t('terminal.helpUsageAutocomplete'));
    writeln(t('terminal.helpUsageAccessibility'));
    writeln('');
    writeln(color(t('terminal.helpHeader'), 'cyan'));
    writeln(`help            ${t('commands.help')}`);
    writeln(`projects        ${t('commands.projects')}`);
    writeln(`work            ${t('commands.work')}`);
    writeln(`resume          ${t('commands.resume')}`);
    writeln(`lang            ${t('commands.lang')}`);
    writeln(`clear           ${t('commands.clear')}`);
  }, [t, writeln]);

  const printWork = useCallback(() => {
    const entries = t('work.entries', { returnObjects: true });

    writeln(color(t('terminal.workHeading'), 'cyan'));
    writeln(t('terminal.loadingWork'));

    if (!Array.isArray(entries)) {
      return;
    }

    entries.forEach((entry) => {
      writeln('');
      writeln(`${color(entry.company, 'cyan')} — ${entry.title}`);
      entry.bullets.slice(0, 3).forEach((bullet) => {
        writeln(`  - ${bullet}`);
      });
    });
  }, [t, writeln]);

  const printProjects = useCallback(async () => {
    writeln(color(t('terminal.loadingProjects'), 'cyan'));

    try {
      const data = await fetchGitHubProjects(i18n.language);
      setProjects(data);
      setProjectsVisible(true);
      writeln(color(t('terminal.projectsLoaded', { count: data.length }), 'cyan'));
    } catch (_error) {
      writeln(color(t('terminal.githubUnavailable'), 'red'));
      setProjects([]);
      setProjectsVisible(false);
    }
  }, [i18n.language, t, writeln]);

  const execute = useCallback(
    async (rawValue) => {
      const command = rawValue.trim().toLowerCase();

      dispatch({ type: 'PUSH_HISTORY', payload: command });
      if (command) {
        commandHistoryRef.current.push(command);
        historyCursorRef.current = -1;
        persistCommandHistory();
        writeln(`${prompt}${color(command, 'cyan')}`);
      }

      switch (command) {
        case 'help':
          printHelp();
          break;
        case 'projects':
          await printProjects();
          break;
        case 'work':
          printWork();
          break;
        case 'resume':
          window.open(`${import.meta.env.BASE_URL}resume.pdf`, '_blank', 'noopener,noreferrer');
          writeln(color(t('terminal.openingResume'), 'cyan'));
          break;
        case 'lang': {
          const language = nextLanguage(i18n.language);
          await i18n.changeLanguage(language);
          dispatch({ type: 'SET_LANGUAGE', payload: language });
          writeln(color(t('terminal.languageSwitched', { lang: language }), 'cyan'));
          break;
        }
        case 'clear':
          terminalRef.current?.clear();
          outputLinesRef.current = [];
          persistOutput();
          setProjects([]);
          setProjectsVisible(false);
          onClearTrigger();
          break;
        case '':
          break;
        default:
          writeln(color(`${t('terminal.unknown')}: ${command}`, 'red'));
      }

      inputRef.current?.focus();
    },
    [
      dispatch,
      i18n,
      onClearTrigger,
      printHelp,
      printProjects,
      printWork,
      persistCommandHistory,
      persistOutput,
      prompt,
      setProjectsVisible,
      t,
      writeln
    ]
  );

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'Monocraft, monospace',
      fontSize: 18,
      theme: themeMap[theme],
      disableStdin: true,
      allowTransparency: true,
      scrollback: 3000
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    inputRef.current?.focus();

    try {
      const savedOutput = localStorage.getItem(OUTPUT_STORAGE_KEY);
      const parsedOutput = savedOutput ? JSON.parse(savedOutput) : [];
      if (Array.isArray(parsedOutput)) {
        outputLinesRef.current = parsedOutput;
        parsedOutput.forEach((line) => terminal.writeln(line));
      }

      const savedHistory = localStorage.getItem(COMMAND_HISTORY_STORAGE_KEY);
      const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
      if (Array.isArray(parsedHistory)) {
        commandHistoryRef.current = parsedHistory;
      }
    } catch (_error) {
      outputLinesRef.current = [];
      commandHistoryRef.current = [];
    }

    if (outputLinesRef.current.length === 0) {
      writeln(t('boot.ready'));
      writeln(t('boot.hint'));
    }

    const onResize = () => fitAddon.fit();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      terminal.dispose();
    };
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.theme = themeMap[theme];
  }, [theme]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await execute(commandInput);
    setCommandInput('');
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      setProjectsVisible(false);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      const query = commandInput.trim().toLowerCase();
      if (!query) return;

      const match = COMMANDS.find((item) => item.startsWith(query));
      if (match) {
        setCommandInput(match);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!commandHistoryRef.current.length) return;

      if (historyCursorRef.current === -1) {
        historyCursorRef.current = commandHistoryRef.current.length - 1;
      } else {
        historyCursorRef.current = Math.max(0, historyCursorRef.current - 1);
      }

      setCommandInput(commandHistoryRef.current[historyCursorRef.current] ?? '');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!commandHistoryRef.current.length) return;

      if (historyCursorRef.current === -1) return;

      if (historyCursorRef.current >= commandHistoryRef.current.length - 1) {
        historyCursorRef.current = -1;
        setCommandInput('');
        return;
      }

      historyCursorRef.current += 1;
      setCommandInput(commandHistoryRef.current[historyCursorRef.current] ?? '');
    }
  };

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden" onClick={() => inputRef.current?.focus()}>
      <div ref={containerRef} className="h-full w-full" />
      <ProjectsPortal projects={projects} visible={projectsVisible} />
      <form className="terminal-input-wrap" onSubmit={handleSubmit}>
        <label htmlFor="terminal-input" className="terminal-prompt-label">
          {prompt.trim()}
        </label>
        <div className="terminal-input-shell">
          <input
            id="terminal-input"
            ref={inputRef}
            value={commandInput}
            onChange={(event) => {
              historyCursorRef.current = -1;
              setCommandInput(event.target.value);
            }}
            onKeyDown={handleInputKeyDown}
            aria-label={t('terminal.inputAria')}
            className="terminal-input"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {autocompleteSuffix ? (
            <div className="terminal-input-ghost" aria-hidden="true">
              <span className="terminal-input-typed">{commandInput}</span>
              <span className="terminal-input-suffix">{autocompleteSuffix}</span>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
};

export default TerminalShell;
