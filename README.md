# dsh-llm-cliproxyapi

An installable dsh **profile bundle** that declares the CLIProxyAPI provider
routes for `@deepseek-ai/dsh-llm-pi-ai`. It ships configuration only — the
package's contribution is its [`cordis.patch.yml`](./cordis.patch.yml) layer.

## What it provides

| Route | Protocol | Models |
|---|---|---|
| `cliproxyapi-codex` | `openai-responses` | `gpt-6.1-sol`, `gpt-6-luna`, each with its real `reasoningEfforts` (low / medium / high / xhigh / max) |
| `cliproxyapi` | `openai-completions` | the WorkBuddy set (`hy3`, `glm-5.3-flash`, `deepseek-v4.1-flash`), in the marker region CLIProxyAPI's expiry-router plugin owns |
| `cliproxyapi-trae` | `openai-completions` | `trae-ds4.1-flash` |
| `token-unlimited` | `openai-responses` | `gpt-6-luna`, `gpt-6-sol` |

## Why Trae carries its own model id

CPA publishes Trae's `deepseek-v4.1-flash` as `trae-ds4.1-flash`
(`oauth-model-alias.trae` in CPA's `config.yaml`, without `fork`, so the alias
replaces the original id in Trae's catalogue). The two providers therefore share
no model id at all: WorkBuddy serves `deepseek-v4.1-flash` and Trae serves
`trae-ds4.1-flash`, so CPA can never move one request between them. Sharing an id
would put the choice in CPA's scheduler, and a mid-session switch between two
platforms costs far more than it saves — different serving stacks, different
context accounting, and a measured empty-`content` defect on Trae's side.

Credit packages follow the same split one layer down: **platforms never merge,
accounts inside one platform always do.** `wb-route.py` collects both platforms
and ranks each one's accounts against each other — Trae's accounts compete so
its soonest-expiring packs burn first, and WorkBuddy's accounts do the same —
but nothing compares a WorkBuddy account with a Trae account, and no total is
summed across the two. Trae's per-pack detail comes from its own plugin route
(`GET /v0/management/plugins/trae/packs`); the CPA panel and the DSH status card
are grouped by platform for the same reason. Comparing expiries *across*
platforms is a separate, deliberately unused mode (`strategy: "expiry"`):
measured 2026-09-28 it sent `deepseek-v4.1-flash` to Trae, which returned an
empty `content` with the answer in `reasoning_content`.

All routes point at a local CLIProxyAPI (`http://127.0.0.1:8317/v1`) and resolve
their key through the `CLIPROXYAPI_API_KEY` / `TOKEN_UNLIMITED_API_KEY`
credential references.

## Why `cliproxyapi-codex` is a separate route

Codex speaks the native Responses protocol. Folding those models into the
`cliproxyapi` route would run them through its `openai-completions` translation
layer, which drops the encrypted reasoning payload the Codex backend
round-trips across turns.

## Why `reasoningEfforts` lists every level explicitly

In the pi-ai profile schema, a level the model entry does not declare becomes
**unavailable** rather than falling back to a default, and an entry that omits
`reasoningEfforts` altogether inherits whatever pi-ai's **installed catalog**
says about that model id. That fallback is why the WorkBuddy models had no
effort selector at all: none of `hy3`, `glm-5.3-flash`, `deepseek-v4.1-flash`,
or `trae-ds4.1-flash` appears in the catalog **under this route's provider key**,
so each resolved as non-reasoning. Declaring the levels is what turns the
selector on.

For `cliproxyapi-codex`, `off` and `minimal` are deliberately absent: the Codex
backend has no true "off", and its lowest level is `low`. The levels listed per
model are the ones CLIProxyAPI's
`internal/registry/models/codex_client_models.json` reports for that slug.

For the WorkBuddy route the levels are **not** hand-written. They come from the
WorkBuddy catalog's own per-model `reasoning` object, collected by
`wb-models.py` into `models-state.json` and rendered into the
`>>> workbuddy-models` region by CLIProxyAPI's expiry-router plugin. That
catalog states two different things, and both are preserved:

- a model with `supportedEfforts` accepts a level per request — it gets exactly
  those levels (`glm-5.3-flash` → `low`/`high`/`max`);
- a model carrying only a fixed `effort` ignores every level sent to it — it
  gets that one level (`hy3`, `deepseek-v4.1-flash` → `high` only).

Advertising `low`/`medium`/`high` for all three would promise a choice the
second group silently discards. The region is regenerated wholesale on every
apply, so editing it by hand is not durable.

## Install / re-enable

```sh
dsh plugin --profile desktop add /Users/lingsmbp/Documents/github/dsh-llm-cliproxyapi
```

Or, inside dsh itself: open the Web sidebar's **Plugins** page and select
`dsh-llm-cliproxyapi` (selecting a bundle appends it to
`dsh.profile.bundles`). A profile reset rewrites the profile's
`cordis.patch.yml` and `package.json`, which is what drops these routes — this
bundle is the one-click way to bring them back.

## Layer interaction (important)

A profile composes patches as `bundles → profile cordis.patch.yml →
$DSH_HOME/cordis.patch.yml`, and a later layer **replaces** an earlier layer's
`config` for the same row id. The `llm-pi-ai` `providers` object is therefore
all-or-nothing: it must live in exactly one layer, or the losing layer's routes
disappear.

On this machine the same layer is also installed as the home patch
`~/.dsh/cordis.patch.yml`, which a profile reset cannot touch and which HMR
watches for hot reload. That home patch wins over this bundle while it exists —
this bundle is the recovery copy. Its `>>> workbuddy-models` region is driven by
CLIProxyAPI's expiry-router plugin
(`plugins.configs.expiry-router.dsh_patch_path`), which must point at whichever
file holds this layer.
