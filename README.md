# cm

`cm` 是一个用于合并 Claude Code 和 Codex 配置文件的命令行工具。

它的主要用途是：

- 将基础配置文件与当前配置文件合并
- 将结果输出回 Claude Code 或 Codex 的默认配置文件
- 支持 JSON 和 TOML
- 支持用 base 配置强制恢复字段，同时保留当前配置的额外字段

## 支持的工具

| 工具 | base 配置 | 当前配置 / 输出配置 |
| --- | --- | --- |
| Claude Code | `~/.claude/base.settings.json` | `~/.claude/settings.json` |
| Codex | `~/.codex/base.config.toml` | `~/.codex/config.toml` |

## 安装

全局安装：

```bash
npm install -g @villsy/config-merge
```

安装后即可使用：

```bash
cm --help
```

在项目目录中安装依赖：

```bash
npm install
```

本地运行：

```bash
node bin/cm.js --help
```

如果希望直接使用 `cm` 命令，可以在项目目录执行：

```bash
npm link
```

之后即可运行：

```bash
cm --help
```

## 基本用法

### 合并 Claude Code 配置

```bash
cm -t claude
```

默认读取：

```text
~/.claude/base.settings.json
~/.claude/settings.json
```

并输出到：

```text
~/.claude/settings.json
```

### 合并 Codex 配置

```bash
cm -t codex
```

默认读取：

```text
~/.codex/base.config.toml
~/.codex/config.toml
```

并输出到：

```text
~/.codex/config.toml
```

## 推荐：先预览差异

写入真实配置前，建议先使用 `--diff` 或 `-d` 预览变化。

普通合并时，`-d` 显示 base 配置与合并结果的差异：

```bash
cm -t claude -d
cm -t codex -d
```

配合 `-F` 使用时，`-d` 显示当前配置与 base 强制应用结果的差异：

```bash
cm -t claude -F -d
cm -t codex -F -d
```

输出示例：

```text
~ model: "gpt-5.5" -> "gpt-5"
+ approval_policy: "suggest"
- old_field: "value"
```

## 合并规则

普通合并时，base 配置会作为基础，当前配置作为覆盖层：

```bash
cm -t claude
cm -t codex
```

规则：

- 深度递归合并对象
- 当前配置中的同名字段覆盖 base 配置
- 数组整体替换，不做追加
- 当前配置中字段值为 `null` 时，会删除 base 中对应字段
- base 中存在但当前配置不存在的字段会保留
- 当前配置中存在但 base 不存在的字段会新增到结果中

## `--force-base` / `-F`

`-F` 不是整体覆盖文件，也不会删除当前配置中的额外内容。

它会以当前配置文件为基础，深度遍历 base 配置，用 base 字段覆盖当前配置中的同名字段，并新增当前配置中没有的 base 字段。

可以理解为：

```text
结果 = 当前配置 + base 配置强制覆盖/新增
```

```bash
cm -t claude -F
cm -t codex -F
```

规则：

- base 字段会覆盖当前配置中的同名字段
- base 里有、当前配置里没有的字段会新增
- 深度递归到最小字段颗粒度
- 当前配置里的额外字段会保留
- 不会整体删除当前配置中的额外内容

例如当前 Codex 配置中有：

```toml
model = "gpt-5.5"
base_url = "http://127.0.0.1:8317"

[projects.demo]
trust_level = "trusted"
```

base 配置中有：

```toml
model = "gpt-5"
approval_policy = "suggest"
```

执行：

```bash
cm -t codex -F
```

结果会变成：

```toml
model = "gpt-5"
base_url = "http://127.0.0.1:8317"
approval_policy = "suggest"

[projects.demo]
trust_level = "trusted"
```

也就是：替换 `model`，新增 `approval_policy`，但不会删除 `base_url` 和 `[projects.demo]`。

## Claude Code 项目配置

Claude Code 默认输出到全局配置：

```bash
cm -t claude
```

如果要输出到当前项目的 `.claude/settings.json`：

```bash
cm -t claude -S project
```

等价于：

```bash
cm -t claude --scope project
```

## 自定义输入输出路径

可以手动指定 base、当前配置和输出路径：

```bash
cm -b ./base.settings.json -s ./settings.json -o ./merged.settings.json
cm -b ./base.config.toml -s ./config.toml -o ./merged.config.toml
```

也可以只输出到 stdout：

```bash
cm -b ./base.settings.json -s ./settings.json
```

## 参数说明

| 参数 | 简写 | 说明 |
| --- | --- | --- |
| `--base <file>` | `-b` | base 配置文件路径 |
| `--switch <file>` | `-s` | 当前配置 / 覆盖配置文件路径 |
| `--target <name>` | `-t` | 目标工具：`claude` 或 `codex` |
| `--scope <scope>` | `-S` | Claude Code 输出范围：`global` 或 `project` |
| `--output <file>` | `-o` | 自定义输出路径 |
| `--format <fmt>` | `-f` | 强制指定格式：`json` 或 `toml` |
| `--diff` | `-d` | 只显示差异，不写入文件 |
| `--force-base` | `-F` | 用 base 字段覆盖/新增，同时保留当前配置额外字段 |
| `--help` | `-h` | 显示帮助 |

## 常用命令

```bash
# 预览 Claude Code 合并结果
cm -t claude -d

# 合并并写入 Claude Code 全局配置
cm -t claude

# 合并并写入 Claude Code 项目配置
cm -t claude -S project

# 用 base 字段恢复 Claude Code 配置
cm -t claude -F

# 预览 Codex 合并结果
cm -t codex -d

# 合并并写入 Codex 配置
cm -t codex

# 用 base 字段恢复 Codex 配置
cm -t codex -F
```

## 测试

运行测试：

```bash
npm test
```
