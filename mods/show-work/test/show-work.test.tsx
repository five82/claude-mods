import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

const start = (on: On) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  mock.env(on, { HOME: '/Users/ken' })
}

test('unfolds tool groups into their own rows', async ($, on) => {
  const seen: boolean[] = []
  on('ui.render', { component: 'ToolGroup' }, ($, e) => {
    seen.push(e.props.isExpanded)
    const { Text } = $.ui.resolve(e)

    return <Text>group</Text>
  })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: 'show-work',
      surface,
      component: 'ToolGroup',
      props: { calls: [], isActive: false, isExpanded: false },
    })
    await ui.unmount()
  }
  expect(seen).toEqual([true, true])
})

test('names the running call in the spinner, and says how long it took', async ($, on) => {
  start(on)
  const clock = mock.clock(on)
  let release = () => {}
  let entered = () => {}
  const isRunning = new Promise<void>(resolve => {
    entered = resolve
  })
  on('tool.call', { tool: 'Bash' }, async () => {
    entered()
    await new Promise<void>(resolve => {
      release = resolve
    })
    await clock.advance(4200)

    return { result: { stdout: '', stderr: '', interrupted: false } }
  })
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>{e.props.word}</Text>
  })
  const drawOutput = ($: Parameters<Parameters<On>[2]>[0], e: { surface: 'terminal' | 'desktop'; props: { output?: unknown } }) => {
    const { Text } = $.ui.resolve(e as never)

    return <Text>{String((e.props.output as { stdout: string }).stdout)}</Text>
  }
  on('ui.render', { component: 'ToolResult' }, ($, e) => drawOutput($, e as never))
  on('ui.render', { component: 'ToolUse' }, ($, e) => drawOutput($, e as never))
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })

  const call = $.tool.call({ tool: 'Bash', tool_use_id: 'b1', command: 'npm test' })
  await isRunning
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: 'show-work',
      surface,
      component: 'Spinner',
      props: { word: 'Sauteing', message: null, suffix: '…', mode: 'tool-use' },
    })
    expect(await ui.find({ type: 'Text', text: 'bash npm test' })).toBeDefined()
    await ui.unmount()
  }
  release()
  await call

  const stdout = Array.from({ length: 8 }, (_, i) => `l${i + 1}`).join('\n')
  const cut = '… 3 earlier lines\nl4\nl5\nl6\nl7\nl8'
  for (const surface of SURFACES) {
    const result = await $.ui.mount({
      plugin: 'show-work',
      surface,
      component: 'ToolResult',
      requestId: 'b1',
      props: { tool_use_id: 'b1', tool: 'Bash', isErrored: false, output: { stdout, stderr: '' } },
    })
    expect(await result.find({ type: 'Text', text: cut })).toBeDefined()
    await result.unmount()

    // A row unfolded from a group draws its own output, and every row its time.
    const row = await $.ui.mount({
      plugin: 'show-work',
      surface,
      component: 'ToolUse',
      requestId: 'b1',
      props: {
        tool_use_id: 'b1',
        tool: 'Bash',
        input: { command: 'npm test' },
        isRunning: false,
        isErrored: false,
        isInterrupted: false,
        output: { stdout, stderr: '' },
      },
    })
    expect(await row.find({ type: 'Text', text: cut })).toBeDefined()
    expect(await row.find({ type: 'Text', text: '     took 4.2s' })).toBeDefined()
    await row.unmount()

    const spinner = await $.ui.mount({
      plugin: 'show-work',
      surface,
      component: 'Spinner',
      props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' },
    })
    expect(await spinner.find({ type: 'Text', text: 'Thinking' })).toBeDefined()
    await spinner.unmount()
  }
})

test('logs context the engine injects on its own', async ($, on) => {
  start(on)
  const lines: string[] = []
  on('ui.log', ($, e) => {
    lines.push(e.text)
  })
  on('prompt.attachment', ($, e) => ({ text: e.text }))
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })

  await $.prompt.attachment({
    type: 'todo_reminder',
    text: 'x'.repeat(420),
    origin: { kind: 'engine' },
  })
  await $.prompt.attachment({
    type: 'todo_reminder',
    text: 'from a subagent',
    origin: { kind: 'engine' },
    agentId: 'a1',
  })
  // The same text again, a count aside, is not logged twice.
  for (const left of [900, 800]) {
    await $.prompt.attachment({
      type: 'total_tokens_reminder',
      text: `${left} tokens left`,
      origin: { kind: 'engine' },
    })
  }
  expect(lines).toEqual([
    'injected todo_reminder · 420 chars',
    'injected total_tokens_reminder · 15 chars',
  ])
})
