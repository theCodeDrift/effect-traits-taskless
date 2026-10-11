import { Effect, Layer, Context, Array } from "effect"
declare const userRepo: { find(id: string): Effect.Effect<string> }
declare const pause: (ms: number) => Promise<void>
declare const client: { run(): Promise<number> }
class Database extends Context.Tag("Database")<Database, { q(): number }>() { static layerFromEnv = () => Layer.succeed(Database, { q: () => 1 }) }
declare const q: Effect.Effect<number, never, Database>
// P1 FP? effectful service method named like an array method
export const p1 = userRepo.find("42")
// P2 FN? custom sleep helper in retry loop
export async function p2() { for (;;) { try { return await client.run() } catch { await pause(100) } } }
// P3 FN? shared layer built via a call
export const p3 = q.pipe(Effect.provide(Database.layerFromEnv()))
// P4 FN? helper defined elsewhere is only flagged at definition; call site here
import { fromPromise } from "./bad-helper.js"
export const p4 = fromPromise(() => client.run())
// P5 FN? Array.appendAll via pipe reassign
export function p5(xs: number[]) { let acc: number[] = []; acc = acc.concat(xs); return acc }
