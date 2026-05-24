import { readFileSync, writeFileSync } from 'node:fs';
import TOML from '@iarna/toml';

export function parse(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  return TOML.parse(content);
}

export function serialize(data) {
  return TOML.stringify(data);
}

export function write(filePath, data) {
  writeFileSync(filePath, serialize(data), 'utf-8');
}
