import { Effect } from "effect"; export const fromPromise = <A>(f: () => Promise<A>) => Effect.promise(() => f())
