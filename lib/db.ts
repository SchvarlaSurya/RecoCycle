import { neon } from "@neondatabase/serverless";

// Lazy initialization - store the neon instance as any to avoid type issues
let _sql: any = null;

function createSql() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is missing in environment variables.");
  }
  return neon(DATABASE_URL);
}

// Lazy getter - only creates connection when first used
function getSqlInstance() {
  if (!_sql) {
    _sql = createSql();
  }
  return _sql;
}

// Export sql as a proxy that lazily initializes
// This ensures no error at module evaluation time, only at runtime when sql is first used
const sqlHandler: ProxyHandler<any> = {
  get(_target, prop) {
    return (getSqlInstance() as any)[prop];
  },
  apply(_target, _thisArg, args) {
    return (getSqlInstance() as any)(...args);
  }
};

export const sql = new Proxy({}, sqlHandler);
export { getSqlInstance as getSql };