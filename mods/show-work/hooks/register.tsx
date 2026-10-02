import { atom, memberOf, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import {
  attachmentLine,
  callLabel,
  contextLine,
  formatDuration,
  spinnerWord,
  tail,
} from './format'

const running = atom({ plugin: 'show-work', key: 'running' } as const, {})
const took = atom({ plugin: 'show-work', key: 'took' } as const, null)

// Attachments already logged; a reload logs them again, which is harmless.
const logged = new Set<string>()

// Bash output with each stream cut to its last lines, the cut said on top.
const bashTail = (output: unknown): unknown => {
  if (typeof output !== 'object' || output === null) {
    return output
  }
  const out = output as { stdout?: unknown; stderr?: unknown }
  const cutStream = (text: unknown): unknown => {
    if (typeof text !== 'string') {
      return text
    }
    const kept = tail(text)

    return kept.hidden > 0 ? `… ${kept.hidden} earlier lines\n${kept.text}` : text
  }

  return { ...out, stdout: cutStream(out.stdout), stderr: cutStream(out.stderr) }
}

export const register: Register = on => {
  // Nothing runs at a start; a reload or resume can leave calls in state.
  on('session.start', async ($, e, next) => {
    await update($, running, () => ({}))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const id = e.tool_use_id
    if (id === undefined) {
      return next(e)
    }
    const isMain = e.agentId === undefined
    if (isMain) {
      const label = callLabel(e.tool, e as unknown as Record<string, unknown>)
      await update($, running, calls => ({ ...calls, [id]: label }))
    }
    const startedAt = await $.clock.now()
    try {
      return await next(e)
    } finally {
      const ms = (await $.clock.now()) - startedAt
      await update($, memberOf(took, { requestId: id }), () => ms)
      if (isMain) {
        await update($, running, ({ [id]: _, ...rest }) => rest)
      }
    }
  })

  // Every read, search and listing on its own row, not folded into a count.
  on('ui.render', { component: 'ToolGroup' }, ($, e, next) =>
    next({ ...e, props: { ...e.props, isExpanded: true } }),
  )

  // A row unfolded from a group draws its output itself: cut Bash's there too,
  // and close every finished row with how long the call took.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const output = e.props.tool === 'Bash' ? bashTail(e.props.output) : e.props.output
    const drawn = await next({ ...e, props: { ...e.props, output } })
    const ms = e.props.isRunning ? null : await read($, memberOf(took, e))
    if (ms === null) {
      return drawn
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {drawn}
        <Text dimColor>{'     '}took {formatDuration(ms)}</Text>
      </Box>
    )
  })

  // A standalone row's output is its own ToolResult.
  on('ui.render', { component: 'ToolResult', props: { tool: 'Bash' } }, ($, e, next) =>
    e.props.isErrored ? next(e) : next({ ...e, props: { ...e.props, output: bashTail(e.props.output) } }),
  )

  // The spinner names what the turn is doing, not a playful word.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const calls = Object.values(await read($, running))

    return next({ ...e, props: { ...e.props, word: spinnerWord(e.props.mode, calls) } })
  })

  // What the first message carries: instruction files and context blocks.
  on('prompt.context', async ($, e, next) => {
    const result = await next(e)
    const files = (result.instructionFiles ?? e.instructionFiles ?? []).map(f => f.path)
    const [root, home] = await Promise.all([$.session.root(), $.env.get('HOME')])
    $.ui.log(contextLine(files, result.blocks.map(b => b.name), root, home))

    return result
  })

  // Each message the engine puts in front of the model on its own, once per
  // text; numbers aside, so a running count (tokens left) is not news.
  on('prompt.attachment', ($, e, next) => {
    const key = `${e.type}\0${e.text.replace(/\d+/g, '#')}`
    if (e.agentId === undefined && !logged.has(key)) {
      logged.add(key)
      $.ui.log(attachmentLine(e.type, e.origin, e.text.length))
    }

    return next(e)
  })
}
