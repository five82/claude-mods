# prompt-footer

A minimal footer under the prompt, after [pi's coding agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent):

```
~/projects/claude-mods (main) · 42%/200k · claude-opus-5-5 · high
```

One line: working directory (`~` for home) and git branch, context window fill over its size (yellow past 70%, red past 90%), model, effort.

It replaces Claude Code's hint line (`? for shortcuts`, `esc to interrupt`); the keys still work.

Effort shows the `effortLevel` setting until the first request, then the level each main-loop request actually uses.

Needs `git` on `PATH` for the branch.

```bash
claude --plugin-dir mods/prompt-footer
```
