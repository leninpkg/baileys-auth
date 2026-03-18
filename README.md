# @leninpkg/baileys-auth

Generic auth-state adapter for [Baileys](https://github.com/WhiskeySockets/Baileys), with pluggable persistence and serialization.

## Quick Start (SQLite)

```ts
import pino from "pino";
import { makeWASocket } from "baileys";
import { BaileysAuth, JsonDataReplacer, SqliteDataSource } from "@leninpkg/baileys-auth";

async function runApp() {
  const sessionId = "your-session-id";
  const dataSource = 
  const dataReplacer = new JsonReplacer();

  const auth = await BaileysAuth.fromSession({
    sessionId,
    new SqliteDataSource("./data/baileys.sqlite"),
    new JsonDataReplacer()
  });

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: auth.state,
  });

  sock.ev.on("creds.update", async () => {
    await auth.saveCreds();
  });
}

runApp();
```

## 📄 License

Copyright (c) 2026 Renan Dutra

Licensed under the MIT License: Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Thus, the maintainers of the project can't be held liable for any potential misuse of this project.