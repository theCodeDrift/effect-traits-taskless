import { Array, Effect, Layer, Schedule, Context } from "effect"
declare const items: number[]
declare const users: { id: string; name: string }[]
declare const client: { run(): Promise<number> }
declare const layer: Layer.Layer<never>
class Database extends Context.Tag("Database")<Database, { q(): number }>() { static layer = Layer.succeed(Database, { q: () => 1 }) }

// T1 builtins
export const t1a = items.map((n) => n + 1)
export const t1b = "Ab".toLowerCase()
export const t1c = Object.keys({ a: 1 })
// T1 copy-reassign
export function t1d(xs: number[]) { let acc: number[] = []; for (const x of xs) { acc = Array.append(acc, x) } return acc }

// T2 destructured selector callbacks
export const t2a = Array.map(users, ({ id }) => id)
export const t2b = Array.map(users, ({ id, name }) => ({ key: id, label: name }))

// T3 unnecessary gen
export const t3a = Effect.gen(function* () { return layer }).pipe(Layer.unwrapEffect)
export const t3b = Effect.gen(function* () { return yield* Effect.succeed(1) })

// T4 generic promise wrapper
const fromPromise = <A>(thunk: () => Promise<A>) => Effect.promise(thunk)
export const t4 = fromPromise(() => client.run())

// T5 manual retry
export async function t5a() {
  for (let i = 0; i < 5; i++) {
    try { return await client.run() } catch { await new Promise((r) => setTimeout(r, 2 ** i * 100)) }
  }
  throw new Error("gave up")
}
export const t5b = Effect.promise(() => client.run()).pipe(Effect.retry(Schedule.exponential("100 millis")))

// T6 per-call provide + capture/re-provide
export const t6a = Effect.gen(function* () { const db = yield* Database; return db.q() }).pipe(Effect.provide(Database.layer))
declare const inner: Effect.Effect<number, never, Database>
export const t6b = Effect.gen(function* () { const db = yield* Database; return yield* inner.pipe(Effect.provideService(Database, db)) })
