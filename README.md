# Fynn - AI Commit CLI

An intelligent CLI tool that generates meaningful commit messages using AI, following conventional commit patterns. Beyond commits, Fynn offers code analysis, test generation, and developer insights powered by AI.

## ✨ Features

### Commit Management

* 🤖 **AI-Powered Commits**: Analyze staged changes and generate contextual commit messages
* 🖍 **Conventional Commits**: Automatically follows the conventional commit specification
* 🎯 **Smart Workflow**: Stage, commit, and push in one command with `--push`
* 🔧 **Interactive Mode**: Review and edit messages before committing with `--ask`
* 👁️ **Dry Run**: Preview commit messages without committing with `--dry-run`

### Code Analysis Tools

* 🔍 **AI Code Review**: Intelligent feedback on code quality, security, and performance
* 📊 **Impact Analysis**: Understand the risk level and complexity of your commits
* 🖍 **Commit Summaries**: Generate clear summaries of what changed in any commit
* 🔎 **Duplicate Detection**: Detect repeated patterns across multiple commits

### Testing & Documentation

* 🧢 **Test Generation**: Automatically generate test cases for your latest commit
* 📚 **Changelog Generation**: Create professional `CHANGELOG.md` from commit history
* 👥 **Developer Reports**: Track commit statistics and identify code hotspots

### Performance & UX

* ⚡ **Fast**: Quick setup and execution
* 💡 **Helpful**: Clear instructions and error messages
* 🎨 **Beautiful**: Colorful, intuitive CLI interface

---

### CLI Options

| Option | Description |
|--------|-------------|
| `--commit` | Stage and commit all changes before generating commit |
| `--push` | Push changes after committing (handles full workflow) |
| `--ask` | Ask for confirmation before committing |
| `--dry-run` | Generate message without committing |
| `--test` | Generate test cases for the latest commit |
| `--impact` | Show commit impact analysis (risk level, files touched, complexity) |
| `--summary` | Show a summary of what changed in the latest commit |
| `--report` | Show developer impact report with commit statistics and hotspots |
| `--duplicate` | Find similar logic that appears multiple times across commits |
| `--review` | AI-powered code review with suggestions and issue detection |
| `--log [count]` | Generate `CHANGELOG.md` from recent commits (e.g., `--log 5` for last 5 commits) |

## Installation

**Globally (recommended):**

```bash
# npm 
npm install -g @fynn-ai/fynn

# pnpm
pnpm add -g @fynn-ai/fynn

# yarn
yarn global add @fynn-ai/fynn
```

**Without installation (via `npx`):**

```bash
npx fynn
```

---

## Setup

You'll need an OpenAI API key to use Fynn:

**Interactive setup:**

```bash
npx fynn setup
```

**Or manually set it as an environment variable:**

```bash
# Linux / Mac
export OPENAI_API_KEY="your-api-key-here"

# Windows PowerShell
$env:OPENAI_API_KEY="your-api-key-here"

# Windows CMD
set OPENAI_API_KEY=your-api-key-here
```

---

## Usage

### Basic Usage(Local Installation)

```bash
# Stage and Generate commit with AI
npx fynn

# Or use the shorter alias
npx commit
```

---

## How It Works

1. **Analyzes Staged Changes**: Reads your `git diff --cached`
2. **AI Processing**: Sends diff to OpenAI with conventional commit context
3. **Smart Categorization**: Chooses commit type (feat, fix, docs, etc.)
4. **Message Generation**: Creates concise, meaningful commit message
5. **User Review**: Lets you edit or approve the message

---

## Commit Types

Automatically selects from conventional commit types:

* `feat`: New features
* `fix`: Bug fixes
* `docs`: Documentation changes
* `style`: Code style changes (formatting, etc.)
* `refactor`: Code refactoring
* `perf`: Performance improvements
* `test`: Test additions/modifications
* `build`: Build system changes
* `ci`: CI/CD changes
* `chore`: Other changes
* `revert`: Reverting previous commits
