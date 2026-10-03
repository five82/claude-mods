# claude-mods

My [Claude Code](https://docs.claude.com/en/docs/claude-code) mods. Each folder under `mods/` is a self-contained plugin.

| Mod | What it does |
| --- | --- |
| [agent-skills](mods/agent-skills) | Skills from `.agents/skills` (project and `~`), the directory other agent harnesses share: listed for the model, runnable as `/<skill>` |
| [pi-prompt](mods/pi-prompt) | Swaps Claude Code's core system prompt (intro, system, doing tasks, actions, tools, tone) for [pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)'s terse coding agent prompt, on every model; session sections (memory, environment, MCP instructions) stay. On by default; `/pi-prompt` toggles it, remembered across sessions |
| [prompt-footer](mods/prompt-footer) | One line under the prompt: busy or idle (`● working · esc to interrupt` / `○`), directory and git branch · context usage · model · effort |
| [show-work](mods/show-work) | Shows what Claude runs and injects, like pi: every read and search on its own row, the last 5 lines of Bash output, how long each call took, a dim line per context block or reminder the engine adds for the model, and a spinner naming the running call |

## Installing

This repo is a Claude Code plugin marketplace. Add it once, then install the mods you want:

```bash
claude plugin marketplace add five82/claude-mods
claude plugin install prompt-footer@claude-mods
claude plugin install agent-skills@claude-mods
claude plugin install show-work@claude-mods
claude plugin install pi-prompt@claude-mods
```

Or from inside Claude Code:

```
/plugin marketplace add five82/claude-mods
/plugin install prompt-footer@claude-mods
/plugin install agent-skills@claude-mods
/plugin install show-work@claude-mods
/plugin install pi-prompt@claude-mods
```

Restart Claude Code to load a newly installed mod. To update later, refresh the marketplace, update each installed mod, then restart Claude Code:

```bash
claude plugin marketplace update claude-mods     # refreshes the catalog only
claude plugin update prompt-footer@claude-mods   # updates each installed mod
claude plugin update agent-skills@claude-mods
claude plugin update show-work@claude-mods
claude plugin update pi-prompt@claude-mods
```

The first alone leaves the installed version unchanged; `claude plugin list` shows which version is installed.

`claude plugin uninstall prompt-footer@claude-mods` removes one.

## Trying a mod

To load a mod from a local checkout for one session only (handy while editing it):

```bash
claude --plugin-dir mods/<mod-name>      # repeat the flag for several mods
```

Interactive sessions hot-reload a mod when its files change. See [AGENTS.md](AGENTS.md) for layout and verification.
