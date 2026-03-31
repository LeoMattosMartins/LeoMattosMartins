import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useTranslation } from 'react-i18next';
import 'xterm/css/xterm.css';

import { fetchGitHubProjects } from '../services/githubService';
import { useAppContext } from '../context/AppContext';
import ProjectsPortal from './ProjectsPortal';
import readmeContent from '../../README.md?raw';

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
  underline: '\u001b[4m',
  cyan: '\u001b[38;2;127;177;255m',
  red: '\u001b[31m',
  pink: '\u001b[38;2;255;105;180m'
};

const OUTPUT_STORAGE_KEY = 'leo_terminal_output_v1';
const COMMAND_HISTORY_STORAGE_KEY = 'leo_terminal_command_history_v1';
const COMMANDS = ['help', 'projects', 'work', 'tech-stack', 'a11y', 'resume', 'lang', 'clear'];
const HELP_LINK_COMMANDS = ['help', 'projects', 'work', 'tech-stack', 'resume', 'clear', 'lang', 'a11y'];
const TYPE_BASE_DELAY_MS = 22;
const TYPE_VARIANCE_MS = 34;
const SECTION_PAUSE_MS = 240;
const LINE_END_PAUSE_MS = 90;
const PUNCTUATION_PAUSE_MS = 70;
const SOUND_COOLDOWN_MS = 36;
const AUTO_HELP_DELAY_MS = 1000;
const FALLBACK_LIBRARY_FRAMEWORK_LINES = [
  '* Languages & Databases: Python, C/C++, Go, Java, JavaScript, SQL, PostgreSQL, MongoDB',
  '* AI & Machine Learning: PyTorch, TensorFlow, JAX, Scikit-learn, TensorRT, LLMs (Llama), CUDA',
  '* Tools & Infrastructure: Docker, Kubernetes, Git, CI/CD, Linux, REST APIs, pandas, Agile/Scrum'
];

const color = (text, tone) => `${ANSI[tone]}${text}${ANSI.reset}`;
const commandLinkText = (text) => `${ANSI.cyan}${ANSI.underline}${text}${ANSI.reset}`;

