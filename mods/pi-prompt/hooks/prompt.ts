// pi's system prompt (packages/coding-agent/src/core/system-prompt.ts in
// earendil-works/pi), with its tools mapped onto Claude Code's.

import type { PromptComposeSection } from 'claude-code'

// The engine's sections that set how the model works; everything after them
// (memory, environment, MCP instructions, ...) is kept.
export const CORE_SECTIONS = new Set(['intro', 'system', 'doing_tasks', 'actions', 'tools', 'tone', 'lean_body'])

const PREAMBLE =
  'You are an expert coding assistant operating inside Claude Code, a coding agent harness. You help users by reading files, executing commands, editing code, and writing new files.'

// pi's one-line snippet and guidelines per tool, in pi's order.
const TOOLS: { name: string; snippet: string; guidelines: string[] }[] = [
  { name: 'Read', snippet: 'Read file contents', guidelines: ['Use Read to examine files instead of cat or sed.'] },
  { name: 'Bash', snippet: 'Execute bash commands (ls, grep, find, etc.)', guidelines: [] },
  {
    name: 'Edit',
    snippet: 'Make precise file edits with exact text replacement',
    guidelines: ['Use Edit for precise changes (old_string must match exactly)'],
  },
  { name: 'Write', snippet: 'Create or overwrite files', guidelines: ['Use Write only for new files or complete rewrites.'] },
  { name: 'Grep', snippet: 'Search file contents for patterns (respects .gitignore)', guidelines: [] },
  { name: 'Glob', snippet: 'Find files by glob pattern', guidelines: [] },
]

const tag = (name: string, text: string) => `<${name}>\n${text}\n</${name}>`

export const piBody = (tools: readonly string[]): string => {
  const offered = TOOLS.filter(t => tools.includes(t.name))
  const list = offered.length > 0 ? offered.map(t => `- ${t.name}: ${t.snippet}`).join('\n') : '(none)'

  const rules: string[] = []
  if (tools.includes('Bash') && !tools.includes('Grep') && !tools.includes('Glob')) {
    rules.push('Use bash for file operations like ls, rg, find')
  }
  for (const t of offered) rules.push(...t.guidelines)
  rules.push('Be concise in your responses', 'Show file paths clearly when working with files')

  return [
    PREAMBLE,
    tag('tools', `${list}\n\nIn addition to the tools above, you may have access to other custom tools depending on the project.`),
    tag('rules', rules.map(r => `- ${r}`).join('\n')),
  ].join('\n\n')
}

// Puts pi's body where the first core section stood (on its side of the cache
// boundary) and drops the rest of them; pi's <cwd> goes last. A prompt with no
// core section (--bare, an agent's own prompt) is left as it is.
export const replaceCore = (
  sections: readonly PromptComposeSection[],
  tools: readonly string[],
  cwd: string,
): PromptComposeSection[] => {
  if (!sections.some(s => CORE_SECTIONS.has(s.id))) return [...sections]

  const out: PromptComposeSection[] = []
  let placed = false
  for (const s of sections) {
    if (!CORE_SECTIONS.has(s.id)) {
      out.push(s)
    } else if (!placed) {
      out.push({ id: 'pi-prompt:body', text: piBody(tools), scope: s.scope })
      placed = true
    }
  }
  out.push({ id: 'pi-prompt:cwd', text: tag('cwd', cwd), scope: 'session' })
  return out
}
