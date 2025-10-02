import simpleGit, { type SimpleGit } from "simple-git"
import type { GitDiff, CommitInfo, CommitImpact, DeveloperReport } from "./Types/types"

export class GitService {
  private git: SimpleGit

  constructor() {
    this.git = simpleGit()
  }

  async isGitRepository(): Promise<boolean> {
    try {
      await this.git.status()
      return true
    } catch {
      return false
    }
  }

  async getStagedFiles(): Promise<string[]> {
    const status = await this.git.status()
    return status.staged
  }

  async getAllChangedFiles(): Promise<string[]> {
    const status = await this.git.status()
    return [...status.modified, ...status.not_added, ...status.deleted, ...status.renamed.map((r) => r.to)]
  }

  async stageAllChanges(): Promise<void> {
    await this.git.add(".")
  }

  async push(): Promise<{ success: boolean; needsUpstream?: boolean; branch?: string; error?: string }> {
    try {
      await this.git.push()
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Check if it's an upstream branch error
      if (errorMessage.includes("no upstream branch") || errorMessage.includes("set-upstream")) {
        const currentBranch = await this.getCurrentBranch()
        return {
          success: false,
          needsUpstream: true,
          branch: currentBranch,
          error: errorMessage,
        }
      }

      return { success: false, error: errorMessage }
    }
  }

  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status()
    return status.current || "main"
  }

  async pushWithUpstream(branch: string): Promise<void> {
    await this.git.push(["-u", "origin", branch])
  }

  async getStagedDiff(): Promise<GitDiff[]> {
    const stagedFiles = await this.getStagedFiles()

    if (stagedFiles.length === 0) {
      return []
    }

    const diffs: GitDiff[] = []

    for (const file of stagedFiles) {
      try {
        const diff = await this.git.diff(["--cached", file])
        const stats = await this.git.diffSummary(["--cached", file])

        const fileStat = stats.files.find((f) => f.file === file)

        const insertions = fileStat && "insertions" in fileStat ? fileStat.insertions : 0
        const deletions = fileStat && "deletions" in fileStat ? fileStat.deletions : 0

        diffs.push({
          file,
          insertions,
          deletions,
          changes: diff,
        })
      } catch (error) {
        // Handle binary files or other diff errors
        diffs.push({
          file,
          insertions: 0,
          deletions: 0,
          changes: `Binary file or unable to get diff for ${file}`,
        })
      }
    }

    return diffs
  }

  async commit(message: string): Promise<void> {
    await this.git.commit(message)
  }

  async hasUnstagedChanges(): Promise<boolean> {
    const status = await this.git.status()
    return status.modified.length > 0 || status.not_added.length > 0
  }

  async hasCommits(): Promise<boolean> {
    try {
      await this.git.log({ maxCount: 1 })
      return true
    } catch {
      return false
    }
  }

  async hasCommitsToPush(): Promise<boolean> {
    try {
      // Check if there are commits ahead of the remote branch
      const status = await this.git.status()
      return status.ahead > 0
    } catch {
      // If we can't determine status, assume no commits to push
      return false
    }
  }

  async getLatestCommitInfo(): Promise<CommitInfo> {
    const log = await this.git.log({ maxCount: 1 })
    const latest = log.latest

    if (!latest) {
      throw new Error("No commits found")
    }

    return {
      hash: latest.hash,
      message: latest.message,
      author: latest.author_name,
      date: latest.date,
    }
  }

  async getLatestCommitDiff(): Promise<GitDiff[]> {
    try {
      const log = await this.git.log({ maxCount: 2 })

      if (log.all.length === 0) {
        throw new Error("No commits found")
      }

      const latestHash = log.latest?.hash
      if (!latestHash) {
        throw new Error("Unable to get latest commit hash")
      }

      // Get diff between latest commit and its parent (or initial commit)
      const parentHash = log.all.length > 1 ? log.all[1].hash : null

      const diffCommand = parentHash ? [parentHash, latestHash] : [latestHash]
      const diff = await this.git.diff(diffCommand)
      const stats = await this.git.diffSummary(diffCommand)

      const diffs: GitDiff[] = []

      for (const fileStat of stats.files) {
        const insertions = "insertions" in fileStat ? fileStat.insertions : 0
        const deletions = "deletions" in fileStat ? fileStat.deletions : 0

        // Get specific file diff
        const fileDiff = await this.git.diff([...diffCommand, "--", fileStat.file])

        diffs.push({
          file: fileStat.file,
          insertions,
          deletions,
          changes: fileDiff,
        })
      }

      return diffs
    } catch (error) {
      throw new Error(`Failed to get commit diff: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async analyzeCommitImpact(): Promise<CommitImpact | null> {
    try {
      const diffs = await this.getLatestCommitDiff()

      if (diffs.length === 0) {
        return null
      }

      const filesTouched = diffs.length
      let totalChanges = 0
      let criticalFiles = 0
      let complexityFactors = 0

      for (const diff of diffs) {
        totalChanges += diff.insertions + diff.deletions

        // Check for critical file types
        const fileName = diff.file.toLowerCase()
        if (
          fileName.includes("config") ||
          fileName.includes("package.json") ||
          fileName.includes("dockerfile") ||
          fileName.includes(".env") ||
          fileName.includes("migration") ||
          fileName.includes("schema")
        ) {
          criticalFiles++
          complexityFactors += 2
        }

        // Check for large changes
        if (diff.insertions + diff.deletions > 100) {
          complexityFactors += 1
        }

        // Check for new files
        if (diff.changes.includes("new file mode")) {
          complexityFactors += 1
        }

        // Check for deleted files
        if (diff.changes.includes("deleted file mode")) {
          complexityFactors += 2
        }
      }

      // Calculate complexity score (0-10)
      const complexityScore = Math.min(10, Math.floor(totalChanges / 50 + filesTouched / 5 + complexityFactors))

      // Determine risk level
      let riskLevel: "Low" | "Medium" | "High" = "Low"
      if (complexityScore >= 7 || criticalFiles > 0) {
        riskLevel = "High"
      } else if (complexityScore >= 4 || filesTouched > 5) {
        riskLevel = "Medium"
      }

      // Generate details
      const details = [
        `${totalChanges} total line changes`,
        criticalFiles > 0 ? `${criticalFiles} critical files affected` : null,
        totalChanges > 200 ? "Large changeset" : null,
        filesTouched > 10 ? "Many files touched" : null,
      ]
        .filter(Boolean)
        .join(", ")

      return {
        riskLevel,
        filesTouched,
        complexityScore,
        details: details || "Standard code changes",
      }
    } catch (error) {
      return null
    }
  }

  async generateDeveloperReport(): Promise<DeveloperReport[]> {
    try {
      console.log("⏳ Analyzing repository history...")

      // Get all commits with author and file information
      const log = await this.git.log({ format: { hash: "%H", author: "%an", files: "%s" } })

      if (log.all.length === 0) {
        return []
      }

      console.log(`📊 Processing ${log.all.length} commits...`)

      // Track author statistics
      const authorStats = new Map<string, { commits: number; files: Set<string> }>()

      // Process each commit to gather statistics
      let processedCommits = 0
      for (const commit of log.all) {
        const author = commit.author

        if (!authorStats.has(author)) {
          authorStats.set(author, { commits: 0, files: new Set() })
        }

        const stats = authorStats.get(author)!
        stats.commits++

        // Get files changed in this commit
        try {
          const commitDiff = await this.git.show([commit.hash, "--name-only", "--format="])
          const files = commitDiff.split("\n").filter((file) => file.trim() !== "")

          files.forEach((file) => stats.files.add(file))
        } catch (error) {
          // Skip if unable to get file info for this commit
        }

        processedCommits++
        if (processedCommits % 50 === 0) {
          console.log(`⚡ Processed ${processedCommits}/${log.all.length} commits...`)
        }
      }

      console.log("🔍 Identifying developer hotspots...")

      // Generate hotspots for each author (most frequently modified files)
      const reports: DeveloperReport[] = []

      for (const [author, stats] of authorStats.entries()) {
        // Get file modification frequency for this author
        const fileFrequency = new Map<string, number>()

        // Count how many times each file was modified by this author
        for (const commit of log.all) {
          if (commit.author === author) {
            try {
              const commitDiff = await this.git.show([commit.hash, "--name-only", "--format="])
              const files = commitDiff.split("\n").filter((file) => file.trim() !== "")

              files.forEach((file) => {
                fileFrequency.set(file, (fileFrequency.get(file) || 0) + 1)
              })
            } catch (error) {
              // Skip if unable to get file info
            }
          }
        }

        const filteredFiles = Array.from(fileFrequency.entries()).filter(([file]) => {
          const fileName = file.toLowerCase()

          // Exclude config, lock, and route files
          const excludePatterns = [
            "package-lock.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            ".env",
            ".gitignore",
            "dockerfile",
            "docker-compose",
            "tsconfig.json",
            "next.config",
            "tailwind.config",
            "/api/",
            "/route.ts",
            "/route.js",
            "node_modules/",
            ".git/",
            "dist/",
            "build/",
            ".map",
            ".min.js",
            ".min.css",
          ]

          return !excludePatterns.some((pattern) => fileName.includes(pattern))
        })

        // Get top 3 hotspots (most frequently modified relevant files)
        const hotspots = filteredFiles
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([file]) => {
            // Clean up file paths for better readability
            return file.replace(/^(src\/|app\/|components\/|pages\/|lib\/|utils\/)?/, "")
          })

        reports.push({
          author,
          commits: stats.commits,
          filesChanged: stats.files.size,
          hotspots: hotspots.length > 0 ? hotspots : ["No relevant files tracked"],
        })
      }

      // Sort by commit count (descending)
      return reports.sort((a, b) => b.commits - a.commits)
    } catch (error) {
      return []
    }
  }

  async getRecentCommitsWithDiffs(count = 10): Promise<Array<{ hash: string; message: string; diffs: GitDiff[] }>> {
    try {
      const log = await this.git.log({ maxCount: count })
      const commitsWithDiffs = []

      for (const commit of log.all) {
        try {
          // Get diff for this commit
          const parentHash = commit.refs ? null : await this.getParentCommit(commit.hash)
          const diffCommand = parentHash ? [parentHash, commit.hash] : [commit.hash]

          const diff = await this.git.diff(diffCommand)
          const stats = await this.git.diffSummary(diffCommand)

          const diffs: GitDiff[] = []
          for (const fileStat of stats.files) {
            const insertions = "insertions" in fileStat ? fileStat.insertions : 0
            const deletions = "deletions" in fileStat ? fileStat.deletions : 0

            const fileDiff = await this.git.diff([...diffCommand, "--", fileStat.file])

            diffs.push({
              file: fileStat.file,
              insertions,
              deletions,
              changes: fileDiff,
            })
          }

          commitsWithDiffs.push({
            hash: commit.hash,
            message: commit.message,
            diffs,
          })
        } catch (error) {
          // Skip commits that can't be processed
          continue
        }
      }

      return commitsWithDiffs
    } catch (error) {
      return []
    }
  }

  async getCommitsForChangelog(count?: number, since?: string): Promise<CommitInfo[]> {
    try {
      const options: any = {}

      if (count) {
        options.maxCount = count
      }

      if (since) {
        // Use 'from' instead of 'since' for simple-git compatibility
        options.from = since
      }

      // Default to last 10 commits if no options provided
      if (!count && !since) {
        options.maxCount = 10
      }

      const log = await this.git.log(options)

      return log.all.map((commit) => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
      }))
    } catch (error) {
      console.error("Failed to get commits for changelog:", error)
      return []
    }
  }

  async getLatestTag(): Promise<string | null> {
    try {
      const tags = await this.git.tags()
      return tags.latest || null
    } catch {
      return null
    }
  }

  private async getParentCommit(commitHash: string): Promise<string | null> {
    try {
      const result = await this.git.raw(["rev-parse", `${commitHash}^`])
      return result.trim()
    } catch {
      return null
    }
  }
}
