import { useState, useEffect, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { Header } from '../components/layout/Header';
import './FileView.css';

const ROOT_PATH = '/';
const HOME_ALIAS = '~';

const getFileStorageKey = (tenantId, key) => {
  const safeTenant = tenantId || 'default';
  return `fileView.${safeTenant}.${key}`;
};

const normalizeSegments = (segments = []) => {
  const stack = [];

  segments.forEach((segment) => {
    if (!segment || segment === '.') {
      return;
    }

    if (segment === '..') {
      if (stack.length > 0) {
        stack.pop();
      }
      return;
    }

    stack.push(segment);
  });

  return stack;
};

const buildPath = (prefix, segments) => {
  if (prefix === '/') {
    return segments.length ? `/${segments.join('/')}` : '/';
  }

  return segments.length ? `${HOME_ALIAS}/${segments.join('/')}` : HOME_ALIAS;
};

const parseBasePath = (path) => {
  if (!path || path === HOME_ALIAS) {
    return { prefix: HOME_ALIAS, segments: [] };
  }

  if (path === '/') {
    return { prefix: '/', segments: [] };
  }

  if (path.startsWith('~/')) {
    return { prefix: HOME_ALIAS, segments: path.slice(2).split('/').filter(Boolean) };
  }

  if (path.startsWith('/')) {
    return { prefix: '/', segments: path.slice(1).split('/').filter(Boolean) };
  }

  return { prefix: HOME_ALIAS, segments: path.split('/').filter(Boolean) };
};

const joinPaths = (base, target) => {
  if (!target || target === '.') {
    return base;
  }

  if (target === HOME_ALIAS) {
    return HOME_ALIAS;
  }

  if (target.startsWith('~/')) {
    const segments = target.slice(2).split('/').filter(Boolean);
    return buildPath(HOME_ALIAS, normalizeSegments(segments));
  }

  if (target.startsWith('/')) {
    const segments = target.slice(1).split('/').filter(Boolean);
    return buildPath('/', normalizeSegments(segments));
  }

  const { prefix, segments: baseSegments } = parseBasePath(base);
  const targetSegments = target.split('/').filter(Boolean);
  const normalized = normalizeSegments([...baseSegments, ...targetSegments]);

  return buildPath(prefix, normalized);
};

const normalizeForViewRoute = (path) => {
  if (!path) {
    return '';
  }

  let normalized = path;

  if (normalized === HOME_ALIAS) {
    normalized = ROOT_PATH;
  } else if (normalized.startsWith('~/')) {
    normalized = `${ROOT_PATH}${normalized.slice(2)}`;
  } else if (!normalized.startsWith('/')) {
    normalized = `${ROOT_PATH}${normalized}`;
  }

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized;
};

const getSchemaStorageKey = (tenantId, key) => {
  const safeTenant = tenantId || 'default';
  return `schemaView.${safeTenant}.${key}`;
};

const getViewTarget = (path) => {
  const normalizedPath = normalizeForViewRoute(path);

  if (!normalizedPath || normalizedPath === ROOT_PATH) {
    return null;
  }

  if (normalizedPath === '/data') {
    return { route: '/data' };
  }

  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length === 0 || segments[0] !== 'data') {
    return null;
  }

  if (segments.length === 2) {
    const schema = segments[1];
    if (!schema) {
      return null;
    }

    return {
      route: '/data',
      schema,
    };
  }

  if (segments.length === 3) {
    const schema = segments[1];
    let recordId = segments[2];

    if (!schema || !recordId) {
      return null;
    }

    if (recordId.endsWith('.json')) {
      recordId = recordId.slice(0, -5);
    }

    if (!recordId) {
      return null;
    }

    return {
      route: `/data/${schema}/${recordId}`,
    };
  }

  return null;
};

