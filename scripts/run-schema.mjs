// One-off: run 001-create-tables.sql against DATABASE_URL via neon HTTP driver.
// Splits on top-level `;` while respecting dollar-quoted bodies and string literals.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));

for (const line of readFileSync(resolve(here, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const src = readFileSync(resolve(here, "001-create-tables.sql"), "utf8");

function splitStatements(sql) {
  const out = [];
  let buf = "";
  let i = 0;
  let inSingle = false;
  let dollarTag = null; // e.g. "$$" or "$foo$"

  while (i < sql.length) {
    const c = sql[i];
    const rest = sql.slice(i);

    if (dollarTag) {
      if (rest.startsWith(dollarTag)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
      } else {
        buf += c;
        i++;
      }
      continue;
    }

    if (inSingle) {
      buf += c;
      i++;
      if (c === "'") inSingle = false;
      continue;
    }

    // Line comment --
    if (c === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      if (nl === -1) { i = sql.length; } else { buf += "\n"; i = nl + 1; }
      continue;
    }

    // Dollar-quote start: $tag$ where tag is [A-Za-z0-9_]*
    if (c === "$") {
      const m = rest.match(/^\$([A-Za-z0-9_]*)\$/);
      if (m) {
        dollarTag = `$${m[1]}$`;
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (c === "'") { inSingle = true; buf += c; i++; continue; }

    if (c === ";") {
      const stmt = buf.trim();
      if (stmt) out.push(stmt);
      buf = "";
      i++;
      continue;
    }

    buf += c;
    i++;
  }

  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

const sql = neon(process.env.DATABASE_URL);
const statements = splitStatements(src);
console.log(`Applying ${statements.length} statements...`);

let applied = 0;
for (const stmt of statements) {
  try {
    await sql.query(stmt);
    applied++;
  } catch (err) {
    console.error(`\nFailed at statement #${applied + 1}:\n${stmt.slice(0, 200)}...\n`);
    console.error(err);
    process.exit(1);
  }
}

console.log(`Schema applied successfully (${applied} statements).`);