const extractTechStackLines = (content) => {
  const techStackSection = content.match(/##\s+Tech Stack([\s\S]*?)(?:\n##\s|$)/i);
  const source = techStackSection?.[1] ?? content;
  const codeBlock = source.match(/```([\s\S]*?)```/);
  const block = (codeBlock?.[1] ?? source).trim();
  if (!block) return [];
  return block.split('\n').map((line) => line.replace(/\r/g, ''));
};

const extractLibraryFrameworkLines = (content) => {
  const section = content.match(/##\s+Libraries and Fram(?:e)?works([\s\S]*?)(?:\n##\s|$)/i);
  const source = section?.[1]?.trim();
  if (!source) return [];
  return source
    .split('\n')
    .map((line) => line.replace(/\r/g, '').trim())
    .filter(Boolean);
};

const isPhoneViewport = () => window.matchMedia('(max-width: 768px)').matches;

const TerminalShell = ({ theme, soundEnabled, onClearTrigger }) => {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);
  const commandHistoryRef = useRef([]);
  const historyCursorRef = useRef(-1);
  const outputLinesRef = useRef([]);
  const writeQueueRef = useRef(Promise.resolve());
  const writeTokenRef = useRef(0);
  const pendingWritesRef = useRef(0);
  const skipTypingRef = useRef(false);
  const muteTypingSoundRef = useRef(false);
  const audioContextRef = useRef(null);
  const lastSoundRef = useRef(0);

  const { t, i18n } = useTranslation();
  const { dispatch } = useAppContext();

  const [projects, setProjects] = useState([]);
  const [projectsVisible, setProjectsVisible] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const executeRef = useRef(null);
  const techStackLines = useMemo(() => extractTechStackLines(readmeContent), []);
  const libraryFrameworkLines = useMemo(() => extractLibraryFrameworkLines(readmeContent), []);

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

  const triggerHapticError = useCallback(() => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }

    navigator.vibrate([25, 35, 25]);
  }, []);

  const persistCommandHistory = useCallback(() => {
    try {
      const clipped = commandHistoryRef.current.slice(-200);
      localStorage.setItem(COMMAND_HISTORY_STORAGE_KEY, JSON.stringify(clipped));
    } catch (_error) {
      // no-op
    }
  }, []);

  const playTypingSound = useCallback(() => {
    try {
      const now = performance.now();
      if (now - lastSoundRef.current < SOUND_COOLDOWN_MS) {
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;
      if (!context) {
        return;
      }

      if (muteTypingSoundRef.current || !soundEnabled) {
        return;
      }

      if (context.state === 'suspended') {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startAt = context.currentTime;

      oscillator.type = 'square';
      oscillator.frequency.value = 130 + Math.random() * 110;

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.01, startAt + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.03);

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startAt);
      oscillator.stop(startAt + 0.032);
      lastSoundRef.current = now;
    } catch (_error) {
      // no-op
    }
  }, [soundEnabled]);

  const writeLine = useCallback((line, token) => {
    const terminal = terminalRef.current;

    if (!terminal || token !== writeTokenRef.current) {
      return Promise.resolve();
    }

    if (!line) {
      terminal.writeln(line);
      if (skipTypingRef.current) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        window.setTimeout(resolve, SECTION_PAUSE_MS);
      });
    }

    const segments = [];
    const ansiRegex = /\u001b\[[0-9;]*m/g;
    let cursor = 0;

    line.replaceAll(ansiRegex, (match, offset) => {
      if (offset > cursor) {
        segments.push({ type: 'text', value: line.slice(cursor, offset) });
      }
      segments.push({ type: 'ansi', value: match });
      cursor = offset + match.length;
      return match;
    });

    if (cursor < line.length) {
      segments.push({ type: 'text', value: line.slice(cursor) });
    }

    return new Promise((resolve) => {
      let segmentIndex = 0;
      let textIndex = 0;

      const step = () => {
        const activeTerminal = terminalRef.current;
        if (!activeTerminal || token !== writeTokenRef.current) {
          resolve();
          return;
        }

        if (segmentIndex >= segments.length) {
          activeTerminal.write('\r\n');
          window.setTimeout(resolve, LINE_END_PAUSE_MS);
          return;
        }

        const segment = segments[segmentIndex];
        if (segment.type === 'ansi') {
          activeTerminal.write(segment.value);
          segmentIndex += 1;
          textIndex = 0;
          step();
          return;
        }

        if (textIndex >= segment.value.length) {
          segmentIndex += 1;
          textIndex = 0;
          step();
          return;
        }

        const remaining = segment.value.length - textIndex;
        const maxChunk = skipTypingRef.current ? remaining : 1 + Math.floor(Math.random() * 3);
        const chunkSize = Math.min(remaining, maxChunk);
        const chunk = segment.value.slice(textIndex, textIndex + chunkSize);
        const lastChar = chunk[chunk.length - 1];

        activeTerminal.write(chunk);
        if (!skipTypingRef.current) {
          playTypingSound();
        }
        textIndex += chunkSize;

        let delay = 0;
        if (!skipTypingRef.current) {
          delay = TYPE_BASE_DELAY_MS + Math.random() * TYPE_VARIANCE_MS;
          if (lastChar && '.!,;:?'.includes(lastChar)) {
            delay += PUNCTUATION_PAUSE_MS;
          }
        }

        window.setTimeout(step, delay);
      };

      step();
    });
  }, [playTypingSound]);

  const writeln = useCallback(
    (line = '') => {
      outputLinesRef.current.push(line);
      persistOutput();
      pendingWritesRef.current += 1;

      const token = writeTokenRef.current;
      writeQueueRef.current = writeQueueRef.current.then(() => writeLine(line, token)).finally(() => {
        pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
        if (pendingWritesRef.current === 0) {
          skipTypingRef.current = false;
        }
      });
      return writeQueueRef.current;
    },
    [persistOutput, writeLine]
  );

  const printHelp = useCallback(() => {
    writeln('');
    writeln(color(t('terminal.helpBlurbTitle'), 'cyan'));
    writeln(t('terminal.helpBlurbBody'));
    writeln(t('terminal.helpUsageAutocomplete'));
    writeln(t('terminal.helpUsageHistory'));
    writeln(t('terminal.helpUsageSkip'));
    writeln(t('terminal.helpUsageAccessibility'));
    writeln('');
    writeln(color(t('terminal.helpHeader'), 'cyan'));
    writeln(`${commandLinkText('help')}            ${t('commands.help')}`);
    writeln(`${commandLinkText('projects')}        ${t('commands.projects')}`);
    writeln(`${commandLinkText('work')}            ${t('commands.work')}`);
    writeln(`${commandLinkText('tech-stack')}      ${t('commands.techStack')}`);
    writeln(`${commandLinkText('resume')}          ${t('commands.resume')}`);
    writeln(`${commandLinkText('clear')}           ${t('commands.clear')}`);
    writeln('');
    writeln(`${commandLinkText('lang')}            ${t('commands.lang')}`);
    writeln(`${commandLinkText('a11y')}            ${t('commands.a11y')}`);
  }, [t, writeln]);

  const printTechStack = useCallback(() => {
    writeln(color(t('terminal.techStackHeader'), 'cyan'));
    writeln('');
    if (!techStackLines.length) {
      writeln(t('terminal.techStackUnavailable'));
      return;
    }

    techStackLines.forEach((line) => {
      writeln(line);
    });

    const frameworkLines = libraryFrameworkLines.length ? libraryFrameworkLines : FALLBACK_LIBRARY_FRAMEWORK_LINES;
    if (frameworkLines.length) {
      writeln('');
      frameworkLines.forEach((line) => {
        writeln(line);
      });
    }
  }, [libraryFrameworkLines, t, techStackLines, writeln]);

  const printA11y = useCallback(() => {
    writeln(color(t('terminal.accessibilityHeader'), 'cyan'));
    writeln(t('terminal.helpUsageHistory'));
    writeln(t('terminal.helpUsageAutocomplete'));
    writeln(t('terminal.helpUsageSkip'));
    writeln(t('terminal.helpUsageAccessibility'));
    writeln(t('terminal.accessibilityHint'));
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
    async (rawValue, options = {}) => {
      const { recordHistory = true } = options;
      const command = rawValue.trim().toLowerCase();

      if (recordHistory) {
        dispatch({ type: 'PUSH_HISTORY', payload: command });
      }

      if (command && recordHistory) {
        commandHistoryRef.current.push(command);
        historyCursorRef.current = -1;
        persistCommandHistory();
      }

      if (command) {
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
        case 'techstack':
        case 'tech-stack':
          printTechStack();
          break;
        case 'a11y':
          printA11y();
          break;
        case 'resume':
          window.open(`${import.meta.env.BASE_URL}resume.pdf`, '_blank', 'noopener,noreferrer');
          writeln(color(t('terminal.openingResume'), 'cyan'));
          break;
        case 'urvi':
          writeln(color('<3', 'pink'));
          break;
        case 'lang': {
          const language = nextLanguage(i18n.language);
          await i18n.changeLanguage(language);
          dispatch({ type: 'SET_LANGUAGE', payload: language });

          writeTokenRef.current += 1;
          writeQueueRef.current = Promise.resolve();
          pendingWritesRef.current = 0;
          skipTypingRef.current = false;
          terminalRef.current?.clear();
          outputLinesRef.current = [];
          persistOutput();
          setProjects([]);
          setProjectsVisible(false);
          commandHistoryRef.current = [];
          historyCursorRef.current = -1;
          persistCommandHistory();
          dispatch({ type: 'CLEAR_HISTORY' });

          muteTypingSoundRef.current = true;
          await writeln(t('boot.ready'));
          await writeln(t('boot.hint'));
          muteTypingSoundRef.current = false;
          await new Promise((resolve) => {
            window.setTimeout(resolve, AUTO_HELP_DELAY_MS);
          });
          await execute('help', { recordHistory: false });
          break;
        }
        case 'clear':
          writeTokenRef.current += 1;
          writeQueueRef.current = Promise.resolve();
          pendingWritesRef.current = 0;
          skipTypingRef.current = false;
          terminalRef.current?.clear();
          outputLinesRef.current = [];
          persistOutput();
          commandHistoryRef.current = [];
          historyCursorRef.current = -1;
          persistCommandHistory();
          setProjects([]);
          setProjectsVisible(false);
          onClearTrigger();
          muteTypingSoundRef.current = true;
          await writeln(t('boot.ready'));
          await writeln(t('boot.hint'));
          muteTypingSoundRef.current = false;
          await new Promise((resolve) => {
            window.setTimeout(resolve, AUTO_HELP_DELAY_MS);
          });
          await execute('help', { recordHistory: false });
          await writeln('');
          break;
        case '':
          break;
        default:
          writeln(color(`${t('terminal.unknown')}: ${command}`, 'red'));
          triggerHapticError();
      }

      if (command && command !== 'clear') {
        await writeln('');
      }

      inputRef.current?.focus();
    },
    [
      dispatch,
      i18n,
      onClearTrigger,
      printHelp,
      printProjects,
      printA11y,
      printTechStack,
      printWork,
      persistCommandHistory,
      persistOutput,
      prompt,
      setProjectsVisible,
      t,
      triggerHapticError,
      writeln
    ]
  );

  useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  const runHelpAction = useCallback(async (command) => {
    setCommandInput(command);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 80);
    });
    setCommandInput('');
    if (executeRef.current) {
      await executeRef.current(command);
    }
  }, []);

  useEffect(() => {
    const mobile = isPhoneViewport();
    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'Monocraft, monospace',
      fontSize: mobile ? 14 : 18,
      lineHeight: mobile ? 1.2 : 1.1,
      theme: themeMap[theme],
      disableStdin: true,
      allowTransparency: true,
      scrollback: 3000
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    const helpCommandPattern = new RegExp(`^\\s*(${HELP_LINK_COMMANDS.join('|')})\\b`);
    const commandLinkProvider = terminal.registerLinkProvider({
      provideLinks: (lineNumber, callback) => {
        const line = terminal.buffer.active.getLine(lineNumber - 1);
        const text = line?.translateToString(true) ?? '';
        const match = text.match(helpCommandPattern);

        if (!match) {
          callback([]);
          return;
        }

        const command = match[1];
        const startIndex = text.indexOf(command);
        if (startIndex < 0) {
          callback([]);
          return;
        }

        callback([
          {
            text: command,
            range: {
              start: { x: startIndex + 1, y: lineNumber },
              end: { x: startIndex + command.length + 1, y: lineNumber }
            },
            activate: () => {
              void runHelpAction(command);
            }
          }
        ]);
      }
    });

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
      const bootstrap = async () => {
        muteTypingSoundRef.current = true;
        await writeln(t('boot.ready'));
        await writeln(t('boot.hint'));
        muteTypingSoundRef.current = false;
        await new Promise((resolve) => {
          window.setTimeout(resolve, AUTO_HELP_DELAY_MS);
        });
        await execute('help', { recordHistory: false });
      };
      bootstrap();
    }

    const onResize = () => {
      if (terminalRef.current) {
        const phone = isPhoneViewport();
        terminalRef.current.options.fontSize = phone ? 14 : 18;
        terminalRef.current.options.lineHeight = phone ? 1.2 : 1.1;
      }
      fitAddon.fit();
    };
    window.addEventListener('resize', onResize);

    return () => {
      writeTokenRef.current += 1;
      pendingWritesRef.current = 0;
      skipTypingRef.current = false;
      window.removeEventListener('resize', onResize);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      commandLinkProvider.dispose();
      terminal.dispose();
    };
  }, [runHelpAction]);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.theme = themeMap[theme];
  }, [theme]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const submittedCommand = commandInput;

    if (pendingWritesRef.current > 0) {
      skipTypingRef.current = true;
      if (!submittedCommand.trim()) {
        return;
      }
    }

    setCommandInput('');
    await execute(submittedCommand);
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
      <ProjectsPortal projects={projects} visible={projectsVisible} onClose={() => setProjectsVisible(false)} />
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
            aria-keyshortcuts="Enter ArrowUp ArrowDown Tab Escape"
            aria-describedby="terminal-shortcuts-hint"
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
        <span id="terminal-shortcuts-hint" className="sr-only">
          {t('terminal.helpUsageAutocomplete')} {t('terminal.helpUsageHistory')} {t('terminal.helpUsageSkip')}
        </span>
      </form>
    </section>
  );
};

export default TerminalShell;
