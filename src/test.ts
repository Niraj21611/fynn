import { AIService } from "./ai"
import { GitService } from "./git"
import type { TestSuite, CommitInfo } from "./Types/types"
import fs from "fs/promises"
import path from "path"

export class TestService {
  private ai: AIService
  private git: GitService

  constructor() {
    this.ai = new AIService()
    this.git = new GitService()
  }

  async generateTestsForCommit(): Promise<{ success: boolean; message: string; location?: string }> {
    try {
      // Check if there are any commits
      const hasCommits = await this.git.hasCommits()
      if (!hasCommits) {
        return {
          success: false,
          message: "No commits found. Please commit your changes first to generate tests.",
        }
      }

      // Get the latest commit diff
      const latestCommitDiff = await this.git.getLatestCommitDiff()
      if (!latestCommitDiff || latestCommitDiff.length === 0) {
        return {
          success: false,
          message: "No changes found in the latest commit.",
        }
      }

      // Get commit info for naming
      const commitInfo = await this.git.getLatestCommitInfo()

      // Generate test suites for each changed file
      const testSuites: TestSuite[] = []

      for (const diff of latestCommitDiff) {
        if (this.shouldGenerateTestsForFile(diff.file)) {
          const testSuite = await this.generateTestSuiteForFile(diff)
          if (testSuite) {
            testSuites.push(testSuite)
          }
        }
      }

      if (testSuites.length === 0) {
        return {
          success: false,
          message: "No testable code changes found in the latest commit.",
        }
      }

      // Create Test directory and save test files
      const testDir = await this.createTestDirectory()
      const savedFiles: string[] = []

      for (const testSuite of testSuites) {
        const testFileName = this.generateTestFileName(testSuite.fileName, commitInfo.hash)
        const testFilePath = path.join(testDir, testFileName)
        const testContent = this.generateTestFileContent(testSuite, commitInfo)

        await fs.writeFile(testFilePath, testContent, "utf8")
        savedFiles.push(testFileName)
      }

      return {
        success: true,
        message: `Generated ${testSuites.length} test file(s) for commit: ${commitInfo.message}`,
        location: `Test/${savedFiles.join(", ")}`,
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate tests: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  private shouldGenerateTestsForFile(fileName: string): boolean {
    const testableExtensions = [".js", ".ts", ".py", ".java", ".cpp", ".c", ".go", ".rs", ".php"]
    const excludePatterns = ["/test/", "/tests/", ".test.", ".spec.", "/node_modules/", "/dist/", "/build/"]

    // Check if file has testable extension
    const hasTestableExtension = testableExtensions.some((ext) => fileName.endsWith(ext))
    if (!hasTestableExtension) return false

    // Exclude test files and common build directories
    const isExcluded = excludePatterns.some((pattern) => fileName.includes(pattern))
    return !isExcluded
  }

  private async generateTestSuiteForFile(diff: any): Promise<TestSuite | null> {
    try {
      const prompt = `
Analyze the following code changes and generate test scenarios in a simple table format:

File: ${diff.file}
Changes: ${diff.changes}

Generate test scenarios that include:
1. Basic functionality tests
2. Edge cases and boundary conditions  
3. Error handling scenarios
4. Different input variations

Respond with a JSON object containing:
{
  "fileName": "original_file_name",
  "functionName": "main_function_or_class_name",
  "testCases": [
    {
      "scenario": "Clear description of what is being tested",
      "input": "The input data or user action",
      "expectedOutput": "The expected result or behavior"
    }
  ]
}

Focus on practical test scenarios that cover the functionality. Keep descriptions clear and concise.
`

      const response = await this.ai.generateTestCases(prompt)
      const testSuite = JSON.parse(response) as TestSuite

      return testSuite
    } catch (error) {
      console.error(`Failed to generate tests for ${diff.file}:`, error)
      return null
    }
  }

  private async createTestDirectory(): Promise<string> {
    const testDir = path.join(process.cwd(), "Test")

    try {
      await fs.access(testDir)
    } catch {
      await fs.mkdir(testDir, { recursive: true })
    }

    return testDir
  }

  private generateTestFileName(originalFile: string, commitHash: string): string {
    const baseName = path.basename(originalFile, path.extname(originalFile))
    const shortHash = commitHash.substring(0, 7)

    return `${baseName}_test_${shortHash}.txt`
  }

  private getTestFileExtension(originalFile: string): string {
    const ext = path.extname(originalFile)

    switch (ext) {
      case ".py":
        return ".py"
      case ".js":
      case ".ts":
        return ".test.js"
      case ".java":
        return ".java"
      case ".cpp":
      case ".c":
        return ".cpp"
      case ".go":
        return "_test.go"
      case ".rs":
        return ".rs"
      case ".php":
        return ".php"
      default:
        return ".test.txt"
    }
  }

  private generateTestFileContent(testSuite: TestSuite, commitInfo: CommitInfo): string {
    let content = `TEST SCENARIOS FOR: ${testSuite.fileName}\n`
    content += `=`.repeat(50) + `\n\n`
    content += `Commit: ${commitInfo.hash}\n`
    content += `Message: ${commitInfo.message}\n`
    content += `Generated: ${new Date().toISOString()}\n`
    content += `Function/Feature: ${testSuite.functionName || "Main functionality"}\n\n`

    content += `TEST CASES:\n`
    content += `=`.repeat(50) + `\n\n`

    // Create table header
    content += `| Test Scenario                    | Input                           | Expected Output                 |\n`
    content += `|----------------------------------|----------------------------------|----------------------------------|\n`

    // Add test cases as table rows
    testSuite.testCases.forEach((testCase, index) => {
      const scenario = this.truncateText(testCase.scenario || `Test ${index + 1}`, 30)
      const input = this.truncateText(String(testCase.input), 30)
      const output = this.truncateText(String(testCase.expectedOutput), 30)

      content += `| ${scenario.padEnd(32)} | ${input.padEnd(32)} | ${output.padEnd(32)} |\n`
    })

    content += `\n\nDETAILED TEST DESCRIPTIONS:\n`
    content += `=`.repeat(50) + `\n\n`

    // Add detailed descriptions
    testSuite.testCases.forEach((testCase, index) => {
      content += `${index + 1}. ${testCase.scenario || `Test ${index + 1}`}\n`
      content += `   Input: ${testCase.input}\n`
      content += `   Expected: ${testCase.expectedOutput}\n\n`
    })

    return content
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + "..."
  }
}
