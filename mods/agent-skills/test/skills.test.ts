import { expect, test } from 'claude-code/testing'

import { invocationPrompt, listingSection, mergeSkills, parseFrontmatter, toSkill } from '../hooks/skills'

test('reads flat, quoted and block-scalar frontmatter', () => {
  const { fields, body } = parseFrontmatter(
    [
      '---',
      'name: pdf',
      'description: >',
      '  Extract text from PDFs.',
      '  Use for any .pdf file.',
      "license: 'MIT'",
      'metadata:',
      '  author: someone',
      '---',
      '# PDF',
    ].join('\n'),
  )
  expect(fields.name).toBe('pdf')
  expect(fields.description).toBe('Extract text from PDFs. Use for any .pdf file.')
  expect(fields.license).toBe('MIT')
  expect(fields.author).toBeUndefined()
  expect(body).toBe('# PDF')
})

test('reads a plain description continued on indented lines', () => {
  const { fields } = parseFrontmatter(
    [
      '---',
      'name: itemaudit',
      'description:',
      '  Diagnose a Spindle queue item or daemon issue from audit artifacts. Use for',
      '  root-cause investigation.',
      'user-invocable: true',
      'argument-hint: [item_id]',
      '---',
    ].join('\n'),
  )
  expect(fields.description).toBe(
    'Diagnose a Spindle queue item or daemon issue from audit artifacts. Use for root-cause investigation.',
  )
  expect(fields['user-invocable']).toBe('true')
  expect(fields['argument-hint']).toBe('[item_id]')
})

test('makes a skill only when it has a description and a usable name', () => {
  const dir = '/p/.agents/skills/lint'
  expect(toSkill('---\ndescription: "Lints: code"\n---\n', dir)).toEqual({
    name: 'lint',
    description: 'Lints: code',
    path: `${dir}/SKILL.md`,
    dir,
  })
  expect(toSkill('---\ndescription: x\nargument-hint: [file]\n---\n', dir)?.argumentHint).toBe('[file]')
  expect(toSkill('---\nname: lint\n---\n', dir)).toBeUndefined()
  expect(toSkill('no frontmatter', dir)).toBeUndefined()
  expect(toSkill('---\nname: has space\ndescription: x\n---\n', dir)).toBeUndefined()
})

test('project skills win over user skills of the same name', () => {
  const a = { name: 'x', description: 'project', path: '/p/SKILL.md', dir: '/p' }
  const b = { name: 'x', description: 'user', path: '/u/SKILL.md', dir: '/u' }
  const c = { name: 'a', description: 'user', path: '/u2/SKILL.md', dir: '/u2' }
  expect(mergeSkills([a], [b, c]).map(s => s.description)).toEqual(['user', 'project'])
})

test('lists skills and points a /command at the file', () => {
  const s = { name: 'x', description: 'Does x.', path: '/p/x/SKILL.md', dir: '/p/x' }
  expect(listingSection([s])).toContain('- x: Does x. (/p/x/SKILL.md)')
  expect(invocationPrompt(s, '')).toBe('Use the "x" skill: read /p/x/SKILL.md and follow it.')
  expect(invocationPrompt(s, ' on foo ')).toBe(
    'Use the "x" skill: read /p/x/SKILL.md and follow it.\n\non foo',
  )
})
