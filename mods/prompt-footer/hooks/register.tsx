import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import {
  contextColor,
  contextLabel,
  locationLabel,
  modelLabel,
  shortenPath,
} from './format'

const branch = atom({ plugin: 'prompt-footer', key: 'branch' } as const, null)
const effort = atom({ plugin: 'prompt-footer', key: 'effort' } as const, null)

const readBranch = async ($: EngineInterface): Promise<string | null> => {
  const r = await $.process.run(['git', 'branch', '--show-current'])
  const name = r.stdout.trim()

  return r.exitCode === 0 && name ? name : null
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const name = await readBranch($)
    await update($, branch, () => name)

    // Until the first request reports one, show the configured effort.
    const { effortLevel } = await $.settings.read()
    if (typeof effortLevel === 'string') {
      await update($, effort, current => current ?? effortLevel)
    }

    return next(e)
  })

  // The model may have switched branches during the turn.
  on('turn.complete', async ($, e, next) => {
    const name = await readBranch($)
    await update($, branch, () => name)

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const level = e.effort === undefined ? null : String(e.effort)
      await update($, effort, () => level)
    }

    return yield* next(e)
  })

  // Context fill moved: redraw.
  on('session.measure', ($, e, next) => {
    $.ui.invalidate('ui.render')

    return next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const [cwd, home, model, usage, branchName, effortLevel] = await Promise.all([
      $.session.cwd(),
      $.env.get('HOME'),
      $.session.model(),
      $.session.usage(),
      read($, branch),
      read($, effort),
    ])
    const { percent, window } = usage.context

    return (
      <Box flexDirection="row">
        <Text dimColor wrap="truncate-end">
          {locationLabel(shortenPath(cwd, home), branchName)}
        </Text>
        <Text dimColor> · </Text>
        <Text dimColor={contextColor(percent) === undefined} color={contextColor(percent)}>
          {contextLabel(percent, window)}
        </Text>
        <Text dimColor> · {modelLabel(model, effortLevel)}</Text>
      </Box>
    )
  })
}
