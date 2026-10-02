declare module 'claude-code' {
  interface PluginState {
    'show-work': {
      // Main-loop calls running now: tool_use_id → label, in start order.
      running: Record<string, string>
      // How long a finished call took, in ms, one per tool_use_id.
      took: StateFamily<number | null>
    }
  }
}
