// Pure formatting for the footer, modelled on pi's coding-agent footer.

import { normalize } from './paths'

// pi's formatCwdForFooter: `~` for home and below it (both paths resolved
// first), any other path as given.
export const shortenPath = (cwd: string, home: string | undefined): string => {
  if (!home) {
    return cwd
  }

  const resolvedCwd = normalize(cwd)
  const resolvedHome = normalize(home)
  if (resolvedCwd === resolvedHome) {
    return '~'
  }

  const prefix = resolvedHome === '/' ? '/' : `${resolvedHome}/`

  return resolvedCwd.startsWith(prefix) ? `~/${resolvedCwd.slice(prefix.length)}` : cwd
}

export const formatTokens = (n: number): string => {
  if (n < 1000) {
    return String(n)
  }

  if (n < 10_000) {
    return `${(n / 1000).toFixed(1)}k`
  }

  if (n < 1_000_000) {
    return `${Math.round(n / 1000)}k`
  }

  return `${(n / 1_000_000).toFixed(1)}M`
}

// `42%/200k`, or `?/200k` before the first response reports a fill.
export const contextLabel = (percent: number | undefined, window: number): string =>
  `${percent === undefined ? '?' : `${percent}%`}/${formatTokens(window)}`

export const contextColor = (percent: number | undefined): string | undefined => {
  if (percent === undefined || percent <= 70) {
    return undefined
  }

  return percent > 90 ? 'red' : 'yellow'
}

export const modelLabel = (model: string, effort: string | null): string =>
  effort ? `${model} · ${effort}` : model

export const locationLabel = (path: string, branch: string | null): string =>
  branch ? `${path} (${branch})` : path

// `1 shell, 2 monitors`: background task types counted in first-seen order.
export const tasksLabel = (types: readonly string[]): string => {
  const counts = new Map<string, number>()
  for (const type of types) {
    counts.set(type, (counts.get(type) ?? 0) + 1)
  }

  return [...counts].map(([type, n]) => `${n} ${type}${n === 1 ? '' : 's'}`).join(', ')
}

// Leads the line so busy and idle read apart at a glance, as pi's working
// indicator does on its editor border. Idle with background work still
// running gets its own mark, since that work will wake the session.
export const statusLabel = (isWorking: boolean, tasks: readonly string[] = []): string => {
  if (isWorking) {
    return '● working · esc to interrupt'
  }

  return tasks.length ? `◐ ${tasksLabel(tasks)} running` : '○'
}
