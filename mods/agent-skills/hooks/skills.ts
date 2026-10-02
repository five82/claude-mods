export type Skill = {
  name: string
  description: string
  // From `argument-hint`, when the skill gives one.
  argumentHint?: string
  // Absolute path of the skill's SKILL.md.
  path: string
  // Absolute path of the skill's folder; SKILL.md's relative paths resolve here.
  dir: string
}

const COMMAND_NAME = /^[A-Za-z0-9_-]{1,64}$/

const unquote = (value: string): string => {
  const v = value.trim()
  if (v.length >= 2 && v[0] === '"' && v.endsWith('"')) {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  if (v.length >= 2 && v[0] === "'" && v.endsWith("'")) {
    return v.slice(1, -1).replace(/''/g, "'")
  }
  return v
}

// The flat YAML frontmatter SKILL.md uses: `key: value` lines, quoted
// strings, `>` / `|` block scalars, and plain scalars continued on indented
// lines. Nested keys (`metadata:`) are skipped.
export const parseFrontmatter = (
  text: string,
): { fields: Record<string, string>; body: string } => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text)
  if (!match) return { fields: {}, body: text }

  const fields: Record<string, string> = {}
  const lines = match[1]!.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]!)
    if (!kv) continue
    const key = kv[1]!
    const raw = kv[2]!.trim()

    const block: string[] = []
    while (i + 1 < lines.length && /^(\s|$)/.test(lines[i + 1]!)) {
      block.push(lines[++i]!.trim())
    }

    if (/^[>|][+-]?$/.test(raw)) {
      fields[key] = (raw[0] === '>' ? block.join(' ') : block.join('\n')).trim()
    } else if (raw === '') {
      // An indented `key: value` first line makes this a nested map, not text.
      const first = block.find(l => l !== '')
      if (first && !/^[A-Za-z0-9_-]+:(\s|$)/.test(first)) {
        fields[key] = unquote(block.filter(l => l !== '').join(' '))
      }
    } else {
      fields[key] = [unquote(raw), ...block.filter(l => l !== '')].join(' ')
    }
  }

  return { fields, body: text.slice(match[0].length) }
}

// Undefined when the skill has no description, as the spec requires one.
export const toSkill = (text: string, dir: string): Skill | undefined => {
  const { fields } = parseFrontmatter(text)
  const name = fields.name || dir.split('/').pop() || ''
  const description = fields.description
  if (!description || !COMMAND_NAME.test(name)) return undefined

  const argumentHint = fields['argument-hint']
  return {
    name,
    description,
    ...(argumentHint ? { argumentHint } : {}),
    path: `${dir}/SKILL.md`,
    dir,
  }
}

// Earlier lists win on a name clash (project before user).
export const mergeSkills = (...lists: Skill[][]): Skill[] => {
  const byName = new Map<string, Skill>()
  for (const list of lists) {
    for (const skill of list) if (!byName.has(skill.name)) byName.set(skill.name, skill)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const listingSection = (skills: Skill[]): string =>
  [
    '# Agent skills',
    '',
    'These skills come from `.agents/skills` directories. They are not in the Skill tool; to use one, read its SKILL.md with the Read tool before starting the task, then follow it. Paths inside a SKILL.md are relative to its folder.',
    'When a task matches a skill\'s description, use that skill.',
    '',
    ...skills.map(s => `- ${s.name}: ${s.description} (${s.path})`),
  ].join('\n')

// What `/<skill> args` sends the model: a pointer to the file, not its body,
// so the transcript stays short and the model reads it as it would unprompted.
export const invocationPrompt = (skill: Skill, args: string): string =>
  [
    `Use the "${skill.name}" skill: read ${skill.path} and follow it.`,
    args.trim() ? `\n${args.trim()}` : '',
  ].join('\n').trimEnd()
