export type ConfigEntry = [string, unknown];

/** Fields whose current value differs from the registry default. */
export const changedEntries = (
  config: Record<string, unknown>,
  defaults: Readonly<Record<string, unknown>>,
): ConfigEntry[] =>
  Object.entries(defaults)
    .filter(([key, def]) => JSON.stringify(config[key]) !== JSON.stringify(def))
    .map(([key]) => [key, config[key]] as ConfigEntry);

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return `'${value}'`;
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  return String(value);
};

export const coreSnippet = (id: string, changed: readonly ConfigEntry[]): string => {
  const head = "import { createPattern } from '@asciitopia/core';\n\n";
  if (changed.length === 0) return `${head}const pattern = createPattern('${id}');`;
  const fields = changed.map(([key, value]) => `  ${key}: ${formatValue(value)},`).join('\n');
  return `${head}const pattern = createPattern('${id}', {\n${fields}\n});`;
};

export const reactSnippet = (id: string, changed: readonly ConfigEntry[]): string => {
  const head = "import { AsciiBackground } from '@asciitopia/react';\n\n";
  if (changed.length === 0)
    return `${head}<AsciiBackground className="ascii-bg" pattern="${id}" />`;
  const fields = changed.map(([key, value]) => `${key}: ${formatValue(value)}`).join(', ');
  return `${head}<AsciiBackground\n  className="ascii-bg"\n  pattern="${id}"\n  config={{ ${fields} }}\n/>`;
};
