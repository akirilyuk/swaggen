import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'code',
    label: 'Code',
    type: 'text',
    placeholder: 'Enter code here...',
  },
  {
    key: 'language',
    label: 'Language',
    type: 'select',
    options: [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'python', label: 'Python' },
      { value: 'html', label: 'HTML' },
      { value: 'css', label: 'CSS' },
      { value: 'json', label: 'JSON' },
      { value: 'bash', label: 'Bash' },
      { value: 'sql', label: 'SQL' },
      { value: 'plaintext', label: 'Plain Text' },
    ],
    defaultValue: 'javascript',
  },
  {
    key: 'showLineNumbers',
    label: 'Line Numbers',
    type: 'toggle',
    defaultValue: false,
  },
];

export function CodeBlockRenderer({ component }: BaseRendererProps) {
  const [copied, setCopied] = useState(false);
  const code = readProp<string>(component, 'code', 'console.log("Hello, World!");');
  const language = readProp<string>(component, 'language', 'javascript');
  const showLineNumbers = readProp<boolean>(component, 'showLineNumbers', false);

  const lines = code.split('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-400 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-5 overflow-x-auto text-sm font-mono">
        <code>
          {showLineNumbers ? (
            lines.map((line, idx) => (
              <div key={idx} className="flex">
                <span className="text-zinc-500 select-none w-8 text-right pr-4">
                  {idx + 1}
                </span>
                <span>{line}</span>
              </div>
            ))
          ) : (
            code
          )}
        </code>
      </pre>
    </div>
  );
}
