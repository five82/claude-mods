# claude-mods

My [Claude Code](https://docs.claude.com/en/docs/claude-code) mods. Each folder under `mods/` is a self-contained plugin.

| Mod | What it does |
| --- | --- |
| [agent-skills](mods/agent-skills) | Skills from `.agents/skills` (project and `~`), the directory other agent harnesses share: listed for the model, runnable as `/<skill>` |
| [prompt-footer](mods/prompt-footer) | One line under the prompt: directory and git branch · context usage · model · effort |

## Installing

This repo is a Claude Code plugin marketplace. Add it once, then install the mods you want:

```bash
claude plugin marketplace add five82/claude-mods
claude plugin install prompt-footer@claude-mods
claude plugin install agent-skills@claude-mods
```

Or from inside Claude Code:

```
/plugin marketplace add five82/claude-mods
/plugin install prompt-footer@claude-mods
/plugin install agent-skills@claude-mods
```

Restart Claude Code to load a newly installed mod. To update later, refresh the marketplace, update each installed mod, then restart Claude Code:

```bash
claude plugin marketplace update claude-mods     # refreshes the catalog only
claude plugin update prompt-footer@claude-mods   # updates each installed mod
claude plugin update agent-skills@claude-mods
```

The first alone leaves the installed version unchanged; `claude plugin list` shows which version is installed.

`claude plugin uninstall prompt-footer@claude-mods` removes one.

## Trying a mod

To load a mod from a local checkout for one session only (handy while editing it):

```bash
claude --plugin-dir mods/<mod-name>      # repeat the flag for several mods
```

Interactive sessions hot-reload a mod when its files change. See [AGENTS.md](AGENTS.md) for layout and verification.
