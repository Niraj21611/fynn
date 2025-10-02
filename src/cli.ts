#!/usr/bin/env node

import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import inquirer from "inquirer"
import { GitService } from "./git"
import { AIService } from "./ai"
import { TestService } from "./test"

const program = new Command()

program
  .name("fynn")
  .description("AI-powered commit message generator")
  .version("1.0.0")
  .option("--add", "Stage all changes before generating commit")
  .option("--push", "Push changes after committing (handles full workflow)")
  .option("--ask", "Ask for confirmation before committing")
  .option("--dry-run", "Generate message without committing")
  .option("--test", "Generate test cases for the latest commit")
  .option("--impact", "Show commit impact analysis (risk level, files touched, complexity)")
  .option("--summary", "Show a summary of what changed in the latest commit")
  .option("--report", "Show developer impact report with commit statistics and hotspots")
  .option("--duplicate", "Find similar logic that appears multiple times across commits")
  .option("--review", "AI-powered code review with suggestions and issue detection")
  .option("--log [count]", "Generate CHANGELOG.md from recent commits (e.g., --log 5 for last 5 commits)")
  .addHelpText('after', `
Examples:
  $ fynn --add --ask          Stage changes and generate commit with confirmation
  $ fynn --push               Generate commit and push to remote
  $ fynn --dry-run            Preview commit message without committing
  $ fynn --test               Generate test cases for latest commit
  $ fynn --review             Get AI code review of latest commit
  $ fynn --log 10             Generate changelog from last 10 commits
  $ fynn setup                Setup OpenAI API key

For more information, visit: https://github.com/yourusername/fynn
`)
  .action(async (options) => {
    // Show help if no options provided
    const hasOptions = Object.keys(options).length > 0
    if (!hasOptions) {
      program.help()
      return
    }
    const spinner = ora("Initializing...").start()

    try {
      const git = new GitService()

      // Check if we're in a git repository
      if (!(await git.isGitRepository())) {
        spinner.fail("Not a git repository")
        process.exit(1)
      }

      // Check if API key is required for this operation
      const requiresApiKey = options.test || options.summary || options.duplicate || options.review || options.log !== undefined || options.push || (!options.impact && !options.report)
      
      if (requiresApiKey && !process.env.OPENAI_API_KEY) {
        spinner.fail("OpenAI API key not found")
        console.log(chalk.yellow("\n💡 To use this feature, you need to set up your OpenAI API key"))
        console.log(chalk.cyan("\nRun: ") + chalk.white("fynn setup") + chalk.cyan(" for instructions"))
        console.log(chalk.gray("\nOr set it directly:"))
        console.log(chalk.gray("  export OPENAI_API_KEY='your-api-key-here'"))
        process.exit(1)
      }

      if (options.test) {
        spinner.text = "Generating test cases..."
        const testService = new TestService()
        const result = await testService.generateTestsForCommit()

        if (result.success) {
          spinner.succeed(result.message)
          if (result.location) {
            console.log(chalk.green(`📁 Test files saved to: ${result.location}`))
          }
        } else {
          spinner.fail(result.message)
          process.exit(1)
        }
        return
      }

      if (options.impact) {
        spinner.text = "Analyzing commit impact..."
        const impact = await git.analyzeCommitImpact()

        if (impact) {
          spinner.succeed("Impact analysis complete!")
          console.log("\n" + chalk.cyan("📊 Commit Impact Summary:"))
          console.log(
            chalk.white(
              `Risk Level: ${
                impact.riskLevel === "High"
                  ? chalk.red(impact.riskLevel)
                  : impact.riskLevel === "Medium"
                    ? chalk.yellow(impact.riskLevel)
                    : chalk.green(impact.riskLevel)
              }`,
            ),
          )
          console.log(chalk.white(`Files Touched: ${impact.filesTouched}`))
          console.log(chalk.white(`Complexity Score: ${impact.complexityScore}/10`))
          console.log(chalk.gray(`\nDetails: ${impact.details}`))
        } else {
          spinner.fail("No commits found to analyze")
          process.exit(1)
        }
        return
      }

      if (options.summary) {
        spinner.text = "Generating commit summary..."
        const ai = new AIService()
        const summary = await ai.generateCommitSummary()

        if (summary) {
          spinner.succeed("Summary generated!")
          console.log("\n" + chalk.cyan("📝 Commit Summary:"))
          console.log(chalk.white(summary))
        } else {
          spinner.fail("No commits found to summarize")
          process.exit(1)
        }
        return
      }

      if (options.report) {
        spinner.text = "Analyzing developer impact..."
        const report = await git.generateDeveloperReport()

        if (report && report.length > 0) {
          spinner.succeed("Developer impact analysis complete!")
          console.log("\n" + chalk.cyan("👥 Developer Impact Report"))
          console.log(chalk.cyan("───────────────────────────────────────────────"))

          report.forEach((dev) => {
            console.log(
              chalk.white.bold(
                `${dev.author.padEnd(20)} Commits: ${dev.commits}   Files Changed: ${dev.filesChanged}   Hotspots: ${dev.hotspots.join(", ")}`,
              ),
            )
          })
        } else {
          spinner.fail("No commit history found to analyze")
          process.exit(1)
        }
        return
      }

      if (options.duplicate) {
        spinner.text = "Scanning for duplicate code patterns..."
        const ai = new AIService()
        const duplicates = await ai.findDuplicateCode()

        if (duplicates && duplicates.length > 0) {
          spinner.succeed("Duplicate code analysis complete!")
          console.log("\n" + chalk.cyan("🔍 Duplicate Code Finder"))
          console.log(chalk.cyan("───────────────────────────────────────────────"))

          duplicates.forEach((duplicate, index) => {
            console.log(chalk.white.bold(`\n${index + 1}. ${duplicate.pattern}`))
            console.log(chalk.gray(`   Similarity: ${duplicate.similarity}%`))
            console.log(chalk.yellow(`   Locations:`))
            duplicate.locations.forEach((location) => {
              console.log(chalk.gray(`     • ${location.file}:${location.line} (${location.commit})`))
            })
            if (duplicate.suggestion) {
              console.log(chalk.green(`   💡 Suggestion: ${duplicate.suggestion}`))
            }
          })
        } else {
          spinner.succeed("No significant duplicate code patterns found!")
        }
        return
      }

      if (options.review) {
        spinner.text = "Performing AI code review..."
        const ai = new AIService()
        const review = await ai.performCodeReview()

        if (!review) {
          spinner.fail("No commits found to review")
          console.log(chalk.yellow("💡 Make at least one commit before running code review"))
          process.exit(1)
        }

        if (review) {
          spinner.succeed("Code review complete!")
          console.log("\n" + chalk.cyan("🔍 AI Code Review"))
          console.log(chalk.cyan("───────────────────────────────────────────────"))

          if (review.overallScore) {
            console.log(
              chalk.white(
                `Overall Score: ${
                  review.overallScore >= 8
                    ? chalk.green(review.overallScore + "/10")
                    : review.overallScore >= 6
                      ? chalk.yellow(review.overallScore + "/10")
                      : chalk.red(review.overallScore + "/10")
                }`,
              ),
            )
          }

          if (review.issues && review.issues.length > 0) {
            console.log(chalk.yellow("\n⚠️  Issues Found:"))
            review.issues.forEach((issue, index) => {
              const severityColor =
                issue.severity === "high" ? chalk.red : issue.severity === "medium" ? chalk.yellow : chalk.blue
              console.log(chalk.white(`\n${index + 1}. ${severityColor(issue.severity.toUpperCase())}: ${issue.title}`))
              console.log(chalk.gray(`   File: ${issue.file}:${issue.line}`))
              console.log(chalk.gray(`   ${issue.description}`))
              if (issue.suggestion) {
                console.log(chalk.green(`   💡 Fix: ${issue.suggestion}`))
              }
            })
          }

          if (review.suggestions && review.suggestions.length > 0) {
            console.log(chalk.green("\n✨ Improvement Suggestions:"))
            review.suggestions.forEach((suggestion, index) => {
              console.log(chalk.white(`\n${index + 1}. ${suggestion.title}`))
              console.log(chalk.gray(`   ${suggestion.description}`))
              if (suggestion.example) {
                console.log(chalk.blue(`   Example: ${suggestion.example}`))
              }
            })
          }

          if (!review.issues?.length && !review.suggestions?.length) {
            console.log(chalk.green("\n✅ No issues found! Code looks good."))
          }
        } else {
          spinner.fail("No code changes found to review")
          process.exit(1)
        }
        return
      }

      if (options.log !== undefined || options.since) {
        spinner.text = "Generating changelog..."
        const ai = new AIService()

        let commitCount: number | undefined
        let sinceDate: string | undefined

        if (options.log !== undefined) {
          // Handle --log flag with optional number
          if (typeof options.log === "string" && !isNaN(Number.parseInt(options.log))) {
            commitCount = Number.parseInt(options.log)
          } else if (typeof options.log === "boolean") {
            commitCount = 10 // Default to last 10 commits
          }
        }

        if (options.since) {
          sinceDate = options.since
        }

        const changelog = await ai.generateChangelog(commitCount, sinceDate)

        if (changelog) {
          // Write to CHANGELOG.md file
          const fs = await import("fs/promises")
          const path = await import("path")

          const changelogPath = path.join(process.cwd(), "CHANGELOG.md")
          await fs.writeFile(changelogPath, changelog, "utf8")

          spinner.succeed("Changelog generated successfully!")
          console.log(chalk.green(`📄 CHANGELOG.md created at: ${changelogPath}`))

          // Show preview of changelog
          console.log("\n" + chalk.cyan("📋 Changelog Preview:"))
          console.log(chalk.cyan("───────────────────────────────────────────────"))
          const lines = changelog.split("\n").slice(0, 15) // Show first 15 lines
          lines.forEach((line) => {
            if (line.startsWith("#")) {
              console.log(chalk.blue.bold(line))
            } else if (line.startsWith("##")) {
              console.log(chalk.cyan.bold(line))
            } else if (line.startsWith("- ")) {
              console.log(chalk.white(line))
            } else {
              console.log(chalk.gray(line))
            }
          })
          if (changelog.split("\n").length > 15) {
            console.log(chalk.gray("... (see CHANGELOG.md for full content)"))
          }
        } else {
          spinner.fail("No commits found to generate changelog")
          process.exit(1)
        }
        return
      }

      if (options.push) {
        // First check if there are commits to push
        const hasCommitsToPush = await git.hasCommitsToPush()

        if (hasCommitsToPush) {
          // There are commits ready to push
          spinner.text = "Pushing existing commits..."
          const pushResult = await git.push()

          if (pushResult.success) {
            spinner.succeed("Changes pushed successfully!")
            return
          } else if (pushResult.needsUpstream && pushResult.branch) {
            spinner.stop()
            console.log(chalk.yellow(`✖ Push failed: ${pushResult.error}`))

            if (options.ask) {
              const { setupUpstream } = await inquirer.prompt([
                {
                  type: "confirm",
                  name: "setupUpstream",
                  message: `No upstream branch found. Set '${pushResult.branch}' as upstream and push?`,
                  default: true,
                },
              ])

              if (!setupUpstream) {
                console.log(chalk.yellow("Push cancelled. You can manually set upstream later with:"))
                console.log(chalk.gray(`git push --set-upstream origin ${pushResult.branch}`))
                return
              }
            }

            // Auto-setup upstream
            const upstreamSpinner = ora(`Setting upstream and pushing to origin/${pushResult.branch}...`).start()
            try {
              await git.pushWithUpstream(pushResult.branch)
              upstreamSpinner.succeed(`Successfully pushed and set upstream to origin/${pushResult.branch}!`)
              return
            } catch (error) {
              upstreamSpinner.fail(
                `Failed to set upstream: ${error instanceof Error ? error.message : "Unknown error"}`,
              )
              return
            }
          } else {
            spinner.fail(`Push failed: ${pushResult.error}`)
            console.log(chalk.yellow("💡 You may need to set up a remote repository or check your permissions"))
            return
          }
        }

        // No commits to push, check for staged changes
        let stagedFiles = await git.getStagedFiles()

        if (stagedFiles.length === 0) {
          // No staged changes, stage all changes
          spinner.text = "Staging all changes..."
          const changedFiles = await git.getAllChangedFiles()
          if (changedFiles.length === 0) {
            spinner.fail("No changes found to stage or push")
            process.exit(1)
          }
          await git.stageAllChanges()
          stagedFiles = await git.getStagedFiles()
          console.log(chalk.green(`✅ Staged ${changedFiles.length} file(s)`))
        } else {
          console.log(chalk.green(`✅ Found ${stagedFiles.length} already staged file(s)`))
        }

        // Continue with commit and push workflow
      } else {
        // Regular workflow without --push
        let stagedFiles = await git.getStagedFiles()

        if (stagedFiles.length === 0 && options.add) {
          spinner.text = "Staging all changes..."
          const changedFiles = await git.getAllChangedFiles()
          if (changedFiles.length === 0) {
            spinner.fail("No changes found to stage")
            process.exit(1)
          }
          await git.stageAllChanges()
          stagedFiles = await git.getStagedFiles()
          console.log(chalk.green(`✅ Staged ${changedFiles.length} file(s)`))
        } else if (stagedFiles.length > 0) {
          console.log(chalk.green(`✅ Found ${stagedFiles.length} already staged file(s)`))
        }

        // Check for staged files
        if (stagedFiles.length === 0) {
          spinner.fail(
            "No staged changes found. Use --add to stage all changes or stage manually with: git add <files>",
          )
          process.exit(1)
        }
      }

      // Get staged files for commit message generation
      const stagedFiles = await git.getStagedFiles()

      spinner.text = "Analyzing staged changes..."
      const diffs = await git.getStagedDiff()

      spinner.text = "Generating commit message with AI..."
      const shouldAsk = options.ask === true
      const ai = new AIService()
      const suggestion = await ai.generateCommitMessage(diffs)
      const commitMessage = ai.formatCommitMessage(suggestion)

      if (shouldAsk) {
        spinner.succeed("Commit message generated!")

        // Display the suggestion
        console.log("\n" + chalk.cyan("📝 Suggested commit message:"))
        console.log(chalk.white.bold(commitMessage))

        if (suggestion.body) {
          console.log("\n" + chalk.gray("Body:"))
          console.log(chalk.gray(suggestion.body))
        }

        console.log("\n" + chalk.yellow("📁 Files to be committed:"))
        stagedFiles.forEach((file) => {
          console.log(chalk.gray(`  • ${file}`))
        })
      } else {
        spinner.stop()
      }

      if (options.dryRun) {
        console.log("\n" + chalk.blue("🔍 Dry run mode - no commit made"))
        return
      }

      let finalMessage = commitMessage

      if (shouldAsk) {
        const { action, customMessage } = await inquirer.prompt([
          {
            type: "list",
            name: "action",
            message: "What would you like to do?",
            choices: [
              { name: "Commit with this message", value: "commit" },
              { name: "Edit the message", value: "edit" },
              { name: "Cancel", value: "cancel" },
            ],
          },
          {
            type: "input",
            name: "customMessage",
            message: "Enter your commit message:",
            default: commitMessage,
            when: (answers) => answers.action === "edit",
          },
        ])

        if (action === "cancel") {
          console.log(chalk.yellow("Commit cancelled"))
          return
        }

        finalMessage = customMessage || commitMessage
      }

      // Commit changes
      const commitSpinner = ora("Committing changes...").start()
      await git.commit(finalMessage)
      commitSpinner.succeed(`Committed: ${finalMessage}`)

      if (options.push) {
        const pushSpinner = ora("Pushing changes...").start()

        const pushResult = await git.push()

        if (pushResult.success) {
          pushSpinner.succeed("Changes pushed successfully!")
        } else if (pushResult.needsUpstream && pushResult.branch) {
          pushSpinner.stop()
          console.log(chalk.yellow(`✖ Push failed: ${pushResult.error}`))

          if (options.ask) {
            const { setupUpstream } = await inquirer.prompt([
              {
                type: "confirm",
                name: "setupUpstream",
                message: `No upstream branch found. Set '${pushResult.branch}' as upstream and push?`,
                default: true,
              },
            ])

            if (setupUpstream) {
              const upstreamSpinner = ora(`Setting upstream and pushing to origin/${pushResult.branch}...`).start()
              try {
                await git.pushWithUpstream(pushResult.branch)
                upstreamSpinner.succeed(`Successfully pushed and set upstream to origin/${pushResult.branch}!`)
              } catch (error) {
                upstreamSpinner.fail(
                  `Failed to set upstream: ${error instanceof Error ? error.message : "Unknown error"}`,
                )
              }
            } else {
              console.log(chalk.yellow("Push cancelled. You can manually set upstream later with:"))
              console.log(chalk.gray(`git push --set-upstream origin ${pushResult.branch}`))
            }
          } else {
            // Auto-setup upstream in non-interactive mode
            const upstreamSpinner = ora(`Setting upstream and pushing to origin/${pushResult.branch}...`).start()
            try {
              await git.pushWithUpstream(pushResult.branch)
              upstreamSpinner.succeed(`Successfully pushed and set upstream to origin/${pushResult.branch}!`)
            } catch (error) {
              upstreamSpinner.fail(
                `Failed to set upstream: ${error instanceof Error ? error.message : "Unknown error"}`,
              )
            }
          }
        } else {
          pushSpinner.fail(`Push failed: ${pushResult.error}`)
          console.log(chalk.yellow("💡 You may need to set up a remote repository or check your permissions"))
        }
      }
    } catch (error) {
      spinner.fail(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
      process.exit(1)
    }
  })

program
  .command("setup")
  .description("Setup OpenAI API key")
  .action(async () => {
    console.log("\n" + chalk.blue("🔧 OpenAI API Key Setup"))
    console.log("\n" + chalk.green("Get your OpenAI API key:"))
    console.log(chalk.gray("1. Visit: https://platform.openai.com/api-keys"))
    console.log(chalk.gray("2. Create a new API key"))
    console.log(chalk.gray("3. Copy the key"))

    console.log("\n" + chalk.blue("Set your API key:"))
    console.log(chalk.gray("Windows PowerShell:"))
    console.log(chalk.yellow('$env:OPENAI_API_KEY="your-api-key-here"'))
    console.log(chalk.gray("Windows CMD:"))
    console.log(chalk.yellow("set OPENAI_API_KEY=your-api-key-here"))
    console.log(chalk.gray("Linux/Mac:"))
    console.log(chalk.yellow('export OPENAI_API_KEY="your-api-key-here"'))

    console.log("\n" + chalk.green("💡 Pro tip: Add it to your shell profile for permanent setup"))
  })

program.parse()
