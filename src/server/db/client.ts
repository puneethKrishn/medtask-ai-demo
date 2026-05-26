import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;
let _queryClient: ReturnType<typeof postgres> | null = null;

function initDb(): DB {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    _queryClient = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    _db = drizzle(_queryClient, { schema });
  }
  return _db;
}

// Lazy proxy — only connects when actually used at runtime
export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = initDb();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export function getQueryClient() {
  return _queryClient;
}
