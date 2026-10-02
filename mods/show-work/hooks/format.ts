// How many lines of Bash output a row keeps: the end, where errors and summaries are.
export const TAIL_LINES = 5

const SPINNER_CHARS = 60

// `4.2s`, `1m 5s`, `1h 2m 3s`, as pi writes it.
export const formatDuration = (ms: number): string => {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  if (minutes < 60) {
    return `${minutes}m ${total % 60}s`
  }

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ${total % 60}s`
}

// The last `n` lines of `text`, and how many came before them.
export const tail = (text: string, n = TAIL_LINES): { text: string; hidden: number } => {
  const lines = text.replace(/\s+$/, '').split('\n')
  if (lines.length <= n) {
    return { text, hidden: 0 }
  }

  return { text: lines.slice(-n).join('\n'), hidden: lines.length - n }
}

const cut = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

const str = (input: Record<string, unknown>, key: string): string | undefined => {
  const value = input[key]

  return typeof value === 'string' && value !== '' ? value : undefined
}

// One line naming a call by what it acts on: `bash npm test`, `read src/a.ts`.
export const callLabel = (tool: string, input: Record<string, unknown>): string => {
  const subject =
    tool === 'Bash'
      ? str(input, 'command')?.split('\n')[0]
      : tool === 'Grep'
        ? str(input, 'pattern') && `/${str(input, 'pattern')}/`
        : (str(input, 'file_path') ??
          str(input, 'notebook_path') ??
          str(input, 'pattern') ??
          str(input, 'url') ??
          str(input, 'query') ??
          str(input, 'description'))

  return cut(subject ? `${tool.toLowerCase()} ${subject}` : tool.toLowerCase(), SPINNER_CHARS)
}

export type SpinnerMode = 'requesting' | 'responding' | 'thinking' | 'tool-input' | 'tool-use'

// What the spinner says in place of its playful word.
export const spinnerWord = (mode: SpinnerMode, running: readonly string[]): string => {
  switch (mode) {
    case 'requesting':
      return 'Waiting for the model'
    case 'thinking':
      return 'Thinking'
    case 'responding':
      return 'Writing'
    case 'tool-input':
      return 'Writing a tool call'
    case 'tool-use': {
      const last = running.at(-1)
      if (last === undefined) {
        return 'Running'
      }

      return running.length > 1 ? `${last} (+${running.length - 1} more)` : last
    }
  }
}

const size = (chars: number): string =>
  chars < 1000 ? `${chars} chars` : `${(chars / 1000).toFixed(1)}k chars`

export type AttachmentOrigin =
  | { kind: 'engine' }
  | { kind: 'hook'; event: string }
  | { kind: 'plugin'; event: string }

// One line for a message the engine put in front of the model on its own.
export const attachmentLine = (type: string, origin: AttachmentOrigin, chars: number): string => {
  const from =
    origin.kind === 'hook'
      ? ` from ${origin.event} hook`
      : origin.kind === 'plugin'
        ? ` from a plugin (${origin.event})`
        : ''

  return `injected ${type}${from} · ${size(chars)}`
}

export const shortenPath = (path: string, home: string | undefined): string =>
  home && (path === home || path.startsWith(`${home}/`)) ? `~${path.slice(home.length)}` : path

// A path inside `root` relative to it, else shortened under `~`.
export const displayPath = (path: string, root: string, home: string | undefined): string =>
  path.startsWith(`${root}/`) ? path.slice(root.length + 1) : shortenPath(path, home)

// One line for what the conversation's first message carries, like pi's [Context].
export const contextLine = (
  files: readonly string[],
  blocks: readonly string[],
  root: string,
  home: string | undefined,
): string => {
  const parts = [
    ...(files.length > 0 ? [files.map(f => displayPath(f, root, home)).join(', ')] : []),
    ...blocks.filter(b => b !== 'claudeMd'),
  ]

  return `context: ${parts.length > 0 ? parts.join(' · ') : 'none'}`
}
