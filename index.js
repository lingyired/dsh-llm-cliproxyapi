/**
 * dsh-llm-cliproxyapi — a configuration-only bundle.
 *
 * The value this package ships is its `cordis.patch.yml` layer, which
 * declares the CLIProxyAPI provider routes for @deepseek-ai/dsh-llm-pi-ai.
 * This module exists so the package resolves like any other bundle; it
 * registers nothing by itself and is not referenced by any patch row.
 */
export const name = 'dsh-llm-cliproxyapi'

export function apply() {
  // Intentionally empty: the bundle's contribution is its patch layer.
}
