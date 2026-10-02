import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import {
  contextColor,
  contextLabel,
  locationLabel,
  modelLabel,
  shortenPath,
} from './format'
import { findGitPaths, headBranch } from './git'
import type { GitFs, GitPaths } from './git'
import { join } from './paths'

const branch = atom({ plugin: 'prompt-footer', key: 'branch' } as const, null)
const effort = atom({ plugin: 'prompt-footer', key: 'effort' } as const, null)

const POLL_MS = 1000

// The file system as the git walk sees it.
const gitFs = ($: EngineInterface): GitFs => ({
  kind: path =>
    $.fs.stat(path).then(
      stat => stat.kind,
      () => null,
    ),
  read: path => $.fs.read(path),
})

// Reftable repositories keep HEAD at `.invalid`; ask git, as pi does.
const askGit = async ($: EngineInterface, repoDir: string): Promise<string | null> => {
  const r = await $.process
    .run(['git', '--no-optional-locks', 'symbolic-ref', '--quiet', '--short', 'HEAD'], {
      cwd: repoDir,
    })
    .catch(() => null)
  const name = r?.exitCode === 0 ? r.stdout.trim() : ''

  return name || null
}

// pi watches HEAD; the hooks environment has no watcher, so poll it.
let cwd: string | undefined
let gitPaths: GitPaths | null = null
let lastKey: string | undefined
let isRefreshing = false
let stopPolling: (() => void) | undefined

const refreshBranch = async ($: EngineInterface): Promise<void> => {
  if (isRefreshing) {
    return
  }
  isRefreshing = true
  try {
    const current = await $.session.cwd()
    if (current !== cwd) {
      cwd = current
      gitPaths = await findGitPaths(current, gitFs($))
      lastKey = undefined
    }

    const head = gitPaths ? await $.fs.read(gitPaths.headPath).catch(() => null) : null
    let key = `${cwd}\0${head}`
    // In a reftable repository a switch touches tables.list, not HEAD.
    if (gitPaths && head !== null && headBranch(head) === undefined) {
      const tables = join(join(gitPaths.commonGitDir, 'reftable'), 'tables.list')
      const stat = await $.fs.stat(tables).catch(() => null)
      key += `\0${stat?.mtimeMs}`
    }
    if (key === lastKey) {
      return
    }
    lastKey = key

    const name =
      gitPaths && head !== null
        ? (headBranch(head) ?? (await askGit($, gitPaths.repoDir)) ?? 'detached')
        : null
    if ((await read($, branch)) !== name) {
      await update($, branch, () => name)
      $.ui.invalidate('ui.render')
    }
  } finally {
    isRefreshing = false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refreshBranch($)
    stopPolling?.()
    const timer = $.clock.every(POLL_MS, () => void refreshBranch($))
    stopPolling = () => timer.cancel()

    // No effort until a request reports one: settings and what $.state kept
    // from before (a resume, a reload) can both be stale after /effort.
    await update($, effort, () => null)

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) {
      const level = e.effort === undefined ? null : String(e.effort)
      await update($, effort, () => level)
    }

    return yield* next(e)
  })

  // Context fill moved: redraw.
  on('session.measure', ($, e, next) => {
    $.ui.invalidate('ui.render')

    return next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const [cwd, home, model, usage, branchName, effortLevel] = await Promise.all([
      $.session.cwd(),
      $.env.get('HOME').then(home => home || $.env.get('USERPROFILE')),
      $.session.model(),
      $.session.usage(),
      read($, branch),
      read($, effort),
    ])
    const { percent, window } = usage.context

    return (
      <Box flexDirection="row">
        <Text dimColor wrap="truncate-end">
          {locationLabel(shortenPath(cwd, home), branchName)}
        </Text>
        <Text dimColor> · </Text>
        <Text dimColor={contextColor(percent) === undefined} color={contextColor(percent)}>
          {contextLabel(percent, window)}
        </Text>
        <Text dimColor> · {modelLabel(model, effortLevel)}</Text>
      </Box>
    )
  })
}
