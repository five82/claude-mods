import type { EngineInterface, Register } from 'claude-code'

import { invocationPrompt, listingSection, mergeSkills, toSkill } from './skills'
import type { Skill } from './skills'

const PLUGIN = 'agent-skills'

// Rebuilt by every session.start, which a hot reload fires again.
let skills: Skill[] = []
let commands = new Map<string, Skill>()

const scan = async ($: EngineInterface, root: string): Promise<Skill[]> => {
  const entries = await $.fs.list(root).catch(() => [])
  const found: Skill[] = []
  for (const entry of entries) {
    // Symlinked skill folders show as `other`; reading SKILL.md settles it.
    if (entry.kind === 'file' || entry.name.startsWith('.')) continue
    const dir = `${root}/${entry.name}`
    const text = await $.fs.read(`${dir}/SKILL.md`).catch(() => undefined)
    const skill = text === undefined ? undefined : toSkill(text, dir)
    if (skill) found.push(skill)
  }
  return found
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)

    const home = await $.env.get('HOME')
    skills = mergeSkills(
      await scan($, `${e.cwd}/.agents/skills`),
      home ? await scan($, `${home}/.agents/skills`) : [],
    )

    // Leave a name to whoever already has it (a native skill, a built-in).
    const taken = new Set(
      (await $.command.list()).filter(c => c.plugin !== PLUGIN).map(c => c.name),
    )
    commands = new Map()
    for (const skill of skills) {
      if (taken.has(skill.name)) continue
      await $.command.register({
        name: skill.name,
        description: `${skill.description} (.agents/skills)`,
        argumentHint: skill.argumentHint ?? '[request]',
      })
      commands.set(skill.name, skill)
    }

    return result
  })

  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    if (skills.length === 0 || e.traits.includes('bare')) return result

    return {
      sections: [
        ...result.sections,
        { id: `${PLUGIN}:listing`, text: listingSection(skills), scope: 'session' },
      ],
    }
  })

  on('command.run', async ($, e, next) => {
    const skill = commands.get(e.command)
    if (!skill) return next(e)

    // A command.run hook may not submit (the turn would wait on it), so the
    // prompt goes from a timer: it runs as the next turn once the command ends.
    const text = invocationPrompt(skill, e.args)
    $.clock.after(0, () => $.prompt.submit({ text, asUser: true }))
    return {}
  })
}
