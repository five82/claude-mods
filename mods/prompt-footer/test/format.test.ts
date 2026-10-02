import { expect, test } from 'claude-code/testing'

import {
  contextColor,
  contextLabel,
  formatTokens,
  locationLabel,
  modelLabel,
  shortenPath,
} from '../hooks/format'

test('shortens the home directory to ~', () => {
  expect(shortenPath('/Users/ken/projects/x', '/Users/ken')).toBe('~/projects/x')
  expect(shortenPath('/Users/ken', '/Users/ken')).toBe('~')
  expect(shortenPath('/Users/kenny/x', '/Users/ken')).toBe('/Users/kenny/x')
  expect(shortenPath('/tmp', undefined)).toBe('/tmp')
})

test('formats token counts like pi', () => {
  expect(formatTokens(999)).toBe('999')
  expect(formatTokens(1234)).toBe('1.2k')
  expect(formatTokens(200_000)).toBe('200k')
  expect(formatTokens(1_000_000)).toBe('1.0M')
})

test('labels context, model and location', () => {
  expect(contextLabel(42, 200_000)).toBe('42%/200k')
  expect(contextLabel(undefined, 200_000)).toBe('?/200k')
  expect(contextColor(50)).toBeUndefined()
  expect(contextColor(80)).toBe('yellow')
  expect(contextColor(95)).toBe('red')
  expect(modelLabel('claude-opus-5-5', 'high')).toBe('claude-opus-5-5 · high')
  expect(modelLabel('claude-opus-5-5', null)).toBe('claude-opus-5-5')
  expect(locationLabel('~/x', 'main')).toBe('~/x (main)')
  expect(locationLabel('~/x', null)).toBe('~/x')
})
