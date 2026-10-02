import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code/testing'

const CWD = '/Users/ken/projects/claude-mods'

const HINT = {
  plugin: 'prompt-footer',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

// A file system of `files` (path → text) and the directories above them.
const mockFs = (on: On, files: Record<string, string>) => {
  const isDir = (path: string) => Object.keys(files).some(f => f.startsWith(`${path}/`))
  on('fs.stat', ($, e) => {
    if (!(e.path in files) && !isDir(e.path)) {
      throw new Error(`ENOENT: ${e.path}`)
    }

    return {
      value: { kind: e.path in files ? 'file' : 'dir', size: 0, mtimeMs: 0, isLink: false },
    }
  })
  on('fs.read', ($, e) => {
    if (!(e.path in files)) {
      throw new Error(`ENOENT: ${e.path}`)
    }

    return { value: files[e.path] }
  })
}

const mockSession = (on: On) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: CWD }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [],
    },
  }))
  on('settings.read', () => ({ value: { effortLevel: 'high' } }))
  mock.env(on, { HOME: '/Users/ken' })
}

test('draws location, context and model under the prompt', async ($, on) => {
  mockSession(on)
  mock.clock(on)
  mockFs(on, { [`${CWD}/.git/HEAD`]: 'ref: refs/heads/main\n' })

  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...HINT, surface })
    expect(await ui.find({ type: 'Text', text: '~/projects/claude-mods (main)' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '42%/200k' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'claude-opus-5-5 · high' })).toBeDefined()
    await ui.unmount()
  }
})

test('follows a branch switch made outside the session', async ($, on) => {
  mockSession(on)
  const clock = mock.clock(on)
  const files: Record<string, string> = { [`${CWD}/.git/HEAD`]: 'ref: refs/heads/main\n' }
  mockFs(on, files)

  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  files[`${CWD}/.git/HEAD`] = 'ref: refs/heads/feature/x\n'
  await clock.advance(1000)

  const ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '~/projects/claude-mods (feature/x)' })).toBeDefined()
  await ui.unmount()
})

test('shows a detached HEAD, and no branch outside a repository', async ($, on) => {
  mockSession(on)
  const clock = mock.clock(on)
  const files: Record<string, string> = { [`${CWD}/.git/HEAD`]: 'f11f39b0c1d2e3f4\n' }
  mockFs(on, files)

  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  let ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '~/projects/claude-mods (detached)' })).toBeDefined()
  await ui.unmount()

  delete files[`${CWD}/.git/HEAD`]
  await clock.advance(1000)
  ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '~/projects/claude-mods' })).toBeDefined()
  await ui.unmount()
})
