# Fynn - AI Commit CLI

An intelligent CLI tool that generates meaningful commit messages using AI, following conventional commit patterns. Beyond commits, Fynn offers code analysis, test generation, and developer insights powered by AI.

## ✨ Features

### Commit Management
- 🤖 **AI-Powered Commits**: Uses OpenAI to analyze your staged changes and generate contextual commit messages
- 📝 **Conventional Commits**: Automatically follows the conventional commit specification
- 🎯 **Smart Workflow**: Stage, commit, and push in one command with `--push`
- 🔧 **Interactive Mode**: Review and edit messages before committing with `--ask`
- 👁️ **Dry Run**: Preview commit messages without committing with `--dry-run`

### Code Analysis Tools
- 🔍 **AI Code Review**: Get intelligent code review with security, performance, and best practice suggestions
- 📊 **Impact Analysis**: Understand the risk level and complexity of your commits
- 📝 **Commit Summaries**: Generate clear summaries of what changed in any commit
- 🔎 **Duplicate Detection**: Find similar code patterns across multiple commits

### Testing & Documentation
- 🧪 **Test Generation**: Automatically generate test cases for your latest commit
- 📚 **Changelog Generation**: Create professional CHANGELOG.md from commit history
- 👥 **Developer Reports**: Track commit statistics and identify code hotspots

### Performance & UX
- ⚡ **Fast**: Quick setup and execution
- 💡 **Helpful**: Clear error messages and setup instructions
- 🎨 **Beautiful**: Colorful and intuitive CLI interface

## Installation

\`\`\`bash

# Install globally

npm install -g fynn

# Or use with npx (no installation required)

npx fynn
\`\`\`

## Setup

You'll need an OpenAI API key to use this tool:

\`\`\`bash

# Set up your API key (interactive)

npx fynn setup

# Or set it as an environment variable

export OPENAI_API_KEY="your-api-key-here"
\`\`\`

## Usage

### Basic Usage

\`\`\`bash

# Stage your changes first

git add .

# Generate and commit with AI

npx fynn

# Or use the shorter alias

npx commit
\`\`\`

### Advanced Usage

\`\`\`bash

# Generate message without committing (dry run)

npx fynn --dry-run

# Skip confirmation and commit immediately

npx fynn --yes

# Use a specific API key for this session

npx fynn --api-key "your-key"

# Use the explicit generate command

npx fynn generate
\`\`\`

## How It Works

1. **Analyzes Staged Changes**: Reads your `git diff --cached` to understand what you've changed
2. **AI Processing**: Sends the diff to OpenAI with context about conventional commit patterns
3. **Smart Categorization**: Determines the appropriate commit type (feat, fix, docs, etc.)
4. **Message Generation**: Creates a concise, meaningful commit message
5. **User Review**: Shows you the message and lets you edit or approve it

## Commit Types

The tool automatically selects from these conventional commit types:

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or modifications
- `build`: Build system changes
- `ci`: CI/CD changes
- `chore`: Other changes
- `revert`: Reverting previous commits
