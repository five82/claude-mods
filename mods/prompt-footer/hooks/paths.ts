// POSIX path math the hooks environment lacks (no `node:path`).

// An absolute path with `.`, `..` and repeated or trailing slashes resolved.
export const normalize = (path: string): string => {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '..') {
      parts.pop()
    } else if (part !== '' && part !== '.') {
      parts.push(part)
    }
  }

  return `/${parts.join('/')}`
}

export const resolve = (base: string, path: string): string =>
  normalize(path.startsWith('/') ? path : `${base}/${path}`)

export const join = (dir: string, name: string): string =>
  dir === '/' ? `/${name}` : `${dir}/${name}`

export const dirname = (path: string): string => {
  const cut = path.lastIndexOf('/')

  return cut <= 0 ? '/' : path.slice(0, cut)
}
