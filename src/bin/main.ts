import { Effect, Layer, Context } from "effect"
class Database extends Context.Tag("Database")<Database, { q(): number }>() { static layer = Layer.succeed(Database, { q: () => 1 }) }
declare const program: Effect.Effect<void, never, Database>
Effect.runPromise(program.pipe(Effect.provide(Database.layer)))
