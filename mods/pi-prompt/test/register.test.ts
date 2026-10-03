import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const CWD = '/work/proj'

const RUN = {
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

const FACTS = {
  model: 'claude-opus-5-5',
  promptModel: 'claude-opus-5-5',
  surfaces: ['terminal'],
  tools: ['Read', 'Bash', 'Edit', 'Write', 'Grep', 'Glob', 'Agent'],
  outputStyle: null,
  traits: [],
} as const

const ENGINE = [
  { id: 'intro', text: 'Intro.', scope: 'shared' as const },
  { id: 'system', text: 'System.', scope: 'shared' as const },
  { id: 'doing_tasks', text: 'Tasks.', scope: 'shared' as const },
  { id: 'tone', text: 'Tone.', scope: 'shared' as const },
  { id: 'memory', text: 'Memory.', scope: 'session' as const },
]

const setup = (
  on: On,
  store?: Record<string, unknown>,
  engine: readonly (typeof ENGINE)[number][] = ENGINE,
) => {
  mock.store(on, store)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: CWD }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('prompt.compose', () => ({ sections: engine }))
  on('command.run', () => ({ text: 'engine ran it' }))
}

test("replaces the core sections with pi's prompt by default", async ($, on) => {
  setup(on)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  const { sections } = await $.prompt.compose(FACTS)
  expect(sections.map(s => s.id)).toEqual(['pi-prompt:body', 'memory', 'pi-prompt:cwd'])
  expect(sections[0]?.scope).toBe('shared')

  const body = sections[0]?.text
  expect(body).toContain('operating inside Claude Code, a coding agent harness')
  expect(body).toContain('- Read: Read file contents')
  expect(body).toContain('- Use Write only for new files or complete rewrites.')
  expect(body).toContain('- Be concise in your responses')
  // Grep and Glob are offered, so pi's bash-for-search rule is not.
  expect(body).not.toContain('Use bash for file operations')
  expect(sections[2]?.text).toBe(`<cwd>\n${CWD}\n</cwd>`)
})

test('/pi-prompt toggles it', async ($, on) => {
  setup(on)
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  expect((await $.command.run({ ...RUN, command: 'pi-prompt', args: '' })).text).toContain('off')
  expect((await $.prompt.compose(FACTS)).sections.map(s => s.id)).toEqual(ENGINE.map(s => s.id))

  expect((await $.command.run({ ...RUN, command: 'pi-prompt', args: '' })).text).toContain('on')
  expect((await $.prompt.compose(FACTS)).sections[0]?.id).toBe('pi-prompt:body')

  // Another command passes through.
  expect((await $.command.run({ ...RUN, command: 'other', args: '' })).text).toBe('engine ran it')
})

test('stays off in a new session when it was turned off', async ($, on) => {
  setup(on, { enabled: false })
  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })
  expect((await $.prompt.compose(FACTS)).sections.map(s => s.id)).toEqual(ENGINE.map(s => s.id))
})

test('leaves a prompt with no core sections alone', async ($, on) => {
  setup(on, undefined, [{ id: 'bare', text: 'Bare.', scope: 'shared' }])
  const { sections } = await $.prompt.compose({ ...FACTS, traits: ['bare'] })
  expect(sections.map(s => s.id)).toEqual(['bare'])
})
