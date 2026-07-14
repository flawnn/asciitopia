export type ConfigEntry = [string, unknown];

/** Fields whose current value differs from the registry default — including
 *  keys the lab layered on top of the defaults (e.g. weather's demoReel). */
export const changedEntries = (
  config: Record<string, unknown>,
  defaults: Readonly<Record<string, unknown>>,
): ConfigEntry[] => {
  const keys = [...new Set([...Object.keys(defaults), ...Object.keys(config)])];
  return keys
    .filter((key) => JSON.stringify(config[key]) !== JSON.stringify(defaults[key]))
    .map((key) => [key, config[key]] as ConfigEntry);
};

const formatValue = (value: unknown): string => {
  if (typeof value === 'string') return `'${value}'`;
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const fields = Object.entries(value).map(([key, v]) => `${key}: ${formatValue(v)}`);
    return `{ ${fields.join(', ')} }`;
  }
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
