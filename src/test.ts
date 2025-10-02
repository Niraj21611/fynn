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
      const hasCommits = await this.git.hasCommits()
      if (!hasCommits) {
        return {
          success: false,
          message: "No commits found. Please commit your changes first to generate tests.",
        }
      }
      const latestCommitDiff = await this.git.getLatestCommitDiff()
      if (!latestCommitDiff || latestCommitDiff.length === 0) {
        return {
          success: false,
          message: "No changes found in the latest commit.",
        }
      }
      const commitInfo = await this.git.getLatestCommitInfo()
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
    const hasTestableExtension = testableExtensions.some((ext) => fileName.endsWith(ext))
    if (!hasTestableExtension) return false
    const isExcluded = excludePatterns.some((pattern) => fileName.includes(pattern))
    return !isExcluded
  }

  private async generateTestSuiteForFile(diff: any): Promise<TestSuite | null> {
    try {
      const prompt = `
You are a test case generator. Analyze the following code changes and generate test scenarios.

File: ${diff.file}
Changes:
${diff.changes.slice(0, 2000)}

Generate at least 3-5 test scenarios covering:
1. Basic functionality tests
2. Edge cases and boundary conditions  
3. Error handling scenarios
4. Different input variations

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "fileName": "${diff.file}",
  "functionName": "main_function_or_class_name",
  "testCases": [
    {
      "scenario": "Test basic functionality with valid input",
      "input": "sample input value",
      "expectedOutput": "expected result"
    },
    {
      "scenario": "Test with empty input",
      "input": "empty string",
      "expectedOutput": "error message or default value"
    },
    {
      "scenario": "Test with edge case",
      "input": "boundary value",
      "expectedOutput": "expected behavior"
    }
  ]
}

Do not include any explanation, only return the JSON object. Must have at least 3 test cases.
`

      const response = await this.ai.generateTestCases(prompt)
      const testSuite = JSON.parse(response) as TestSuite
      if (!testSuite.testCases || !Array.isArray(testSuite.testCases) || testSuite.testCases.length === 0) {
        console.error(`AI returned empty test cases for ${diff.file}`)
        return null
      }

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
    if (!originalFile || typeof originalFile !== 'string') {
      return `test_${commitHash.substring(0, 7)}.txt`
    }
    
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
    let content = `TEST SCENARIOS FOR: ${testSuite.fileName || 'Unknown File'}\n`
    content += `=`.repeat(50) + `\n\n`
    content += `Commit: ${commitInfo.hash}\n`
    content += `Message: ${commitInfo.message}\n`
    content += `Generated: ${new Date().toISOString()}\n`
    content += `Function/Feature: ${testSuite.functionName || "Main functionality"}\n\n`
    const testCases = Array.isArray(testSuite.testCases) ? testSuite.testCases : []
    
    if (testCases.length === 0) {
      content += `No test cases generated.\n`
      return content
    }

    content += `TEST CASES:\n`
    content += `=`.repeat(50) + `\n\n`
    content += `| Test Scenario                    | Input                           | Expected Output                 |\n`
    content += `|----------------------------------|----------------------------------|----------------------------------|\n`
    testCases.forEach((testCase, index) => {
      const scenario = this.truncateText(testCase.scenario || `Test ${index + 1}`, 30)
      const input = this.truncateText(String(testCase.input || ''), 30)
      const output = this.truncateText(String(testCase.expectedOutput || ''), 30)

      content += `| ${scenario.padEnd(32)} | ${input.padEnd(32)} | ${output.padEnd(32)} |\n`
    })

    content += `\n\nDETAILED TEST DESCRIPTIONS:\n`
    content += `=`.repeat(50) + `\n\n`
    testCases.forEach((testCase, index) => {
      content += `${index + 1}. ${testCase.scenario || `Test ${index + 1}`}\n`
      content += `   Input: ${testCase.input || 'N/A'}\n`
      content += `   Expected: ${testCase.expectedOutput || 'N/A'}\n\n`
    })

    return content
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + "..."
  }
}
