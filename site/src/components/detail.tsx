import { getPattern, type PatternRegistryEntry } from '@asciitopia/core';
import { AsciiBackground } from '@asciitopia/react';
import { useMemo, useState } from 'react';
import { changedEntries } from '../lib/config-code';
import { Controls } from './controls';
import { Snippet } from './snippet';

interface PatternLabProps {
  entry: PatternRegistryEntry;
}

const PatternLab = ({ entry }: PatternLabProps) => {
  const [config, setConfig] = useState<Record<string, unknown>>(() => ({
    ...entry.configDefaults,
  }));

  // setConfig is deliberately not part of the pattern contract in v0.1 —
  // knob changes recreate the pattern (init IS the reset path).
  const pattern = useMemo(() => entry.create(config), [entry, config]);
  const changed = changedEntries(config, entry.configDefaults);

  return (
    <main className="detail">
      <AsciiBackground className="detail__canvas" pattern={pattern} />

      <nav className="detail__nav">
        <a className="detail__back" href="#/">
          ← index
        </a>
        <span className="label">{entry.name.toLowerCase()}</span>
      </nav>

      <aside className="panel">
        <header className="panel__head">
          <h2 className="panel__title">{entry.name}</h2>
          <p className="panel__desc">{entry.description}</p>
        </header>

        <Controls
          config={config}
          defaults={entry.configDefaults}
          onChange={(key, value) => setConfig((c) => ({ ...c, [key]: value }))}
          patternId={entry.id}
        />

        <button
          className="panel__reset"
          disabled={changed.length === 0}
          onClick={() => setConfig({ ...entry.configDefaults })}
          type="button"
        >
          reset defaults
        </button>

        <Snippet changed={changed} patternId={entry.id} />
      </aside>
    </main>
  );
};

export const DetailView = ({ id }: { id: string }) => {
  const entry = getPattern(id);

  if (!entry) {
    return (
      <main className="missing">
        <p className="missing__glyph">░░░</p>
        <p>
          No pattern registered as '{id}'.{' '}
          <a className="missing__back" href="#/">
            ← back to the index
          </a>
        </p>
      </main>
    );
  }

  // key resets the lab state when navigating between patterns.
  return <PatternLab entry={entry} key={entry.id} />;
};
