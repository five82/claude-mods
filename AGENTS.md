# AGENTS.md

Personal [Claude Code](https://docs.claude.com/en/docs/claude-code) mods: plugins built from function hooks (panes, bands above the prompt, status line entries, toasts, slash commands, tool-call and prompt hooks). Each mod is a self-contained plugin folder under `mods/`. The repo is also a plugin marketplace (`.claude-plugin/marketplace.json`), mirrored to GitHub as `five82/claude-mods`, so mods install with `claude plugin install <mod-name>@claude-mods`.

## Mod layout

```
mods/<mod-name>/
  .claude-plugin/plugin.json   # { "name", "version", "description" [, "types"] }
  hooks/hooks.json             # { "modules": ["./register.tsx"] }
  hooks/register.tsx           # export const register: Register = (on, options) => { ... }
  types/index.d.ts             # only if the mod keeps values in $.state
  test/*.test.ts               # behaviour tests run by `claude plugin test`
```

- `hooks.json` lists exactly one module path, relative to that file.
- `Register` and all API types come from `'claude-code'`; tests import `test`, `expect`, `mock` from `'claude-code/testing'`.
- A mod that uses `$.state` declares each value in `interface PluginState` under the mod's name in `types/index.d.ts`, and names that file as `"types"` in `plugin.json`. The module imports its value types from `'../types'`.
- `.claude-plugin/types/` (the engine-generated API typings) and the mod's root `tsconfig.json` are written by Claude Code when the mod loads. Both are gitignored; do not edit or commit them.
- Every mod has an entry in the root `.claude-plugin/marketplace.json` (`name`, `source: "./mods/<mod-name>"`, `description`) and a row in the README's mod table.

## Verification

Run for every mod you touch before finishing:

```bash
claude plugin validate mods/<mod-name>   # manifest + what the engine would refuse
tsc -p mods/<mod-name>                   # type-check (needs the mod to have loaded once)
claude plugin test mods/<mod-name>       # runs the mod's *.test.ts against the engine
claude plugin validate .                 # the marketplace, whenever marketplace.json changes
```

If `tsc` is not on `PATH`, use `npx -p typescript tsc -p mods/<mod-name>`.

Every mod has at least one `*.test.ts` covering the behaviour it exists for. Tests are hermetic: use the mocked clock and the test kit's `$`; never call a live model or spawn real processes. UI tests mount components on an explicit surface and should loop over `['terminal', 'desktop'] as const` rather than assume one.

## Running a mod

```bash
claude --plugin-dir mods/<mod-name>      # repeat the flag for several mods
```

A `--plugin-dir` copy overrides an installed copy of the same plugin for that session, so develop against the working tree with the marketplace version still installed. Interactive sessions watch `--plugin-dir` folders and hot-reload on save. A reload re-runs `register` and fires `session.start` again; `$.state` (session) and `$.store` (cross-session) survive, module-level variables do not. Where no flag can be passed (desktop app, SDK hosts), list the folders in `CLAUDE_CODE_PLUGIN_DIRS` in the environment or in `~/.claude/settings.json` `env`.

When a hook fails, a module doesn't load, or a `ui.render` tree is refused, the transcript shows one dim line naming the plugin, event, and reason; `claude --debug` logs every occurrence. Check there first when a mod seems to do nothing.

## Workflow

1. Develop with `claude --plugin-dir mods/<mod-name>` and check the behaviour live (hot reload).
2. Run every step under Verification; all must pass.
3. Bump `version` in the mod's `plugin.json` for any change to its behaviour (semver: patch for fixes, minor for features), so installs see a new release.
4. For a new mod, add its `marketplace.json` entry and README row in the same change.
5. Commit and push only when the user asks. After a push, the installed copy updates with:

```bash
claude plugin marketplace update claude-mods
claude plugin update <mod-name>@claude-mods
```

## Runtime constraints (important)

- Hooks modules run in an isolated environment: **no DOM and no Node APIs**. Reach the outside world only through `$` (`$.fs`, `$.process`, `$.clock`, `$.model`, `$.tool`, `$.agent`, `$.ui`, `$.audio`, ...).
- Every hook is `($, e, next)`. `e` is frozen: rewrite by calling `next({ ...e, ... })`, never by mutating. Returning without calling `next` answers the event yourself and skips everything beneath.
- JSX compiles against the global `h`. Get elements from the surface's table, `const { Box, Text, Button } = $.ui.resolve(e)`; don't import components. `e.surface` may be `terminal`, `desktop`, `vscode`, or `mobile`.
- Panes opened without a user action (from `session.start` or a timer) only seat at 144+ terminal columns; ones opened by a command or button seat at any width.
- For any event, element, or `$` method, grep the generated `claude-code/index.d.ts` for its name and read the declaration and doc comment rather than guessing.

## Code layout

- Keep pure logic (parsing, formatting, path math) in plain functions in their own files within the mod's `hooks/` folder so tests can cover it without the engine.
- Mods are independent. Don't share code across mod folders; each must load on its own via `--plugin-dir`.

## Style

Prefer the smallest change that preserves behaviour. Avoid speculative abstractions and consistency for its own sake. Document any external dependency a mod needs (env vars, CLIs, API keys) in `README.md`.
