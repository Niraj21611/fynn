import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const CONFIG_DIR = path.join(os.homedir(), ".fynn")
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json")

interface Config {
  apiKey?: string
}

export class ConfigService {
  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
  }

  saveApiKey(apiKey: string): void {
    this.ensureConfigDir()
    const config: Config = { apiKey }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8")
  }

  getApiKey(): string | null {
    if (process.env.OPENAI_API_KEY) {
      return process.env.OPENAI_API_KEY
    }
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const config: Config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"))
        return config.apiKey || null
      }
    } catch (error) {
      return null
    }

    return null
  }

  hasApiKey(): boolean {
    return this.getApiKey() !== null
  }

  deleteApiKey(): void {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE)
    }
  }
}
