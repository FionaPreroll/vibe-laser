import { describe, expect, it } from 'vitest'
import { readBuildInfo } from './buildInfo.ts'

const now = new Date('2026-11-23T18:00:00Z')
const SHA = '0123456789abcdef0123456789abcdef01234567'

describe('readBuildInfo', () => {
  it('takes the commit and the run from GitHub Actions', () => {
    const env = {
      GITHUB_ACTIONS: 'true',
      GITHUB_SHA: SHA,
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REPOSITORY: 'FionaPreroll/vibe-laser',
      GITHUB_RUN_ID: '42',
      GITHUB_RUN_NUMBER: '7',
      GITHUB_RUN_ATTEMPT: '1',
      GITHUB_WORKFLOW: 'Deploy',
    }
    expect(readBuildInfo(env, () => 'unused', now)).toEqual({
      commit: SHA,
      modified: false,
      builtAt: '2026-11-23T18:00:00.000Z',
      ciRun: {
        url: 'https://github.com/FionaPreroll/vibe-laser/actions/runs/42',
        workflow: 'Deploy',
        number: '7',
        attempt: '1',
      },
    })
  })

  it('asks git elsewhere, and marks a working tree with changes', () => {
    const git = (...args: string[]) => (args[0] === 'rev-parse' ? `${SHA}\n` : ' M src/main.tsx\n')
    expect(readBuildInfo({}, git, now)).toMatchObject({ commit: SHA, modified: true, ciRun: null })
  })

  it('knows no commit without git', () => {
    expect(readBuildInfo({}, () => undefined, now)).toMatchObject({
      commit: null,
      modified: false,
      ciRun: null,
    })
  })
})
