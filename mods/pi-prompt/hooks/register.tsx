import type { EngineInterface, Register } from 'claude-code'

import { replaceCore } from './prompt'

const COMMAND = 'pi-prompt'

// Kept in $.store so the choice holds across sessions; unset means on.
const isEnabled = async ($: EngineInterface) => (await $.store.get('enabled')) !== false

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({
      name: COMMAND,
      description: "Toggle pi's system prompt in place of Claude Code's core instructions",
    })
    return result
  })

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    if (!(await isEnabled($))) return result
    return { sections: replaceCore(result.sections, e.tools, await $.session.cwd()) }
  })

  on('command.run', { command: COMMAND }, async $ => {
    const enabled = !(await isEnabled($))
    await $.store.set('enabled', enabled)
    return {
      text: enabled
        ? "pi system prompt on: replaces Claude Code's core instructions from the next request."
        : "pi system prompt off: Claude Code's own prompt from the next request.",
    }
  })
}
