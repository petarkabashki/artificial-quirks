## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Research authoring

All skills from `~/work/authoring` are registered **generically** (whole skills root,
not one-by-one). New skills added under authoring appear here automatically.

| Mechanism | Path |
|-----------|------|
| Project (Grok) | `.grok/skills` → `../../authoring/.agent/skills` |
| Project (agent layout) | `.agent/skills` → same |
| Global (any workspace) | `~/.grok/config.toml` → `[skills].paths = ["~/work/authoring/.agent/skills"]` |

Slash examples: `/authoring-write-article`, `/authoring-figures`, `/authoring-review`,
`/authoring-astro-post`.

Article corpus and runtime stay in the authoring project:

- **Articles:** `~/work/authoring/publish/content/`
- **Runtime:** `uv run --project ~/work/authoring/publish/framework …`
- **Paths helper:** `python3 ~/work/authoring/scripts/authoring_paths.py`

Blog posts for **this** Pure site live under `src/content/blog/` (not the authoring
corpus). Use `/authoring-astro-post` to create, edit, manage, or promote posts here.

Requires sibling checkout: `~/work/authoring` next to this repo (relative symlinks).

