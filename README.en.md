# cm

`cm` is a command-line tool for merging Claude Code and Codex configuration files.

It is designed to:

- Merge a base configuration file with the current configuration file
- Write the result back to the default Claude Code or Codex config file
- Support both JSON and TOML
- Restore base configuration fields while preserving extra fields in the current config

## Supported Tools

| Tool | Base config | Current / output config |
| --- | --- | --- |
| Claude Code | `~/.claude/base.settings.json` | `~/.claude/settings.json` |
| Codex | `~/.codex/base.config.toml` | `~/.codex/config.toml` |

## Installation

Install globally:

```bash
npm install -g @villsy/config-merge
```

Then use:

```bash
cm --help
```

Install dependencies in this project directory:

```bash
npm install
```

Run locally:

```bash
node bin/cm.js --help
```

To make the `cm` command available globally, run:

```bash
npm link
```

Then use:

```bash
cm --help
```

## Basic Usage

### Merge Claude Code config

```bash
cm -t claude
```

Default input files:

```text
~/.claude/base.settings.json
~/.claude/settings.json
```

Default output file:

```text
~/.claude/settings.json
```

### Merge Codex config

```bash
cm -t codex
```

Default input files:

```text
~/.codex/base.config.toml
~/.codex/config.toml
```

Default output file:

```text
~/.codex/config.toml
```

## Preview Changes First

Before writing to a real config file, use `--diff` or `-d` to preview the changes.

For normal merge mode, `-d` shows the difference between the base config and the merged result:

```bash
cm -t claude -d
cm -t codex -d
```

When used with `-F`, `-d` shows the difference between the current config and the force-base result:

```bash
cm -t claude -F -d
cm -t codex -F -d
```

Example output:

```text
~ model: "gpt-5.5" -> "gpt-5"
+ approval_policy: "suggest"
- old_field: "value"
```

## Normal Merge Rules

In normal merge mode, the base config is used as the base layer, and the current config is used as the override layer:

```bash
cm -t claude
cm -t codex
```

Rules:

- Objects are merged recursively
- Fields in the current config override fields in the base config
- Arrays are replaced as a whole, not appended
- If a field in the current config is `null`, the corresponding field from the base config is removed
- Fields that exist only in the base config are preserved
- Fields that exist only in the current config are added to the result

## `--force-base` / `-F`

`-F` does not overwrite the entire file, and it does not remove extra fields from the current config.

It uses the current config as the starting point, recursively walks the base config, and applies base fields into the current config. Existing fields are overwritten by base values, and base-only fields are added.

You can think of it as:

```text
result = current config + base config forced overwrite/add
```

```bash
cm -t claude -F
cm -t codex -F
```

Rules:

- Base fields overwrite matching fields in the current config
- Fields that exist in base but not in the current config are added
- Nested objects are processed recursively at the smallest field level
- Extra fields in the current config are preserved
- The current config is not replaced as a whole

Example current Codex config:

```toml
model = "gpt-5.5"
base_url = "http://127.0.0.1:8317"

[projects.demo]
trust_level = "trusted"
```

Example base config:

```toml
model = "gpt-5"
approval_policy = "suggest"
```

Run:

```bash
cm -t codex -F
```

Result:

```toml
model = "gpt-5"
base_url = "http://127.0.0.1:8317"
approval_policy = "suggest"

[projects.demo]
trust_level = "trusted"
```

This replaces `model`, adds `approval_policy`, and keeps `base_url` and `[projects.demo]`.

## Claude Code Project Config

By default, Claude Code writes to the global config:

```bash
cm -t claude
```

To write to the current project's `.claude/settings.json` instead:

```bash
cm -t claude -S project
```

Equivalent long form:

```bash
cm -t claude --scope project
```

## Custom Input and Output Paths

You can manually specify the base config, current config, and output path:

```bash
cm -b ./base.settings.json -s ./settings.json -o ./merged.settings.json
cm -b ./base.config.toml -s ./config.toml -o ./merged.config.toml
```

You can also write the result to stdout:

```bash
cm -b ./base.settings.json -s ./settings.json
```

## CLI Options

| Option | Short | Description |
| --- | --- | --- |
| `--base <file>` | `-b` | Base config file path |
| `--switch <file>` | `-s` | Current / override config file path |
| `--target <name>` | `-t` | Target tool: `claude` or `codex` |
| `--scope <scope>` | `-S` | Claude Code output scope: `global` or `project` |
| `--output <file>` | `-o` | Custom output path |
| `--format <fmt>` | `-f` | Force format: `json` or `toml` |
| `--diff` | `-d` | Show differences only, do not write files |
| `--force-base` | `-F` | Apply base fields by overwriting/adding, while preserving current extra fields |
| `--help` | `-h` | Show help |

## Common Commands

```bash
# Preview Claude Code merge result
cm -t claude -d

# Merge and write Claude Code global config
cm -t claude

# Merge and write Claude Code project config
cm -t claude -S project

# Restore Claude Code config using base fields
cm -t claude -F

# Preview Codex merge result
cm -t codex -d

# Merge and write Codex config
cm -t codex

# Restore Codex config using base fields
cm -t codex -F
```

## Tests

Run tests:

```bash
npm test
```
