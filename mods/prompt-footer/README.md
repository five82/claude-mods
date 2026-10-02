# prompt-footer

A minimal footer under the prompt, after [pi's coding agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent):

```
~/projects/claude-mods (main) · 42%/200k · claude-opus-5-5 · high
```

One line: working directory (`~` for home) and git branch, context window fill over its size (yellow past 70%, red past 90%), model, effort.

It replaces Claude Code's hint line (`? for shortcuts`, `esc to interrupt`); the keys still work.

Effort shows the `effortLevel` setting until the first request, then the level each main-loop request actually uses.

The directory and branch follow pi's footer: the branch is read from `HEAD` of the repository found above the working directory (worktrees included), `detached` for a detached HEAD, and rechecked every second so a switch made elsewhere shows up. `git` is only run for reftable repositories, where `HEAD` doesn't name the branch.

```bash
claude --plugin-dir mods/prompt-footer
```
