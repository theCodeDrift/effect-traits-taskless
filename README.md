# Taming Effect Traits with Taskless

A set of coding traits for [Effect](https://effect.website) showed up in [this thread](THREAD_URL). They're the kind of guidance every team writes for its agents: prefer `Array.map(items, f)` over `items.map(f)`, don't hand-roll retry loops, provide layers once at the entry point. Each one is a markdown file the agent is supposed to read and follow.

I wanted to see how many of them could become real rules. So I started from an empty repo, gave Claude the traits one at a time, and let Taskless do the rest.

## How this repo was built

1. An empty git repo with a blank `CLAUDE.md`.
2. Taskless, installed with `npx @taskless/cli`. It set up `.taskless/` and linked the Taskless skill into Claude Code.
3. A `package.json` with `effect` and a `tsconfig.json`, so the agent knew what kind of codebase it was in.
4. A headless Claude session, prompted the way I'd prompt it at my desk: here's a guideline, make a rule, include test cases so I know it works.

No login, no account, no GitHub remote. Every rule here is a local [ast-grep](https://ast-grep.github.io) rule with its own passing tests.

Six traits went in and nine rules came out. Claude split three of the traits in two, because they were really asking for two things.

| Trait | Rules |
|---|---|
| Prefer Effect's modules over built-ins | `prefer-effect-module-utilities`, `prefer-mutation-over-copy-reassign` |
| `(v) => v.id` over `({ id }) => id` in callbacks | `no-destructured-selector-callback` |
| Remove `Effect.gen` wrappers that do no effectful work | `no-unnecessary-effect-gen` |
| Use `Effect.promise` directly at Promise boundaries | `no-effect-promise-wrapper` |
| Use `Effect.retry` and `Schedule` over manual retry loops | `no-manual-retry`, `bounded-effect-retry` |
| Provide shared layers at the outermost boundary | `provide-layers-at-entry-point`, `no-reprovide-captured-service` |

Once the rules were in, I wrote my own fixtures without looking at Claude's test cases. `src/bad.ts` has 13 violations across all six traits and every one was flagged. `src/good.ts` has the compliant version of each and came back clean, and so did `src/bin/main.ts`, which provides `Database.layer` at the entry point the way the trait says to.

## Why bother turning traits into rules

A trait file is a request. The agent reads it when it loads the file, weighs it against everything else in context, and follows it most of the time. That's fine for a style preference. It's a problem when the trait is the one keeping a payment from retrying forever.

A rule runs every time, gives the same answer every time, and fails the build when it's broken. Markdown is a suggestion dressed up like a rule. The model doesn't have to remember anything, because the check does the remembering.

That's the whole reason Taskless exists. Models are non-deterministic and they'll stay that way. The reliable part of the system has to be the part around the model.

## Where static analysis runs out

I also probed the gaps Claude said it couldn't cover. `src/probe.ts` has those cases, and the agent called every one of them before I wrote a line.

- `userRepo.find("42")` gets flagged as an array method. A rule that can't see types can't tell an Effect service from an array.
- A retry loop that sleeps with a custom `pause()` helper slips through, since sleeps are recognized by name.
- `Effect.provide(Database.layerFromEnv())` slips through, because a layer built by a call reads as locally configured.
- A generic `fromPromise` helper only gets flagged at its definition. Following an import into another file takes more than one file's worth of syntax.

The layer trait is the one I'd call partially solved. "Is this layer shared program-wide?" and "is this dependency's scope genuinely local?" are architecture questions. Answering them means knowing how the whole program is wired, and two rules matching syntax in one file can only point a reviewer at the right line.

This is where a model earns a place. A decision model like [Jev](https://x.com/LangChain/status/2101454284927959080) answers a typed question with a typed answer, cheaply and with very little variance between runs. LangChain's test was small (five cases, one agent), so it's early. Give a model like that the call graph and ask whether `Database.layer` is already provided at the entry point. That's a typed yes/no question, which is what it's built for, and it's cheap enough to run on every CI pass, which is the bar anything in CI has to clear.

The split I'd want is rules as the floor and a model on top. The rules catch everything that can be expressed as structure, every time, for free. The model only gets the questions a rule can't express, and its answers show up as review hints on the PR.

## Try it

```bash
npm install
npx @taskless/cli check
```

To run one rule:

```bash
npx @taskless/cli check --rule no-manual-retry
```

The rules live in `.taskless/rules/sg/`, each with a `.tests/` folder of cases that should and shouldn't match.

## Caveats

- The traits came from a screenshot. Six were visible, and the last one was cut off, so the end of the layer trait is my best reading of it.
- The rules check `.ts` files only. ast-grep parses `.tsx` separately, so a TSX codebase needs a copy of each rule.
- `Number`, `BigInt`, `Boolean`, `RegExp` and `Struct` were left out of the built-ins rule, because their Effect counterparts behave differently on edge inputs and I didn't want rules flagging code that isn't equivalent.
