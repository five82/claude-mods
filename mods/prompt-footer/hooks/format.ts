// Pure formatting for the footer, modelled on pi's coding-agent footer.

export const shortenPath = (cwd: string, home: string | undefined): string => {
  if (!home) {
    return cwd
  }

  if (cwd === home) {
    return '~'
  }

  return cwd.startsWith(`${home}/`) ? `~${cwd.slice(home.length)}` : cwd
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
