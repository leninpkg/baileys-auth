# @leninpkg/baileys-auth

Generic auth-state adapter for [Baileys](https://github.com/WhiskeySockets/Baileys), with pluggable persistence and serialization.

## ✨ Features

- Works with Baileys `AuthenticationState`
- Storage abstraction via `IDataSource<T>`
- Serialization abstraction via `IDataReplacer<T>`
- Ready-to-use JSON replacer (`JsonReplacer`)
- Ready-to-use SQLite datasource (`SqliteDataSource`)
- Optional PostgreSQL datasource (`PostgresDataSource`)
- Optional MySQL datasource (`MySqlDataSource`)

## 📦 Installation

Install the library and required peer dependency (`baileys`):

```bash
pnpm add @leninpkg/baileys-auth baileys
```

### Optional: PostgreSQL support

If you want to use the Postgres datasource, install `pg` in your app:

```bash
pnpm add pg
```

> `pg` is an optional peer dependency and is only needed when you use `PostgresDataSource`.

### Optional: MySQL support

If you want to use the MySQL datasource, install `mysql2` in your app:

```bash
pnpm add mysql2
```

> `mysql2` is an optional peer dependency and is only needed when you use `MySqlDataSource`.

## 🚀 Quick Start (SQLite)

```ts
import pino from "pino";
import { makeWASocket } from "baileys";
import { BaileysAuth, JsonReplacer, SqliteDataSource } from "@leninpkg/baileys-auth";

async function main() {
  const sessionId = "my-session";

  const dataSource = new SqliteDataSource("./data/baileys.sqlite");
  const dataReplacer = new JsonReplacer();

  const auth = await BaileysAuth.fromSession({
    sessionId,
    dataSource,
    dataReplacer,
  });

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: auth.authState,
  });

  sock.ev.on("creds.update", async () => {
    await auth.saveCredentials();
  });

  process.on("SIGINT", () => {
    dataSource.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

## 🐘 PostgreSQL

`PostgresDataSource` is intentionally not re-exported from the package root, so users who do not install `pg` are not affected.

Import it directly from its module path:

```ts
import { PostgresDataSource } from "@leninpkg/baileys-auth/lib/datasources/postgres-data-source";
```

Usage example:

```ts
import pino from "pino";
import { makeWASocket } from "baileys";
import { BaileysAuth, JsonReplacer } from "@leninpkg/baileys-auth";
import { PostgresDataSource } from "@leninpkg/baileys-auth/lib/datasources/postgres-data-source";

async function main() {
  const auth = await BaileysAuth.fromSession({
    sessionId: "my-session",
    dataSource: new PostgresDataSource(process.env.DATABASE_URL!),
    dataReplacer: new JsonReplacer(),
  });

  const sock = makeWASocket({ 
    logger: pino({ level: "silent" }), 
    auth: auth.authState 
  });

  sock.ev.on("creds.update", async () => {
    await auth.saveCredentials();
  });
}

main().catch(console.error);
```

You can also initialize Postgres with `PoolConfig`:

```ts
new PostgresDataSource({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "baileys",
});
```

## 🐬 MySQL

`MySqlDataSource` is intentionally not re-exported from the package root, so users who do not install `mysql2` are not affected.

Import it directly from its module path:

```ts
import { MySqlDataSource } from "@leninpkg/baileys-auth/lib/datasources/mysql-data-source";
```

Usage example:

```ts
import pino from "pino";
import { makeWASocket } from "baileys";
import { BaileysAuth, JsonReplacer } from "@leninpkg/baileys-auth";
import { MySqlDataSource } from "@leninpkg/baileys-auth/lib/datasources/mysql-data-source";

async function main() {
  const auth = await BaileysAuth.fromSession({
    sessionId: "my-session",
    dataSource: new MySqlDataSource(process.env.DATABASE_URL!),
    dataReplacer: new JsonReplacer(),
  });

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: auth.authState,
  });

  sock.ev.on("creds.update", async () => {
    await auth.saveCredentials();
  });
}

main().catch(console.error);
```

You can also initialize MySQL with `PoolOptions`:

```ts
new MySqlDataSource({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "root",
  database: "baileys",
});
```

## 🧩 Core Concepts

### `BaileysAuth<T>`

Main class that bridges your persistence layer and Baileys auth state.

- `BaileysAuth.fromSession(options)` loads persisted credentials or initializes new ones
- `auth.authState` returns a Baileys-compatible `AuthenticationState`
- `auth.saveCredentials()` persists current credentials
- `auth.clearCredentials()` resets in-memory credentials and removes persisted credentials
- `auth.clearAllSessionData()` clears persisted session credentials key

### `IDataSource<T>`

Storage contract:

- `write(sessionId, key, value): Promise<void>`
- `read(sessionId, key): Promise<T | null>`
- `delete(sessionId, key): Promise<void>`

### `IDataReplacer<T>`

Serialization contract:

- `replace(value): T`
- `revive(value): SignalValue | AuthenticationCreds`

Use `JsonReplacer` for JSON-based serialization with Baileys `BufferJSON` support.

## 🗂️ Built-in Datasources

### `SqliteDataSource`

- Uses Node.js built-in `node:sqlite` API
- Creates table automatically (`session_data`)
- Supports `write` (upsert), `read`, `delete`
- Exposes `close()` for graceful shutdown

### `PostgresDataSource`

- Uses `pg` pool API
- Creates table automatically (`session_data`)
- Supports `write` (upsert), `read`, `delete`
- Exposes `close()` for graceful shutdown

### `MySqlDataSource`

- Uses `mysql2/promise` pool API
- Creates table automatically (`session_data`)
- Supports `write` (upsert), `read`, `delete`
- Exposes `close()` for graceful shutdown

## 🛠️ Build

```bash
pnpm build
```

Output is generated in:

- `lib/**/*.js`
- `lib/**/*.d.ts`

## 📚 API Exports

Root package exports:

- `BaileysAuth`
- `BaileysAuthOptions`
- `LoadSessionOptions`
- `SignalKey`
- `IDataSource`
- `IDataReplacer`
- `SignalValue`
- `JsonReplacer`
- `SqliteDataSource`

Deep export (optional Postgres):

- `@leninpkg/baileys-auth/lib/datasources/postgres-data-source`

Deep export (optional MySQL):

- `@leninpkg/baileys-auth/lib/datasources/mysql-data-source`

## 🧪 Development

Install dependencies:

```bash
pnpm install
```

Build:

```bash
pnpm build
```

## 📄 License

MIT
