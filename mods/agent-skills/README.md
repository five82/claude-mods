# agent-skills

Uses skills from the `.agents/skills` directories that other agent harnesses read, so one set of skills works in Claude Code too.

- **Where it looks:** `<project>/.agents/skills/*/SKILL.md` and `~/.agents/skills/*/SKILL.md`, scanned at session start. When both have a skill with the same name, the project's copy is used.
- **What the model sees:** each skill's name, description and SKILL.md path in the system prompt. When a task matches a skill, the model reads that SKILL.md with the Read tool and follows it. It only reads the full file when it needs it, as the standard intends.
- **Slash commands:** each skill is also available as `/<name> [request]`, which sends a prompt telling the model to read and follow the skill. A name that is already taken (a built-in command, or a native `.claude/skills` skill) is not registered again.

A skill needs YAML frontmatter with a `description`. `name` defaults to the folder name and must be letters, digits, `_` or `-`.

Skills added or edited during a session are picked up the next time a session starts (or the mod hot-reloads). These skills are not part of Claude Code's own Skill tool or `/skills` list, and frontmatter fields such as `allowed-tools` are ignored.

No external dependencies.
