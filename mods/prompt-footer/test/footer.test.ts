import { expect, test } from 'claude-code/testing'

const CWD = '/Users/ken/projects/claude-mods'

const HINT = {
  plugin: 'prompt-footer',
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

test('draws location, context and model under the prompt', async ($, on) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.cwd', () => ({ value: CWD }))
  on('env.get', () => ({ value: '/Users/ken' }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 84_000, window: 200_000, percent: 42 },
      rateLimits: [],
    },
  }))
  on('settings.read', () => ({ value: { effortLevel: 'high' } }))
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: 'main\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))

  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...HINT, surface })
    expect(await ui.find({ type: 'Text', text: '~/projects/claude-mods (main)' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '42%/200k' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'claude-opus-5-5 · high' })).toBeDefined()
    await ui.unmount()
  }
})
