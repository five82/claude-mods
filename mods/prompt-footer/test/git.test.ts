import { expect, test } from 'claude-code/testing'

import { findGitPaths, headBranch } from '../hooks/git'
import type { GitFs } from '../hooks/git'
import { dirname, join, normalize, resolve } from '../hooks/paths'

const fakeFs = (files: Record<string, string>): GitFs => ({
  kind: async path =>
    path in files
      ? 'file'
      : Object.keys(files).some(f => f.startsWith(`${path}/`))
        ? 'dir'
        : null,
  read: async path => {
    if (!(path in files)) {
      throw new Error(`ENOENT: ${path}`)
    }

    return files[path]
  },
})

test('resolves POSIX paths', () => {
  expect(normalize('/a/./b//c/../d/')).toBe('/a/b/d')
  expect(resolve('/repo/sub', '../.git/worktrees/w')).toBe('/repo/.git/worktrees/w')
  expect(resolve('/repo', '/abs')).toBe('/abs')
  expect(join('/', '.git')).toBe('/.git')
  expect(dirname('/a/b')).toBe('/a')
  expect(dirname('/a')).toBe('/')
})

test('finds .git above the working directory', async () => {
  const fs = fakeFs({ '/repo/.git/HEAD': 'ref: refs/heads/main\n', '/repo/src/x.ts': '' })
  expect(await findGitPaths('/repo/src', fs)).toEqual({
    repoDir: '/repo',
    commonGitDir: '/repo/.git',
    headPath: '/repo/.git/HEAD',
  })
  expect(await findGitPaths('/elsewhere', fs)).toBeNull()
})

test('follows a worktree .git file to its HEAD and common dir', async () => {
  const fs = fakeFs({
    '/wt/.git': 'gitdir: /repo/.git/worktrees/wt\n',
    '/repo/.git/worktrees/wt/HEAD': 'ref: refs/heads/topic\n',
    '/repo/.git/worktrees/wt/commondir': '../..\n',
  })
  expect(await findGitPaths('/wt', fs)).toEqual({
    repoDir: '/wt',
    commonGitDir: '/repo/.git',
    headPath: '/repo/.git/worktrees/wt/HEAD',
  })
})

test('reads the branch from HEAD', () => {
  expect(headBranch('ref: refs/heads/main\n')).toBe('main')
  expect(headBranch('ref: refs/heads/feature/x')).toBe('feature/x')
  expect(headBranch('f11f39b0c1d2e3f4\n')).toBe('detached')
  expect(headBranch('ref: refs/heads/.invalid')).toBeUndefined()
})
