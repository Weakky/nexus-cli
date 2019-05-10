import * as tar from 'tar'
import * as tmp from 'tmp'
import * as github from 'parse-github-url'
import * as fs from 'fs'
import ora from 'ora'
import * as request from 'request'
import * as execa from 'execa'
import chalk from 'chalk'

import { Template } from './templates'

export interface LoadOptions {
  installDependencies: boolean
}

export async function loadYogaStarter(
  template: Template,
  output: string,
  options: LoadOptions,
): Promise<void> {
  const tar = getYogaTemplateRepositoryTarInformation(template)
  const tmp = await downloadRepository(tar)

  await extractYogaStarterFromRepository(tmp, tar, output)

  if (options.installDependencies) {
    await installYogaStarter(output)
  }

  console.log(template.postIntallMessage)
}

interface TemplateRepositoryTarInformation {
  uri: string
  files: string
}

function getYogaTemplateRepositoryTarInformation(
  template: Template,
): TemplateRepositoryTarInformation {
  const meta = github(template.repo.uri)
  const uri = [
    `https://api.github.com/repos`,
    meta.repo,
    'tarball',
    template.repo.branch,
  ].join('/')

  return { uri, files: template.repo.path }
}

async function downloadRepository(
  tar: TemplateRepositoryTarInformation,
): Promise<string> {
  const spinner = ora(`Downloading starter from ${chalk.cyan(tar.uri)}`).start()
  const tmpPath = tmp.fileSync({
    postfix: '.tar.gz',
  })

  await new Promise(resolve => {
    request(tar.uri, {
      headers: {
        'User-Agent': 'prisma/create-yoga',
      },
    })
      .pipe(fs.createWriteStream(tmpPath.name))
      .on('close', resolve)
  })

  spinner.succeed()

  return tmpPath.name
}

async function extractYogaStarterFromRepository(
  tmp: string,
  repo: TemplateRepositoryTarInformation,
  output: string,
): Promise<void> {
  const spinner = ora(`Extracting content to ${chalk.cyan(output)}`)

  await tar.extract({
    file: tmp,
    cwd: output,
    filter: path => RegExp(repo.files).test(path),
    strip: repo.files.split('/').length,
  })

  spinner.succeed()

  return
}

export async function installYogaStarter(path: string): Promise<void> {
  const spinner = ora(`Installing dependencies 👩‍🚀`).start()

  process.chdir(path)

  try {
    if (await isYarnInstalled()) {
      await execa.shell('yarnpkg install', { stdio: `ignore` })
    } else {
      await execa.shell('npm install', { stdio: `ignore` })
    }

    spinner.succeed()
  } catch (err) {
    spinner.fail()
  }
}

async function isYarnInstalled(): Promise<boolean> {
  try {
    await execa.shell(`yarnpkg --version`, { stdio: `ignore` })
    return true
  } catch (err) {
    return false
  }
}
