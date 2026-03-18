# @leninpkg/baileys-auth

Generic auth-state adapter for [Baileys](https://github.com/WhiskeySockets/Baileys), with pluggable persistence and serialization.

## Quick Start (SQLite)

```ts
import pino from "pino";
import { makeWASocket } from "baileys";
import {
  BaileysAuth,
  JsonDataReplacer,
  SqliteDataSource,
  setupAuthListeners,
} from "@leninpkg/baileys-auth";

async function runApp() {
  const sessionId = "your-session-id";
  const dataSource = new SqliteDataSource("./data/baileys.sqlite");
  const dataReplacer = new JsonDataReplacer();

  // Load persisted credentials or initialize a new auth state for this session.
  const auth = await BaileysAuth.fromSession({
    sessionId,
    dataSource,
    dataReplacer,
  });

  const createSocket = () =>
    makeWASocket({
      logger: pino({ level: "silent" }),
      auth: auth.state,
    });

  const sock = createSocket();

  // Bind auth listeners (save creds + optional socket recreation on logout).
  // You can disable recreation and handle reconnect flow manually.
  setupAuthListeners(auth, sock, {
    clearSessionOnLogout: true,
    recreateSocketOnLogout: true,
    recreateSocketDelayMs: 1000,
    // Required when recreateSocketOnLogout is true.
    createSocket,
  });
}

runApp();
```

## Example DataSource Implementation (PostgreSQL)

Install dependency:

```bash
npm install pg
```

Suggested table:

```sql
CREATE TABLE IF NOT EXISTS baileys_auth (
  session_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (session_id, key)
);
```

Example implementation:

```ts
import { Pool } from "pg";
import { IDataSource } from "@leninpkg/baileys-auth";

export class PgDataSource implements IDataSource<string> {
  public constructor(private readonly pool: Pool) {}

  public async write(sessionId: string, key: string, value: string): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO baileys_auth (session_id, key, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (session_id, key)
      DO UPDATE SET value = EXCLUDED.value
      `,
      [sessionId, key, value]
    );
  }

  public async read(sessionId: string, key: string): Promise<string | null> {
    const result = await this.pool.query<{ value: string }>(
      `
      SELECT value
      FROM baileys_auth
      WHERE session_id = $1 AND key = $2
      LIMIT 1
      `,
      [sessionId, key]
    );

    return result.rows[0]?.value ?? null;
  }

  public async delete(sessionId: string, key: string): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM baileys_auth
      WHERE session_id = $1 AND key = $2
      `,
      [sessionId, key]
    );
  }

  public async flush(sessionId: string): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM baileys_auth
      WHERE session_id = $1
      `,
      [sessionId]
    );
  }
}
```

## 📄 License

Copyright (c) 2026 Renan Dutra

Licensed under the MIT License: Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Thus, the maintainers of the project can't be held liable for any potential misuse of this project.
