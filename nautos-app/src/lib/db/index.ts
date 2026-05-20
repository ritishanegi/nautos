import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://nautos_user:nautos_dev_pass@localhost:5432/nautos";

const client = postgres(connectionString);
export const db = drizzle(client);
