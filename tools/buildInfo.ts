import { execFileSync } from 'node:child_process'
import type { Plugin } from 'vite'

/** What the About screen tells about the build players run; see src/about/buildInfo.ts. */
export interface BuildInfo {
  /** The full commit id the build was made from, or null without git. */
  readonly commit: string | null
  /** Whether the working tree had changes beyond that commit. */
  readonly modified: boolean
  /** When the build was made, as an ISO time. */
  readonly builtAt: string
  /** The GitHub Actions run that made the build, for builds made there. */
  readonly ciRun: {
    readonly url: string
    readonly workflow: string
    readonly number: string
    readonly attempt: string
  } | null
}

type Env = Readonly<Record<string, string | undefined>>
type Git = (...args: string[]) => string | undefined

/** Runs git in the project folder; undefined where git or the repository is missing. */
function git(...args: string[]): string | undefined {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return undefined
  }
}

/**
 * Reads the build's facts. GitHub Actions names its commit and run in the environment; elsewhere
 * git gives the commit, and a working tree with changes counts as modified.
 */
export function readBuildInfo(env: Env = process.env, run: Git = git, now = new Date()): BuildInfo {
  const onGitHub = env.GITHUB_ACTIONS === 'true'
  const commit = (onGitHub ? env.GITHUB_SHA : undefined) ?? run('rev-parse', 'HEAD')?.trim()
  const status = onGitHub ? '' : (run('status', '--porcelain') ?? '')
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = env
  const ciRun =
    onGitHub && GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
      ? {
          url: `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`,
          workflow: env.GITHUB_WORKFLOW ?? '',
          number: env.GITHUB_RUN_NUMBER ?? GITHUB_RUN_ID,
          attempt: env.GITHUB_RUN_ATTEMPT ?? '1',
        }
      : null
  return {
    commit: commit && /^[0-9a-f]{7,64}$/.test(commit) ? commit : null,
    modified: status.trim() !== '',
    builtAt: now.toISOString(),
    ciRun,
  }
}

/** Gives the game the module "virtual:build-info", whose default export is the BuildInfo. */
export function buildInfo(): Plugin {
  const id = 'virtual:build-info'
  const resolved = `\0${id}`
  let info: BuildInfo | undefined
  return {
    name: 'vibe-laser-build-info',
    resolveId: (source) => (source === id ? resolved : undefined),
    load(source) {
      if (source !== resolved) return undefined
      info ??= readBuildInfo()
      return `export default ${JSON.stringify(info)}`
    },
  }
}
