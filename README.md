# nextjs-codemods

Fourteen detection-only [jssg](https://docs.codemod.com) codemods that find common performance, security, correctness, design and accessibility problems in React and Next.js codebases. None of them change code: each one counts findings with `useMetricAtom` (so it can feed a Codemod Insights dashboard) and, with `--param locations=1`, prints `file:line` for every hit.

They were built and tuned by running them over codemod-app and ten large open-source React and Next.js apps (cal.com, dub, documenso, formbricks, plane, twenty, papermark, excalidraw, midday and umami) and hand-checking samples of real hits. Precision notes below come from that pass. Some false positives and misses are expected; treat the noisier ones as review queues.

## Run them

Requires the `codemod` CLI (built and tested with 1.18.6).

```bash
# one codemod on one project, printing every finding
codemod jssg run --language tsx -t /path/to/project codemods/index-as-key/scripts/codemod.ts \
  --no-interactive --allow-dirty --dry-run --param locations=1

# every codemod over a folder of cloned repos, results in results/<codemod>.tsv
REPOS_DIR=/path/to/clones bash scripts/run-all.sh

# every codemod over one repo, with timings
OUT=results bash scripts/run-repo.sh /path/to/repo
```

`run-all.sh` and `run-repo.sh` drop findings in test, story, e2e and fixture files.

## Develop

```bash
npm install
npm run check-types   # tsc over every codemod
npm test              # all 37 specs, about a second
```

Each codemod lives in `codemods/<name>/` (`codemod.yaml`, `workflow.yaml`, `scripts/codemod.ts`, `tests/`). The sources are in `src/` with a shared prelude; `python3 src/build.py` regenerates `codemods/*/scripts/codemod.ts`. `effect-missing-cleanup` is edited directly in its package.

Specs are plain fixtures named as the rule they check (`reports-…`, `skips-…`). A fixture with no findings writes no `metrics.json`, so each `skips-…` fixture carries one reported control case that pins the count at 1.

## The codemods

### Security

**`server-action-without-auth`**
Detects exported async functions in `"use server"` files, and `.action(...)` chains on action clients, that make no call named like an auth, session, permission or ownership check and aren't built on a client named like an authenticated one. Every server action is a public POST endpoint, so one without a caller check lets anyone read, write or spend on the app's behalf.
Dimensions: `kind` (`async-function`, `action-client`), `effect` (`cache-revalidation`, `reads-or-writes`). Precision: the shape is right almost every time, but many actions are public by design (password reset, token links); start with `reads-or-writes`.

**`unsanitized-inner-html`**
Detects `dangerouslySetInnerHTML={{ __html: x }}` where `x` isn't a string literal and nothing named like a sanitizer or escaper touches it; style tags are skipped. If `x` ever carries user content, it's stored XSS.
Dimensions: `source` (`json-stringify`, `rendered-markup`, `function-result`, `template`, `variable`, `expression`). Precision: most hits are highlighter output or trusted strings, roughly 15 to 25% carry data a user could influence. `json-stringify` hits are the cheapest fix (escape `<`).

**`route-entry-directive`**
Detects `app/**/page`, `layout` and `template` files that start with `"use client"` or `"use server"`. `"use client"` ships the whole route to the browser; `"use server"` on a route entry is a mistake that turns its exports into callable server actions.
Dimensions: `entry`, `directive`. Precision: literal.

### Performance

**`db-query-in-loop`**
Detects an awaited Prisma, Drizzle, Supabase or `*Repository` call whose nearest enclosing loop is a `for`, `for...of` or `for...in`. `while`/`do` loops (usually pagination) and seed, script and migration paths are skipped. One round-trip per item makes requests slower as accounts grow.
Dimensions: `orm`. Precision: about 9 in 10 are real per-item queries; about half are on paths worth batching.

**`unstable-context-value`**
Detects a context provider whose `value` is an inline object, array or function, or a local const holding one. A new value every render re-renders every consumer.
Dimensions: `shape`, `via` (`inline`, `local-variable`), `wraps` (`children-prop`, `inline-tree`). Precision: `children-prop` hits are the ones that cost re-renders; `inline-tree` matters much less.

**`derived-state-effect`**
Detects a `useEffect` with dependencies whose body is only one to three state-setter calls. The component renders once with stale state and then again; usually the value can be computed during render, or the component reset with a `key`.
Dimensions: `kind` (`derived-value`, `reset-on-change`). Precision: high for the pattern; some are deliberate "copy prop into editable state".

### Correctness and design

**`nested-component-definition`**
Detects a capitalized function returning JSX declared inside another component and rendered as JSX. React sees a new component type every render, so it remounts: state resets, inputs lose focus.
Dimensions: `declaredAs`. Precision: high.

**`effect-missing-cleanup`**
Detects effects that add a listener (without `once` or `signal`), start an interval, create an observer, or call `.subscribe()` or `x.on(event, handler)`, and return no cleanup. Handlers pile up across re-renders and outlive the component.
Dimensions: `resource`. Precision: high; cleanup done some other way (a ref, a library hook) still reports.

**`floating-async-iteration`**
Detects `.forEach(async ...)` and `.map(async ...)` whose result is thrown away. Nothing waits for the work, and errors become unhandled rejections.
Dimensions: `method`.

**`oversized-component`**
Detects components of 300 lines or more, including `forwardRef`/`memo`-wrapped ones. These are where bugs and slow re-renders collect.
Dimensions: `size` (`300-499`, `500-999`, `1000+`), `stateHooks` (`0`, `1-5`, `6-10`, `11+`). Filter on `stateHooks` to skip data-heavy files.

**`exhaustive-deps-suppressed`**
Detects ESLint, Biome and oxlint comments that disable the hooks dependency rule; each is a place a stale closure can show users old data.
Dimensions: `tool`, `justified` (whether the comment gives a reason). Precision: literal.

**`index-as-key`**
Detects list items whose `key` uses only the `.map()` index; placeholder lists (`Array.from`, `[...Array(n)]`) and unused items are skipped. When the list is reordered, filtered or edited, React reuses the wrong element.
Dimensions: `form` (`bare-index`, `index-in-expression`). Precision: the pattern is always right, but only about 40% are lists that change or hold state.

### Accessibility

**`click-on-non-interactive`**
Detects `onClick` on `div`, `span`, `li`, `td`, `img`, `svg`, headings and similar elements with no `role`, no key handler and no prop spread; handlers that only stop propagation are skipped. Keyboard and screen-reader users can't use these controls.
Dimensions: `element`. Precision: high.

**`img-missing-alt`**
Detects img elements with no `alt` and no prop spread, plus Next's `Image` component when the file imports `next/image`. Screen readers read out the file name or skip the image.
Dimensions: `element`.

## Known CLI quirk

With `codemod` 1.18.6, a directory fixture with files in subfolders (`tests/case/input/app/page.tsx`) gets its `metrics.json` written next to the file inside `input/`, and the test then fails with "Expected file ... to be deleted". The `route-entry-directive` fixtures work around it by keeping that `metrics.json` at the same path in `expected/`, where it acts as a real assertion.
