import { useState } from 'react';
import { type ConfigEntry, coreSnippet, reactSnippet } from '../lib/config-code';

export interface SnippetProps {
  patternId: string;
  changed: readonly ConfigEntry[];
}

type Flavor = 'core' | 'react';

/** Live "copy this config" block — tweak knobs, paste into your app. */
export const Snippet = ({ patternId, changed }: SnippetProps) => {
  const [flavor, setFlavor] = useState<Flavor>('core');
  const [copied, setCopied] = useState(false);

  const code =
    flavor === 'core' ? coreSnippet(patternId, changed) : reactSnippet(patternId, changed);

  const copy = (): void => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  const tab = (name: Flavor) => (
    <button
      className={`snippet__tab ${flavor === name ? 'snippet__tab--active' : ''}`}
      key={name}
      onClick={() => setFlavor(name)}
      type="button"
    >
      {name}
    </button>
  );

  return (
    <div className="snippet">
      <div className="snippet__tabs">
        {(['core', 'react'] as const).map(tab)}
        <button className="snippet__copy" onClick={copy} type="button">
          {copied ? 'copied ✓' : 'copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
};
