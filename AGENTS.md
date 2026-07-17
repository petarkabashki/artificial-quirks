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

Research articles and authoring skills live in a separate project:

- **Root:** `~/work/authoring`
- **Skills:** `~/work/authoring/.agent/skills` (`authoring-write-article`, `authoring-figures`, `authoring-review`)
- **Articles:** `~/work/authoring/publish/content/`
- **Runtime:** `uv run --project ~/work/authoring/publish/framework …`

Grok discovers skills via `~/.grok/config.toml` → `[skills].paths`.

