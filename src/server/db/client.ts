import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

let _db: MySql2Database<typeof schema> | null = null;
let _pool: mysql.Pool | null = null;

function initDb(): MySql2Database<typeof schema> {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    _pool = mysql.createPool({
      uri: connectionString,
      waitForConnections: true,
      connectionLimit: 10,
      idleTimeout: 20000,
    });
    _db = drizzle(_pool, { schema, mode: "default" }) as MySql2Database<typeof schema>;
  }
  return _db;
}

// Lazy proxy — only connects when actually used at runtime
export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop, receiver) {
    const real = initDb();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export function getPool() {
  return _pool;
}
