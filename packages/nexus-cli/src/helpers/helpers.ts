import * as fs from 'fs'
import * as path from 'path'
import * as prettier from 'prettier'

/**
 * Find all files recursively in a directory based on an extension
 */
export function findFileByExtension(
  basePath: string,
  ext: string,
  files?: string[],
  result?: string[],
): string[] {
  files = files || fs.readdirSync(basePath)
  result = result || []

  files.forEach(file => {
    const newbase = path.join(basePath, file)

    if (fs.statSync(newbase).isDirectory()) {
      result = findFileByExtension(
        newbase,
        ext,
        fs.readdirSync(newbase),
        result,
      )
    } else {
      if (path.extname(file) === ext) {
        result!.push(newbase)
      }
    }
  })
  return result
}

export async function resolvePrettierOptions(
  path: string,
): Promise<prettier.Options> {
  const options = (await prettier.resolveConfig(path)) || {}

  return options
}

export function prettify(
  code: string,
  options: prettier.Options = {},
  parser: prettier.BuiltInParserName = 'typescript',
) {
  try {
    return prettier.format(code, {
      ...options,
      parser,
    })
  } catch (e) {
    console.log(
      `There is a syntax error in generated code, unformatted code printed, error: ${JSON.stringify(
        e,
      )}`,
    )
    return code
  }
}
