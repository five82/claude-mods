declare module 'claude-code' {
  interface PluginState {
    'prompt-footer': { branch: string | null; effort: string | null; tasks: string[] }
  }
}
