import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getRuntimeDatabaseUrl } from "./database-url.js";

describe("getRuntimeDatabaseUrl", () => {
  const direct =
    "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require";
  const pooled =
    "postgres://user:pass@pooled.db.prisma.io:5432/postgres?sslmode=require";

  it("reescribe db.prisma.io a pooled en Vercel", () => {
    const prev = process.env.VERCEL;
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = direct;
    try {
      assert.equal(getRuntimeDatabaseUrl(), pooled);
    } finally {
      process.env.DATABASE_URL = direct;
      if (prev === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = prev;
    }
  });

  it("no modifica la URL fuera de Vercel", () => {
    delete process.env.VERCEL;
    process.env.DATABASE_URL = direct;
    assert.equal(getRuntimeDatabaseUrl(), direct);
  });

  it("deja pooled sin cambios en Vercel", () => {
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = pooled;
    assert.equal(getRuntimeDatabaseUrl(), pooled);
    delete process.env.VERCEL;
  });
});