export function FileView() {
  const [command, setCommand] = useState('');
  const [cwd, setCwd] = useState(ROOT_PATH);
  const [ttyOutput, setTtyOutput] = useState('');
  const [jsonResponse, setJsonResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef(null);
  const inputId = useId();
  const navigate = useNavigate();
  const { tenant } = authService.getAuthData();

  useEffect(() => {
    if (typeof window === 'undefined') {
      inputRef.current?.focus();
      return;
    }

    const cwdKey = getFileStorageKey(tenant, 'cwd');
    try {
      const savedCwd = window.localStorage.getItem(cwdKey);
      if (savedCwd) {
        setCwd(savedCwd);
      } else {
        setCwd(ROOT_PATH);
      }
    } catch (err) {
      console.warn('Failed to restore file view cwd', err);
    }

    const historyKey = getFileStorageKey(tenant, 'history');
    try {
      const savedHistory = window.sessionStorage.getItem(historyKey);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.warn('Failed to restore file view history', err);
    }

    inputRef.current?.focus();
  }, [tenant]);

  const parseCommand = (input) => {
    const trimmed = input.trim();
    if (!trimmed) return { command: '', args: [] };
    
    const parts = trimmed.split(/\s+/);
    return {
      command: parts[0].toLowerCase(),
      args: parts.slice(1)
    };
  };

  const formatListOutput = (data) => {
    if (!data || !Array.isArray(data.entries)) {
      return '';
    }

    const entries = data.entries;

    if (entries.length === 0) {
      return '';
    }

    return entries
      .map((entry) => {
        const name = entry.name || '';
        const suffix = entry.file_type === 'd' ? '/' : '';
        return `${name}${suffix}`;
      })
      .join('\n');
  };

  const formatCatOutput = (data) => {
    if (!data) {
      return '';
    }

    const content = data.content;

    if (content === null || content === undefined) {
      return '';
    }

    if (typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    }

    return String(content);
  };

  const formatStatOutput = (data) => {
    if (!data) {
      return '';
    }

    const lines = [];

    if (data.path) {
      lines.push(`  File: ${data.path}`);
    }

    const size = data.size ?? data.file_metadata?.size;
    const type = data.type ?? data.file_metadata?.type;
    const permissions = data.permissions ?? data.file_metadata?.permissions;

    if (size !== undefined || type || permissions) {
      lines.push(
        `  Size: ${size ?? '-'}\tType: ${type ?? '-'}\tPerm: ${permissions ?? '-'}`
      );
    }

    if (data.modified_time) {
      lines.push(`  Modify: ${data.modified_time}`);
    }
    if (data.created_time) {
      lines.push(`  Create: ${data.created_time}`);
    }
    if (data.access_time) {
      lines.push(`  Access: ${data.access_time}`);
    }

    const info = data.record_info;
    if (info) {
      if (info.schema) {
        lines.push(`  Schema: ${info.schema}`);
      }
      if (info.record_id) {
        lines.push(`  Record: ${info.record_id}`);
      }
      if (info.access_permissions) {
        lines.push(`  Access: ${info.access_permissions.join(', ')}`);
      }
    }

    return lines.join('\n');
  };

  const executeCommand = async (input) => {
    if (loading) {
      inputRef.current?.focus();
      return;
    }

    const trimmedInput = input.trim();

    inputRef.current?.focus();

    if (!trimmedInput) {
      return;
    }


    const { command: cmd, args } = parseCommand(trimmedInput);

    if (!cmd) {
      return;
    }

    setError('');
    setTtyOutput('');
    setJsonResponse(null);

    const needsLoading = cmd === 'ls' || cmd === 'cat' || cmd === 'stat';
    setLoading(needsLoading);

    const currentCwd = cwd;
    let commandSuccess = false;

    try {
      switch (cmd) {
        case 'cd': {
          const target = args[0];
          const nextPath = target ? joinPaths(currentCwd, target) : ROOT_PATH;
          setCwd(nextPath);
          setTtyOutput('');
          setJsonResponse({ cwd: nextPath });
          commandSuccess = true;
          break;
        }

        case 'ls': {
          const target = args[0];
          const resolvedPath = joinPaths(currentCwd, target);
          const listData = await api.file.list(resolvedPath, currentCwd);
          setTtyOutput(formatListOutput(listData));
          setJsonResponse(listData);
          commandSuccess = true;
          break;
        }

        case 'cat': {
          if (args.length === 0) {
            throw new Error('cat: missing file operand');
          }
          const resolvedPath = joinPaths(currentCwd, args[0]);
          const catData = await api.file.read(resolvedPath, currentCwd);
          setTtyOutput(formatCatOutput(catData));
          setJsonResponse(catData);
          commandSuccess = true;
          break;
        }

        case 'stat': {
          if (args.length === 0) {
            throw new Error('stat: missing file operand');
          }
          const resolvedPath = joinPaths(currentCwd, args[0]);
          const statData = await api.file.stat(resolvedPath, currentCwd);
          setTtyOutput(formatStatOutput(statData));
          setJsonResponse(statData);
          commandSuccess = true;
          break;
        }

        case 'help': {
          const helpText = `Available commands:
  cd [path]     - Change directory
  ls [path]     - List directory contents
  cat <file>    - Display file contents
  stat <file>   - Display file status
  help          - Show this help message`;
          setTtyOutput(helpText);
          setJsonResponse(null);
          commandSuccess = true;
          break;
        }

        default: {
          throw new Error(`Command not found: ${cmd}`);
        }
      }
    } catch (err) {
      const message = err?.message || 'Command failed';
      setError(message);
      setTtyOutput('');
      setJsonResponse({ error: message });
      commandSuccess = false;
    } finally {
      setHistory((prev) => [...prev, { command: trimmedInput, success: commandSuccess }]);
      setHistoryIndex(-1);
      setLoading(false);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      } else {
        inputRef.current?.focus();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) {
      inputRef.current?.focus();
      return;
    }

    if (command.trim()) {
      executeCommand(command);
      setCommand('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const entry = history[history.length - 1 - newIndex];
        setCommand(entry ? entry.command : '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const entry = history[history.length - 1 - newIndex];
        setCommand(entry ? entry.command : '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const cwdKey = getFileStorageKey(tenant, 'cwd');
      window.localStorage.setItem(cwdKey, cwd);
    } catch (err) {
      console.warn('Failed to persist file view cwd', err);
    }
  }, [cwd, tenant]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const historyKey = getFileStorageKey(tenant, 'history');
      if (history.length > 0) {
        window.sessionStorage.setItem(historyKey, JSON.stringify(history));
      } else {
        window.sessionStorage.removeItem(historyKey);
      }
    } catch (err) {
      console.warn('Failed to persist file view history', err);
    }
  }, [history, tenant]);

  const recentCommands = history.length > 0 ? history.slice(-3).reverse() : [];
  const viewTarget = getViewTarget(cwd);

  const handleViewNavigation = () => {
    if (!viewTarget) {
      return;
    }

    if (viewTarget.schema && typeof window !== 'undefined') {
      try {
        const storageKey = getSchemaStorageKey(tenant, 'lastSelectedSchema');
        window.sessionStorage.setItem(storageKey, viewTarget.schema);
      } catch (err) {
        console.warn('Unable to persist schema selection', err);
      }
    }

    navigate(viewTarget.route);
  };

  return (
    <>
      <Header />
      <div className="container">
        <div className="file-terminal">
          <div className="terminal-prompt">
            <div className="prompt-header">
              <label className="cwd-label" htmlFor={inputId}>
                {`${cwd} $`}
              </label>
              {viewTarget && (
                <button
                  type="button"
                  className="view-button"
                  onClick={handleViewNavigation}
                >
                  View
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="command-form">
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                className="command-input"
                placeholder="Enter command (ls, cd, cat, stat, help)"
                autoFocus
              />
            </form>
            {recentCommands.length > 0 && (
              <div className="command-history">
                <div className="history-label">Recent commands</div>
                <ul className="history-list">
                  {recentCommands.map((item, index) => (
                    <li
                      key={`${item.command}-${item.success}-${index}`}
                      className={`history-item ${index === 0 ? 'history-item-latest' : ''} ${item.success ? 'history-item-success' : 'history-item-failure'}`}
                    >
                      <span className="history-icon" aria-hidden="true">
                        {item.success ? '✓' : '✗'}
                      </span>
                      <span className="history-command-text">{item.command}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {loading && (
            <div className="loading-indicator">
              <span className="loading"></span>
              <span>Executing...</span>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {(ttyOutput || jsonResponse) && (
            <div className="response-area">
              <div className="response-columns">
                <div className="response-panel">
                  <div className="response-header">TTY Output</div>
                  <pre className="response-content">{ttyOutput || '(no output)'}</pre>
                </div>
                <div className="response-panel">
                  <div className="response-header">JSON</div>
                  <pre className="response-content">
                    {jsonResponse ? JSON.stringify(jsonResponse, null, 2) : '(no data)'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}