'use client';

import React, { useEffect, useRef, useMemo } from 'react';

export interface ConsoleLog {
  id: string;
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface PreviewSandboxProps {
  type: string;
  code: string;
  onConsoleLog?: (log: ConsoleLog) => void;
}

export function PreviewSandbox({ type, code, onConsoleLog }: PreviewSandboxProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.source === 'aether-sandbox' && e.data?.type === 'console') {
        onConsoleLog?.({
          id: Math.random().toString(36).substring(2, 9),
          level: e.data.level,
          message: e.data.message,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onConsoleLog]);

  const srcDoc = useMemo(() => {
    const consoleBridge = `
      <script>
        (function() {
          const send = (level, args) => {
            try {
              const message = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
              window.parent.postMessage({ source: 'aether-sandbox', type: 'console', level, message }, '*');
            } catch (e) {}
          };
          const _log = console.log, _warn = console.warn, _err = console.error;
          console.log = function() { send('log', arguments); _log.apply(console, arguments); };
          console.warn = function() { send('warn', arguments); _warn.apply(console, arguments); };
          console.error = function() { send('error', arguments); _err.apply(console, arguments); };
          window.onerror = function(msg, url, line) {
            send('error', [msg + ' (line ' + line + ')']);
          };
        })();
      </script>
    `;

    // 1. Raw SVG
    if (type.includes('svg')) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
            <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #ffffff; padding: 20px; box-sizing: border-box; }
              svg { max-width: 100%; max-height: 90vh; height: auto; }
            </style>
            ${consoleBridge}
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    }

    // 2. Full HTML page
    if (type.includes('html')) {
      if (code.includes('<html') || code.includes('<!DOCTYPE')) {
        return code.replace('<head>', `<head>${consoleBridge}`);
      }
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src="https://cdn.tailwindcss.com"></script>
            ${consoleBridge}
          </head>
          <body class="p-6 bg-white text-slate-900 font-sans">
            ${code}
          </body>
        </html>
      `;
    }

    // 3. React Component (Transpiled via Babel Standalone + Tailwind)
    if (type.includes('react')) {
      // Strip imports from code
      const cleanCode = code
        .replace(/import\s+React.*?from\s+['"].*?['"];?/g, '')
        .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
        .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, 'function App')
        .replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/, 'class App');

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://unpkg.com/lucide@latest"></script>
            ${consoleBridge}
          </head>
          <body class="p-4 bg-slate-50 text-slate-900 min-h-screen">
            <div id="root"></div>
            <script type="text/babel">
              const { useState, useEffect, useRef, useMemo, useCallback } = React;
              
              try {
                ${cleanCode}

                const root = ReactDOM.createRoot(document.getElementById('root'));
                if (typeof App !== 'undefined') {
                  root.render(<App />);
                } else {
                  console.error("No default component found to render.");
                }
              } catch (err) {
                console.error("Runtime execution error: " + err.message);
              }
            </script>
          </body>
        </html>
      `;
    }

    // 4. Fallback (Code/Markdown)
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>body { font-family: monospace; white-space: pre-wrap; padding: 16px; background: #fff; color: #1e293b; }</style>
          ${consoleBridge}
        </head>
        <body>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
      </html>
    `;
  }, [type, code]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      title="Artifact Preview Sandbox"
      // HARD SECURITY CONSTRAINT: allow-scripts ONLY. NEVER allow-same-origin.
      sandbox="allow-scripts"
      className="w-full h-full border-0 bg-white"
    />
  );
}
