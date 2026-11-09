# nextjs-codemods

Fourteen detection-only [jssg](https://docs.codemod.com) codemods that find common performance, security, correctness, design and accessibility problems in React and Next.js codebases. None of them change code: each one counts findings with `useMetricAtom` (so it can feed a Codemod Insights dashboard) and, with `--param locations=1`, prints `file:line` for every hit.

They were built and tuned by running them over codemod-app and ten large open-source React and Next.js apps (cal.com, dub, documenso, formbricks, plane, twenty, papermark, excalidraw, midday and umami) and hand-checking samples of real hits. They were then run over 20 larger ones (about 25 million lines), and an independent check of sampled hits traced the remaining false positives to a handful of causes, which version 0.2.0 fixes. Precision notes below come from those passes. Some false positives and misses are expected; harm dimensions mark the hits most worth fixing.

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

## Publish

Each codemod is a public registry package named `@devagrawal09/<folder name>` (version 0.2.0). From the repo root:

```bash
npx codemod login && for d in codemods/*/; do (cd "$d" && npx codemod publish); done
```

`codemod workflow validate -w codemods/<name>` checks a package without signing in.

## Develop

```bash
npm install
npm run check-types   # tsc over every codemod
npm test              # all 69 specs, a few seconds
```

Each codemod lives in `codemods/<name>/` (`codemod.yaml`, `workflow.yaml`, `scripts/codemod.ts`, `tests/`). The sources are in `src/` with a shared prelude (`prelude.txt`, `report.txt`, and `resolve.txt` for following imports into other files); `python3 src/build.py` regenerates `codemods/*/scripts/codemod.ts`.

Specs are plain fixtures named as the rule they check (`reports-…`, `skips-…`). A fixture with no findings writes no `metrics.json`, so each `skips-…` fixture carries one reported control case that pins the count at 1.

## Example and demo code

Every codemod skips files under `example(s)`, `demo(s)`, `playground(s)` and `sandbox(es)` folders, files named like `*-demo.*` or `*.example.*`, and Satori OG-image files (`next/og`, `@vercel/og`, `satori`, `new ImageResponse(`). Pass `--param includeExamples=1` to include them; starter templates copied into real apps are sometimes worth checking.

## The codemods

### Security

**`server-action-without-auth`**
Detects exported async functions in `"use server"` files, and `.action(...)` chains on action clients, that make no call named like an auth, session, permission or ownership check and aren't built on an authenticated client. A client counts as authenticated when its name says so, or when its definition, followed through imports and up to three `.use(...)` layers, runs auth middleware. Every server action is a public POST endpoint, so one without a caller check lets anyone read, write or spend on the app's behalf.
Dimensions: `kind` (`async-function`, `action-client`), `effect` (`cache-revalidation`, `reads-or-writes`), `client`. Param: `--param authedClients=a,b` treats those clients as authenticated. Precision: the shape is right almost every time, but many actions are public by design (password reset, token links); start with `reads-or-writes`.

**`unsanitized-inner-html`**
Detects `dangerouslySetInnerHTML={{ __html: x }}` where `x` isn't a string literal and nothing named like a sanitizer or escaper touches it; style tags are skipped. Helpers that escape `<` (local or imported) and shiki's `codeToHtml` output count as sanitized. If `x` ever carries user content, it's stored XSS.
Dimensions: `source` (`json-stringify`, `rendered-markup`, `function-result`, `template`, `variable`, `expression`). Precision: most hits are highlighter output or trusted strings, roughly 15 to 25% carry data a user could influence. `json-stringify` hits are the cheapest fix (escape `<`).

**`route-entry-directive`**
Detects `app/**/page`, `layout` and `template` files that start with `"use client"` or `"use server"`. `"use client"` ships the whole route to the browser; `"use server"` on a route entry is a mistake that turns its exports into callable server actions.
Dimensions: `entry`, `directive`. Precision: literal.

### Performance

**`db-query-in-loop`**
Detects an awaited Prisma, Drizzle, Supabase or `*Repository` call whose nearest enclosing loop is a `for`, `for...of` or `for...in`. `while`/`do` loops (usually pagination), chunked batch loops (a `for` stepping by more than one, or a loop over chunks, batches or pages) and seed, script and migration paths are skipped. One round-trip per item makes requests slower as accounts grow.
Dimensions: `orm`. Precision: about 9 in 10 are real per-item queries; about half are on paths worth batching.

**`unstable-context-value`**
Detects a context provider whose `value` is an inline object, array or function, or a local const holding one. A new value every render re-renders every consumer.
Dimensions: `shape`, `via` (`inline`, `local-variable`), `wraps` (`children-prop`, `inline-tree`), `madeOf` (`own-state-or-props` when the value holds only the provider's own state, props, literals and constants, so memoizing saves little; `other` for callbacks, calls and outside values). Precision: `children-prop` hits with `madeOf: other` are the ones worth memoizing; `inline-tree` matters much less.

**`derived-state-effect`**
Detects a `useEffect` with dependencies whose body is only one to three calls to setters from a `useState` in the same component, with nothing awaited and nothing read from `document`, `window`, storage or `navigator`. The component renders once with stale state and then again; usually the value can be computed during render, or the component reset with a `key`.
Dimensions: `kind` (`derived-value`, `reset-on-change`). Precision: high for the pattern; some are deliberate "copy prop into editable state".

### Correctness and design

**`nested-component-definition`**
Detects a capitalized function returning JSX declared inside another component and rendered as JSX. React sees a new component type every render, so it remounts: state resets, inputs lose focus.
Dimensions: `declaredAs`, `holdsState` (state, refs, effects, forms or queries), `input`, `harm` (`likely` when it holds state or an input). Precision: the pattern is right; only `harm: likely` hits lose something on remount.

**`effect-missing-cleanup`**
Detects effects that add a listener (without `once` or `signal`), start an interval, create an observer, or call `.subscribe()` or `x.on(event, handler)`, and return no cleanup. Handlers pile up across re-renders and outlive the component.
Teardown counts when the effect returns it, when a sibling unmount effect (`useEffect(() => () => ..., [])`) in the same component runs it, or when a listener or subscription is removed by its own handler. An interval that only clears itself on a later tick, and a cleanup arrow that is written but never returned, still report.
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
Detects list items whose `key` uses only the `.map()` index; placeholder lists (`Array.from`, `[...Array(n)]`), module-level constant lists and unused items are skipped. When the list is reordered, filtered or edited, React reuses the wrong element.
Dimensions: `form` (`bare-index`, `index-in-expression`), `list` (`editable`, `state`, `filtered-or-sorted`, `fixed-or-unknown`), `item` (`host-elements`, `component`, `stateful-component`), `input`, `harm`. `harm` is `likely` when the list changes and the item has an input or is a component, `possible` when the list changes or the item has an input or holds state, and `unlikely` otherwise. Precision: the pattern is always right; filter on `harm` to find the ones that cause bugs.

### Accessibility

**`click-on-non-interactive`**
Detects `onClick` on `div`, `span`, `li`, `td`, `img`, `svg`, headings and similar elements with no `role`, no key handler and no prop spread; handlers that only stop propagation (inline or a named stop-propagation handler) and elements under an a11y lint suppression are skipped. Keyboard and screen-reader users can't use these controls.
Dimensions: `element`. Precision: high.

**`img-missing-alt`**
Detects img elements with no `alt` and no prop spread, plus Next's `Image` component when the file imports `next/image`; images marked `aria-hidden` or `role="presentation"`/`"none"` are skipped. Screen readers read out the file name or skip the image.
Dimensions: `element`.

## Known CLI quirk

With `codemod` 1.18.6, a directory fixture with files in subfolders (`tests/case/input/app/page.tsx`) gets its `metrics.json` written next to the file inside `input/`, and the test then fails with "Expected file ... to be deleted". Directory fixtures here work around it by keeping that `metrics.json` at the same path in `expected/`, where it acts as a real assertion.
