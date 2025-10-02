export interface CommitType {
  type: string
  description: string
  emoji?: string
}

export interface GitDiff {
  file: string
  insertions: number
  deletions: number
  changes: string
}

export interface CommitSuggestion {
  type: string
  scope?: string
  description: string
  body?: string
  breaking?: boolean
}

export interface TestCase {
  scenario: string
  input: string
  expectedOutput: string
}

export interface TestSuite {
  fileName: string
  functionName?: string
  testCases: TestCase[]
  description?: string
}

export interface CommitInfo {
  hash: string
  message: string
  author: string
  date: string
}

export interface CommitImpact {
  riskLevel: "Low" | "Medium" | "High"
  filesTouched: number
  complexityScore: number
  details: string
}

export interface DeveloperReport {
  author: string
  commits: number
  filesChanged: number
  hotspots: string[]
}

export interface DuplicateCode {
  pattern: string
  similarity: number
  locations: Array<{
    file: string
    line: number
    commit: string
  }>
  suggestion?: string
}

export interface CodeReviewIssue {
  severity: "low" | "medium" | "high"
  title: string
  description: string
  file: string
  line: number
  suggestion?: string
}

export interface CodeReviewSuggestion {
  title: string
  description: string
  example?: string
}

export interface CodeReview {
  overallScore?: number
  issues?: CodeReviewIssue[]
  suggestions?: CodeReviewSuggestion[]
}

export interface ChangelogEntry {
  version: string
  date: string
  commits: Array<{
    type: string
    scope?: string
    description: string
    hash: string
    author: string
    breaking?: boolean
  }>
  summary: {
    features: number
    fixes: number
    breaking: number
    total: number
  }
}

export const COMMIT_TYPES: CommitType[] = [
  { type: "feat", description: "A new feature", emoji: "✨" },
  { type: "fix", description: "A bug fix", emoji: "🐛" },
  { type: "docs", description: "Documentation only changes", emoji: "📚" },
  { type: "style", description: "Changes that do not affect the meaning of the code", emoji: "💎" },
  { type: "refactor", description: "A code change that neither fixes a bug nor adds a feature", emoji: "📦" },
  { type: "perf", description: "A code change that improves performance", emoji: "🚀" },
  { type: "test", description: "Adding missing tests or correcting existing tests", emoji: "🚨" },
  { type: "build", description: "Changes that affect the build system or external dependencies", emoji: "🛠" },
  { type: "ci", description: "Changes to our CI configuration files and scripts", emoji: "⚙️" },
  { type: "chore", description: "Other changes that don't modify src or test files", emoji: "♻️" },
  { type: "revert", description: "Reverts a previous commit", emoji: "🗑" },
]
