import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getRuntimeDatabaseUrl } from "./database-url.js";

describe("getRuntimeDatabaseUrl", () => {
  const direct =
    "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require";
  const pooled =
    "postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require";

  it("reescribe db.prisma.io a pooled siempre en runtime", () => {
    process.env.DATABASE_URL = direct;
    assert.equal(getRuntimeDatabaseUrl(), pooled);
  });

  it("deja pooled sin cambios", () => {
    process.env.DATABASE_URL = pooled;
    assert.equal(getRuntimeDatabaseUrl(), pooled);
  });
});
