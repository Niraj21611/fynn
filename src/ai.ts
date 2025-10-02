import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { type GitDiff, type CommitSuggestion, type DuplicateCode, type CodeReview, COMMIT_TYPES } from "./Types/types"
import { GitService } from "./git"

export class AIService {
  private model
  private hasApiKey: boolean

  constructor() {
    const openaiKey = process.env.OPENAI_API_KEY

    if (!openaiKey) {
      console.log("❌ No OpenAI API key found!")
      console.log("💡 Set your API key: export OPENAI_API_KEY='your-key'")
      console.log("🔗 Get your key from: https://platform.openai.com/api-keys")
      process.exit(1)
    }

    this.model = openai("gpt-4o-mini")
    this.hasApiKey = true
  }

  async generateCommitMessage(diffs: GitDiff[]): Promise<CommitSuggestion> {
    if (!this.hasApiKey) {
      throw new Error("OpenAI API key is required")
    }

    const diffSummary = this.createDiffSummary(diffs)

    const prompt = `
You are an expert developer who writes perfect conventional commit messages.

Analyze the following git diff and generate a conventional commit message.

RULES:
1. Follow conventional commit format: type(scope): description
2. Use one of these types: ${COMMIT_TYPES.map((t) => t.type).join(", ")}
3. Keep description under 50 characters
4. Use present tense, imperative mood
5. Don't capitalize first letter of description
6. No period at the end
7. If scope is obvious from files, include it
8. If breaking change, add ! after type/scope

FILES CHANGED:
${diffSummary}

DIFF CONTENT:
${diffs.map((d) => `--- ${d.file} ---\n${d.changes.slice(0, 1000)}`).join("\n\n")}

Respond with a JSON object containing:
{
  "type": "feat|fix|docs|etc",
  "scope": "optional scope",
  "description": "short description",
  "body": "optional longer explanation",
  "breaking": false
}
`

    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      })

      const cleanedText = this.cleanJsonResponse(text)
      const suggestion = JSON.parse(cleanedText) as CommitSuggestion
      return this.validateSuggestion(suggestion)
    } catch (error) {
      console.error("OpenAI generation failed:", error)

      if (error instanceof Error) {
        if (error.message.includes("quota") || error.message.includes("limit")) {
          console.log("💡 Tip: Check your OpenAI API usage and billing")
        }
        if (error.message.includes("401") || error.message.includes("Unauthorized")) {
          console.log("💡 Tip: Check if your OpenAI API key is valid")
        }
      }

      throw error
    }
  }

  async generateTestCases(prompt: string): Promise<string> {
    if (!this.hasApiKey) {
      throw new Error("OpenAI API key is required")
    }

    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      })

      return this.cleanJsonResponse(text)
    } catch (error) {
      console.error("OpenAI test generation failed:", error)
      throw error
    }
  }

  async generateCommitSummary(): Promise<string | null> {
    if (!this.hasApiKey) {
      throw new Error("OpenAI API key is required")
    }

    try {
      const git = new GitService()
      const diffs = await git.getLatestCommitDiff()

      if (diffs.length === 0) {
        return null
      }

      const commitInfo = await git.getLatestCommitInfo()
      const diffSummary = this.createDiffSummary(diffs)

      const prompt = `
You are an expert developer who explains code changes clearly and concisely.

Analyze the following git commit and generate a clear, paragraph-format summary of what changed.

COMMIT INFO:
Message: ${commitInfo.message}
Files: ${diffSummary}

CHANGES:
${diffs.map((d) => `--- ${d.file} ---\n${d.changes.slice(0, 800)}`).join("\n\n")}

Write a 2-3 sentence paragraph explaining:
1. What functionality was added, modified, or removed
2. The purpose or impact of these changes
3. Any notable technical details

Keep it concise but informative. Write in past tense. Don't mention file names unless crucial.
`

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.4,
      })

      return text.trim()
    } catch (error) {
      console.error("Summary generation failed:", error)
      return null
    }
  }

  async findDuplicateCode(): Promise<DuplicateCode[]> {
    if (!this.hasApiKey) {
      throw new Error("OpenAI API key is required")
    }

    try {
      const git = new GitService()
      const recentCommits = await git.getRecentCommitsWithDiffs(10) // Get last 10 commits

      if (recentCommits.length === 0) {
        return []
      }

      const allCodeChanges = recentCommits.flatMap((commit) =>
        commit.diffs.map((diff) => ({
          commit: commit.hash.substring(0, 7),
          file: diff.file,
          changes: diff.changes,
        })),
      )

      const prompt = `
You are an expert code analyzer specializing in duplicate code detection.

Analyze the following code changes from recent commits and identify similar logic patterns that appear multiple times.

CODE CHANGES:
${allCodeChanges
  .map((change) => `--- ${change.file} (${change.commit}) ---\n${change.changes.slice(0, 800)}`)
  .join("\n\n")}

Find patterns where:
1. Similar logic appears in multiple files or commits
2. Code blocks that could be refactored into reusable functions
3. Repeated patterns that indicate potential duplication

For each duplicate pattern found, provide:
- A description of the pattern
- Similarity percentage (70-100%)
- Locations where it appears
- Refactoring suggestion

Respond with a JSON array:
[
  {
    "pattern": "Description of the duplicate pattern",
    "similarity": 85,
    "locations": [
      {"file": "path/to/file.js", "line": 42, "commit": "abc1234"},
      {"file": "path/to/other.js", "line": 15, "commit": "def5678"}
    ],
    "suggestion": "Extract into a reusable utility function"
  }
]

Only include patterns with similarity >= 70%. Return empty array if no significant duplicates found.
`

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.2,
      })

      const cleanedText = this.cleanJsonResponse(text)
      return JSON.parse(cleanedText) as DuplicateCode[]
    } catch (error) {
      console.error("Duplicate code analysis failed:", error)
      return []
    }
  }

  async performCodeReview(): Promise<CodeReview | null> {
    if (!this.hasApiKey) {
      throw new Error("OpenAI API key is required")
    }

    try {
      const git = new GitService()
      const diffs = await git.getLatestCommitDiff()

      if (diffs.length === 0) {
        return null
      }

      const commitInfo = await git.getLatestCommitInfo()
      const diffSummary = this.createDiffSummary(diffs)

      const prompt = `
You are an expert code reviewer with deep knowledge of software engineering best practices, security, and performance optimization.

Review the following code changes and provide detailed feedback.

COMMIT INFO:
Message: ${commitInfo.message}
Files: ${diffSummary}

CODE CHANGES:
${diffs.map((d) => `--- ${d.file} ---\n${d.changes.slice(0, 1200)}`).join("\n\n")}

Analyze for:
1. **Code Smells**: Poor naming, long functions, complex logic
2. **Security Issues**: SQL injection, XSS, authentication flaws
3. **Performance Problems**: Inefficient algorithms, memory leaks, unnecessary operations
4. **Best Practices**: Code organization, error handling, maintainability
5. **Bugs**: Logic errors, edge cases, potential runtime issues

Provide:
- Overall code quality score (1-10)
- Specific issues with severity (low/medium/high)
- Improvement suggestions
- Examples where helpful

Respond with JSON:
{
  "overallScore": 8,
  "issues": [
    {
      "severity": "high",
      "title": "Potential SQL Injection",
      "description": "User input is directly concatenated into SQL query",
      "file": "api/users.js",
      "line": 42,
      "suggestion": "Use parameterized queries or prepared statements"
    }
  ],
  "suggestions": [
    {
      "title": "Add Input Validation",
      "description": "Consider adding validation for user inputs",
      "example": "Use joi or zod for schema validation"
    }
  ]
}

Focus on actionable feedback. If code is good, say so with fewer issues.
`

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      })

      const cleanedText = this.cleanJsonResponse(text)
      return JSON.parse(cleanedText) as CodeReview
    } catch (error) {
      console.error("Code review failed:", error)
      return null
    }
  }

  async generateChangelog(commitCount?: number, sinceDate?: string): Promise<string | null> {
    if (!this.hasApiKey) {
      throw new Error("OpenAI API key is required")
    }

    try {
      const git = new GitService()
      const commits = await git.getCommitsForChangelog(commitCount, sinceDate)

      if (commits.length === 0) {
        return null
      }

      const latestTag = await git.getLatestTag()
      const currentDate = new Date().toISOString().split("T")[0]
      const versionNumber = latestTag ? this.incrementVersion(latestTag) : "1.0.0"

      const timeRange = commitCount
        ? `last ${commitCount} commits`
        : sinceDate
          ? `since ${sinceDate}`
          : "recent commits"

      const prompt = `
You are an expert technical writer who creates professional changelogs following conventional commit standards.

Generate a comprehensive CHANGELOG.md entry for the following commits (${timeRange}):

COMMITS:
${commits
  .map(
    (commit) => `
- ${commit.hash.substring(0, 7)}: ${commit.message}
  Author: ${commit.author}
  Date: ${commit.date}
`,
  )
  .join("\n")}

Create a changelog entry with:
1. **Version**: ${versionNumber}
2. **Date**: ${currentDate}
3. **Organized sections** by commit type (Features, Bug Fixes, Documentation, etc.)
4. **Breaking changes** section if any
5. **Summary statistics**

Format as proper markdown with:
- Clear section headers
- Bullet points for each change
- Commit hashes in parentheses
- Author attribution where relevant
- Professional, concise descriptions

Follow this structure:
\`\`\`
# Changelog

## [${versionNumber}] - ${currentDate}

### ✨ Features
- Description of new feature ([abc1234](commit-link))

### 🐛 Bug Fixes  
- Description of bug fix ([def5678](commit-link))

### 📚 Documentation
- Documentation updates ([ghi9012](commit-link))

### 🔧 Other Changes
- Other improvements ([jkl3456](commit-link))

### 📊 Summary
- **Total commits**: X
- **Features added**: X
- **Bugs fixed**: X
- **Contributors**: Author1, Author2
\`\`\`

Parse commit messages using conventional commit format. Group similar changes. Keep descriptions clear and user-focused.
`

      const { text } = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      })

      return text.trim()
    } catch (error) {
      console.error("Changelog generation failed:", error)
      return null
    }
  }

  private createDiffSummary(diffs: GitDiff[]): string {
    return diffs
      .map((diff) => {
        const { file, insertions, deletions } = diff
        return `${file} (+${insertions}/-${deletions})`
      })
      .join("\n")
  }

  private validateSuggestion(suggestion: CommitSuggestion): CommitSuggestion {
    // Ensure type is valid
    const validTypes = COMMIT_TYPES.map((t) => t.type)
    if (!validTypes.includes(suggestion.type)) {
      suggestion.type = "chore"
    }

    // Ensure description is not too long
    if (suggestion.description.length > 50) {
      suggestion.description = suggestion.description.slice(0, 47) + "..."
    }

    return suggestion
  }

  formatCommitMessage(suggestion: CommitSuggestion): string {
    const { type, scope, description, breaking } = suggestion
    const breakingIndicator = breaking ? "!" : ""
    const scopeStr = scope ? `(${scope})` : ""

    return `${type}${scopeStr}${breakingIndicator}: ${description}`
  }

  private cleanJsonResponse(text: string): string {
    let cleaned = text.trim()

    // Remove markdown code block formatting
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "")
    }
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "")
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.replace(/\s*```$/, "")
    }

    // Try to extract JSON object from conversational text
    const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/)
    // Try to extract JSON array from conversational text
    const jsonArrayMatch = cleaned.match(/\[[\s\S]*\]/)

    if (jsonArrayMatch) {
      cleaned = jsonArrayMatch[0]
    } else if (jsonObjectMatch) {
      cleaned = jsonObjectMatch[0]
    }

    // Find the first { or [ and corresponding closing bracket
    const firstBrace = cleaned.indexOf("{")
    const firstBracket = cleaned.indexOf("[")
    const lastBrace = cleaned.lastIndexOf("}")
    const lastBracket = cleaned.lastIndexOf("]")

    // Determine if we're dealing with an object or array
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      // It's an array
      if (lastBracket !== -1 && lastBracket > firstBracket) {
        cleaned = cleaned.substring(firstBracket, lastBracket + 1)
      }
    } else if (firstBrace !== -1) {
      // It's an object
      if (lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1)
      }
    }

    return cleaned.trim()
  }

  private incrementVersion(currentVersion: string): string {
    const versionMatch = currentVersion.match(/(\d+)\.(\d+)\.(\d+)/)
    if (!versionMatch) {
      return "1.0.0"
    }

    const [, major, minor, patch] = versionMatch
    const newPatch = Number.parseInt(patch) + 1
    return `${major}.${minor}.${newPatch}`
  }
}
