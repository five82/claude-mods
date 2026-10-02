import { expect, mock, test } from 'claude-code/testing'
import type { On, TestBody } from 'claude-code/testing'

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

const mockSession = (on: On, dirs = { root: CWD, cwd: CWD }) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.root', () => ({ value: dirs.root }))
  on('session.cwd', () => ({ value: dirs.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [],
    },
  }))
  on('turn.step', async function* ($, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
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
    expect(await ui.find({ type: 'Text', text: 'claude-opus-5-5' })).toBeDefined()
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

test("stays on the session's root through a shell cd, follows /cd", async ($, on) => {
  const dirs = { root: CWD, cwd: CWD }
  mockSession(on, dirs)
  const clock = mock.clock(on)
  const OTHER = '/Users/ken/projects/other'
  mockFs(on, {
    [`${CWD}/.git/HEAD`]: 'ref: refs/heads/main\n',
    [`${OTHER}/.git/HEAD`]: 'ref: refs/heads/dev\n',
  })

  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  dirs.cwd = OTHER
  await clock.advance(1000)
  let ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '~/projects/claude-mods (main)' })).toBeDefined()
  await ui.unmount()

  dirs.root = OTHER
  await clock.advance(1000)
  ui = await $.ui.mount({ ...HINT, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '~/projects/other (dev)' })).toBeDefined()
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

// Runs one main-loop request at `effort`.
const step = async ($: Parameters<TestBody>[0], effort: 'low' | 'medium' | 'high') => {
  const stream = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort, messageCount: 1 })
  for await (const _ of stream) {
  }
}

test('shows effort only once a request reports it, never a leftover', async ($, on) => {
  mockSession(on)
  mock.clock(on)
  mockFs(on, {})

  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  await step($, 'high')
  // A resume or reload starts again with `high` kept in state.
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    let ui = await $.ui.mount({ ...HINT, surface })
    expect(await ui.find({ type: 'Text', text: 'claude-opus-5-5' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'high' })).toBeUndefined()
    await ui.unmount()

    await step($, 'medium')
    ui = await $.ui.mount({ ...HINT, surface })
    expect(await ui.find({ type: 'Text', text: 'claude-opus-5-5 · medium' })).toBeDefined()
    await ui.unmount()
    await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  }
})
