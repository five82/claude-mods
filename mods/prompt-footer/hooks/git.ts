// Git branch lookup, after pi's FooterDataProvider: read HEAD from the
// repository found above the working directory instead of asking git.

import { dirname, join, normalize, resolve } from './paths'

export type GitPaths = {
  repoDir: string
  commonGitDir: string
  headPath: string
}

// What the walk needs from the file system: a path's kind, null when missing,
// and a file's text. Both may reject.
export type GitFs = {
  kind: (path: string) => Promise<'file' | 'dir' | 'other' | null>
  read: (path: string) => Promise<string>
}

/**
 * Finds the git metadata by walking up from cwd: `.git` as a directory, or as
 * a file pointing at a worktree's git dir. Null when not in a repository.
 */
export const findGitPaths = async (cwd: string, fs: GitFs): Promise<GitPaths | null> => {
  let dir = normalize(cwd)
  while (true) {
    const gitPath = join(dir, '.git')
    try {
      const kind = await fs.kind(gitPath)
      if (kind === 'file') {
        const content = (await fs.read(gitPath)).trim()
        if (content.startsWith('gitdir: ')) {
          const gitDir = resolve(dir, content.slice(8).trim())
          const headPath = join(gitDir, 'HEAD')
          if ((await fs.kind(headPath)) === null) {
            return null
          }

          const commonDirPath = join(gitDir, 'commondir')
          const commonGitDir =
            (await fs.kind(commonDirPath)) === null
              ? gitDir
              : resolve(gitDir, (await fs.read(commonDirPath)).trim())

          return { repoDir: dir, commonGitDir, headPath }
        }
      } else if (kind === 'dir') {
        const headPath = join(gitPath, 'HEAD')
        if ((await fs.kind(headPath)) === null) {
          return null
        }

        return { repoDir: dir, commonGitDir: gitPath, headPath }
      }
    } catch {
      return null
    }

    const parent = dirname(dir)
    if (parent === dir) {
      return null
    }
    dir = parent
  }
}

const REF = 'ref: refs/heads/'

/**
 * The branch HEAD names, `detached` when it holds a commit, or undefined for
 * `.invalid` (a reftable repository), where only git can say.
 */
export const headBranch = (head: string): string | undefined => {
  const content = head.trim()
  if (!content.startsWith(REF)) {
    return 'detached'
  }

  const branch = content.slice(REF.length)

  return branch === '.invalid' ? undefined : branch
}
