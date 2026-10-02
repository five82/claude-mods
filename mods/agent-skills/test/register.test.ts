import { expect, mock, test } from 'claude-code/testing'

const CWD = '/work/proj'
const HOME = '/Users/me'

const FILES: Record<string, string> = {
  [`${CWD}/.agents/skills/deploy/SKILL.md`]: '---\nname: deploy\ndescription: Ships the app.\n---\nSteps.',
  [`${HOME}/.agents/skills/deploy/SKILL.md`]: '---\nname: deploy\ndescription: User copy.\n---\n',
  [`${HOME}/.agents/skills/review/SKILL.md`]: '---\nname: review\ndescription: Reviews code.\n---\n',
  [`${HOME}/.agents/skills/commit/SKILL.md`]: '---\nname: commit\ndescription: Taken.\n---\n',
}

const DIRS: Record<string, string[]> = {
  [`${CWD}/.agents/skills`]: ['deploy', 'README.md'],
  [`${HOME}/.agents/skills`]: ['deploy', 'review', 'commit'],
}

const RUN = {
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
} as const

const entry = (name: string) => ({
  name,
  kind: name.endsWith('.md') ? ('file' as const) : ('dir' as const),
  size: 0,
  mtimeMs: 0,
  isLink: false,
})

test('lists .agents skills for the model and serves them as commands', async ($, on) => {
  const registered: string[] = []
  const submitted: string[] = []
  const clock = mock.clock(on)
  mock.env(on, { HOME })

  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('fs.list', ($, e) => {
    const names = DIRS[e.path ?? '']
    if (!names) throw new Error('ENOENT')
    return { value: names.map(entry) }
  })
  on('fs.read', ($, e) => {
    const text = FILES[e.path]
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  on('command.list', () => ({
    value: [{ name: 'commit', description: 'native', source: 'user' as const }],
  }))
  on('command.register', ($, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  on('prompt.submit', ($, e) => {
    submitted.push(e.text)
    return { text: e.text }
  })
  on('prompt.compose', () => ({
    sections: [{ id: 'intro', text: 'Intro.', scope: 'shared' as const }],
  }))
  on('command.run', () => ({ text: 'engine ran it' }))

  await $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true })

  expect(registered).toEqual(['deploy', 'review'])

  const { sections } = await $.prompt.compose({
    model: 'claude-opus-5-5',
    promptModel: 'claude-opus-5-5',
    surfaces: ['terminal'],
    tools: [],
    outputStyle: null,
    traits: [],
  })
  const listing = sections.find(s => s.id === 'agent-skills:listing')
  expect(listing?.text).toContain(`- deploy: Ships the app. (${CWD}/.agents/skills/deploy/SKILL.md)`)
  expect(listing?.text).toContain(`- review: Reviews code. (${HOME}/.agents/skills/review/SKILL.md)`)
  expect(listing?.text).not.toContain('User copy.')

  await $.command.run({ ...RUN, command: 'deploy', args: 'to staging' })
  expect(submitted).toEqual([])
  // Submitted from a timer, once the command has ended.
  await clock.settle()
  expect(submitted).toEqual([
    `Use the "deploy" skill: read ${CWD}/.agents/skills/deploy/SKILL.md and follow it.\n\nto staging`,
  ])

  // A name the mod doesn't own passes through.
  expect((await $.command.run({ ...RUN, command: 'commit', args: '' })).text).toBe('engine ran it')
})
