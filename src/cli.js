import { resolve, extname, join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync, mkdirSync } from 'node:fs';
import { deepMerge, deepForceBase, computeDiff } from './merge.js';
import * as jsonParser from './parsers/json.js';
import * as tomlParser from './parsers/toml.js';

const PARSERS = {
  '.json': jsonParser,
  '.toml': tomlParser,
};

const TARGETS = {
  claude: {
    base: join(homedir(), '.claude', 'base.settings.json'),
    switch: join(homedir(), '.claude', 'settings.json'),
    global: join(homedir(), '.claude', 'settings.json'),
    project: join(process.cwd(), '.claude', 'settings.json'),
    format: '.json',
  },
  codex: {
    base: join(homedir(), '.codex', 'base.config.toml'),
    switch: join(homedir(), '.codex', 'config.toml'),
    global: join(homedir(), '.codex', 'config.toml'),
    format: '.toml',
  },
};

function detectFormat(filePath, explicitFormat) {
  if (explicitFormat) {
    const fmt = explicitFormat.toLowerCase();
    if (fmt === 'json') return '.json';
    if (fmt === 'toml') return '.toml';
    throw new Error(`Unsupported format: ${explicitFormat}`);
  }
  const ext = extname(filePath).toLowerCase();
  if (!PARSERS[ext]) {
    throw new Error(`Cannot detect format from extension "${ext}". Use --format to specify.`);
  }
  return ext;
}

function resolveTarget(target, scope) {
  const t = TARGETS[target];
  if (!t) {
    throw new Error(`Unknown target: ${target}. Supported: claude, codex`);
  }
  if (target === 'codex') {
    return { base: t.base, switch: t.switch, path: t.global, format: t.format };
  }
  const s = scope || 'global';
  if (s !== 'global' && s !== 'project') {
    throw new Error(`Invalid scope: ${s}. Supported: global, project`);
  }
  return { base: t.base, switch: t.switch, path: t[s], format: t.format };
}

function parseArgs(argv) {
  const args = {
    base: null,
    switch: null,
    output: null,
    format: null,
    target: null,
    scope: null,
    diff: false,
    forceBase: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--base':
      case '-b':
        args.base = argv[++i];
        break;
      case '--switch':
      case '-s':
        args.switch = argv[++i];
        break;
      case '--output':
      case '-o':
        args.output = argv[++i];
        break;
      case '--format':
      case '-f':
        args.format = argv[++i];
        break;
      case '--target':
      case '-t':
        args.target = argv[++i];
        break;
      case '--scope':
      case '-S':
        args.scope = argv[++i];
        break;
      case '--diff':
      case '-d':
        args.diff = true;
        break;
      case '--force-base':
      case '-F':
        args.forceBase = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

const HELP_TEXT = `cm - Merge switch config with base config for Claude Code / Codex

Usage:
  cm --base <file> --switch <file> [options]

Options:
  -b, --base <file>      Base configuration file (defaults by --target)
  -s, --switch <file>    Switch/overlay configuration file (defaults by --target)
  -t, --target <name>    Output to predefined config path (claude | codex)
  -S, --scope <scope>    For --target claude: global (default) | project
  -o, --output <file>    Custom output file (overrides --target)
  -f, --format <fmt>     Force format: json or toml (default: auto-detect)
  -d, --diff             Show diff between base and merged config
  -F, --force-base       Apply base fields, preserving current extra fields
  -h, --help             Show this help

Defaults:
  claude   base: ~/.claude/base.settings.json, switch/output: ~/.claude/settings.json
  codex    base: ~/.codex/base.config.toml, switch/output: ~/.codex/config.toml

Targets:
  claude   output: ~/.claude/settings.json (global) or .claude/settings.json (project)
  codex    output: ~/.codex/config.toml

Examples:
  cm -t claude
  cm -t claude -F
  cm -t claude -S project
  cm -t codex
  cm -b base.settings.json -s settings.json --diff
`;

function printDiff(diffs) {
  if (diffs.length === 0) {
    console.log('No differences.');
    return;
  }
  for (const d of diffs) {
    switch (d.type) {
      case 'added':
        console.log(`+ ${d.path}: ${JSON.stringify(d.value)}`);
        break;
      case 'removed':
        console.log(`- ${d.path}: ${JSON.stringify(d.value)}`);
        break;
      case 'changed':
        console.log(`~ ${d.path}: ${JSON.stringify(d.from)} -> ${JSON.stringify(d.to)}`);
        break;
    }
  }
}

function ensureOutputDir(outputPath) {
  const dir = outputPath.replace(/[\\/][^\\/]+$/, '');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function run(argv) {
  const args = parseArgs(argv);

  if (args.help) {
    console.log(HELP_TEXT);
    return;
  }

  let target = null;
  if (args.target) {
    target = resolveTarget(args.target, args.scope);
  }

  if (!args.base && !target) {
    console.error('Error: --base is required unless --target is provided. Use --help for usage.');
    process.exit(1);
  }
  if (!args.forceBase && !args.switch && !target) {
    console.error('Error: --switch is required unless --target is provided. Use --help for usage.');
    process.exit(1);
  }

  const basePath = args.base ? resolve(args.base) : target.base;
  const outputPath = args.output ? resolve(args.output) : target?.path ?? null;
  const switchPath = args.switch ? resolve(args.switch) : target?.switch ?? outputPath;

  if (args.forceBase && !switchPath) {
    console.error('Error: --force-base requires --switch, --target, or --output. Use --help for usage.');
    process.exit(1);
  }

  const ext = detectFormat(basePath, args.format);
  const parser = PARSERS[ext];
  const baseConfig = parser.parse(basePath);

  if (args.forceBase) {
    const currentConfig = parser.parse(switchPath);
    const forced = deepForceBase(currentConfig, baseConfig);

    if (args.diff) {
      printDiff(computeDiff(currentConfig, forced));
      return;
    }
    if (outputPath) {
      ensureOutputDir(outputPath);
      parser.write(outputPath, forced);
      console.log(`Base fields written to ${outputPath}`);
    } else {
      process.stdout.write(parser.serialize(forced));
    }
    return;
  }

  const switchConfig = parser.parse(switchPath);
  const merged = deepMerge(baseConfig, switchConfig);

  if (args.diff) {
    printDiff(computeDiff(baseConfig, merged));
    return;
  }

  if (outputPath) {
    ensureOutputDir(outputPath);
    parser.write(outputPath, merged);
    console.log(`Merged config written to ${outputPath}`);
  } else {
    process.stdout.write(parser.serialize(merged));
  }
}
