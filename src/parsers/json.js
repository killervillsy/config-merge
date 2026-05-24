import { readFileSync, writeFileSync } from 'node:fs';

export function parse(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

export function serialize(data) {
  return JSON.stringify(data, null, 2) + '\n';
}

export function write(filePath, data) {
  writeFileSync(filePath, serialize(data), 'utf-8');
}
