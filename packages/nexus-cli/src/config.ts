import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'
import * as dotenv from 'dotenv'

/**
 * Find a `prisma.yml` file if it exists
 */
export function findPrismaConfigFile(projectDir: string): string | null {
  let definitionPath = path.join(projectDir, 'prisma.yml')

  if (fs.existsSync(definitionPath)) {
    return definitionPath
  }

  definitionPath = path.join(process.cwd(), 'prisma', 'prisma.yml')

  if (fs.existsSync(definitionPath)) {
    return definitionPath
  }

  return null
}

export function findConfigFile(
  fileName: string,
  opts: { required: true },
): string
export function findConfigFile(
  fileName: string,
  opts: { required: false },
): string | undefined
/**
 * Find a config file
 */
export function findConfigFile(fileName: string, opts: { required: boolean }) {
  const configPath = ts.findConfigFile(
    /*searchPath*/ process.cwd(),
    ts.sys.fileExists,
    fileName,
  )

  if (!configPath) {
    if (opts.required === true) {
      throw new Error(`Could not find a valid '${fileName}'.`)
    } else {
      return undefined
    }
  }

  return configPath
}

export function injectCustomEnvironmentVariables(env?: string) {
  const nodeEnv = env || process.env.NODE_ENV

  dotenv.config({
    path: path.join(process.cwd(), nodeEnv ? `.env.${nodeEnv}` : '.env'),
  })
}
