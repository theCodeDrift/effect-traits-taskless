import { Array, Effect, Layer, Schedule, Context, String, pipe } from "effect"
declare const items: number[]
declare const users: { id: string; name: string }[]
declare const client: { run(): Promise<number> }
declare const isTransient: (e: unknown) => boolean
class Database extends Context.Tag("Database")<Database, { q(): number }>() {}
class Tenant extends Context.Tag("Tenant")<Tenant, { id: string }>() { static layer = (id: string) => Layer.succeed(Tenant, { id }) }

// T1
export const g1a = Array.map(items, (n) => n + 1)
export const g1b = String.toLowerCase("Ab")
export function g1c(xs: number[]) { const out: number[] = []; for (const x of xs) out.push(x * 2); return out }
// T2
export const g2a = Array.map(users, (u) => u.id)
export const g2b = pipe(users, Array.map((u) => ({ key: u.id, label: u.name })))
// T3: real sequencing
export const g3 = Effect.gen(function* () {
  const db = yield* Database
  const n = db.q()
  yield* Effect.log(n)
  return n
})
// T4: direct boundary
export const g4 = Effect.promise(() => client.run())
// T5: built-in, bounded, filtered
export const g5 = g4.pipe(Effect.retry({ times: 3, while: isTransient, schedule: Schedule.exponential("100 millis") }))
// polling loop (not retry)
export const g5b = Effect.gen(function* () { for (let i = 0; i < 3; i++) { yield* Effect.log(i); yield* Effect.sleep("1 second") } })
// T6: declare deps; locally-configured layer is fine
export const g6 = (tenantId: string) => g3.pipe(Effect.provide(Tenant.layer(tenantId)))
