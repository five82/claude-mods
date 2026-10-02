import { expect, test } from 'claude-code/testing'

import {
  attachmentLine,
  callLabel,
  contextLine,
  formatDuration,
  spinnerWord,
  tail,
} from '../hooks/format'

test('formats durations as pi does', () => {
  expect(formatDuration(4200)).toBe('4.2s')
  expect(formatDuration(65_000)).toBe('1m 5s')
  expect(formatDuration(3_723_000)).toBe('1h 2m 3s')
})

test('keeps the last lines and counts the rest', () => {
  const text = Array.from({ length: 12 }, (_, i) => `l${i + 1}`).join('\n')
  expect(tail(`${text}\n`)).toEqual({ text: 'l8\nl9\nl10\nl11\nl12', hidden: 7 })
  expect(tail('a\nb')).toEqual({ text: 'a\nb', hidden: 0 })
})

test('names a call by what it acts on', () => {
  expect(callLabel('Bash', { command: 'npm test\necho hi' })).toBe('bash npm test')
  expect(callLabel('Read', { file_path: '/a/b.ts' })).toBe('read /a/b.ts')
  expect(callLabel('Grep', { pattern: 'foo' })).toBe('grep /foo/')
  expect(callLabel('Agent', { description: 'Find tests' })).toBe('agent Find tests')
  expect(callLabel('TodoWrite', {})).toBe('todowrite')
  expect(callLabel('Bash', { command: 'x'.repeat(100) })).toHaveLength(60)
})

test('says what the turn is doing', () => {
  expect(spinnerWord('thinking', [])).toBe('Thinking')
  expect(spinnerWord('tool-use', [])).toBe('Running')
  expect(spinnerWord('tool-use', ['read a.ts'])).toBe('read a.ts')
  expect(spinnerWord('tool-use', ['read a.ts', 'read b.ts'])).toBe('read b.ts (+1 more)')
})

test('describes injected context and where it came from', () => {
  expect(attachmentLine('todo_reminder', { kind: 'engine' }, 420)).toBe(
    'injected todo_reminder · 420 chars',
  )
  expect(attachmentLine('hook_additional_context', { kind: 'hook', event: 'PostToolUse' }, 1234)).toBe(
    'injected hook_additional_context from PostToolUse hook · 1.2k chars',
  )
  expect(
    contextLine(
      ['/Users/ken/.claude/CLAUDE.md', '/p/AGENTS.md', '/q/x.md'],
      ['claudeMd', 'currentDate'],
      '/p',
      '/Users/ken',
    ),
  ).toBe('context: ~/.claude/CLAUDE.md, AGENTS.md, /q/x.md · currentDate')
  expect(contextLine([], [], '/p', undefined)).toBe('context: none')
})
