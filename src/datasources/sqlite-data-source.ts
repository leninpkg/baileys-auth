import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { IDataSource } from "../contracts";

/**
 * SQLite-based data source implementation for {@link IDataSource}.
 *
 * This class uses a local SQLite database file to persist session-related values.
 */
export class SqliteDataSource implements IDataSource<string> {
  private _db: DatabaseSync;

  public constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this._db = new DatabaseSync(dbPath);
    this._db.exec(
      "CREATE TABLE IF NOT EXISTS session_data (session_id TEXT NOT NULL, data_key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(session_id, data_key))"
    );
  }

  public async write(sessionId: string, key: string, value: string): Promise<void> {
    this._db
      .prepare(
        "INSERT INTO session_data(session_id, data_key, value) VALUES(?, ?, ?) ON CONFLICT(session_id, data_key) DO UPDATE SET value = excluded.value"
      )
      .run(sessionId, key, value);
  }

  public async read(sessionId: string, key: string): Promise<string | null> {
    const row = this._db
      .prepare("SELECT value FROM session_data WHERE session_id = ? AND data_key = ? LIMIT 1")
      .get(sessionId, key) as { value: string } | undefined;

    return row?.value ?? null;
  }

  public async delete(sessionId: string, key: string): Promise<void> {
    this._db.prepare("DELETE FROM session_data WHERE session_id = ? AND data_key = ?").run(sessionId, key);
  }

  public close(): void {
    this._db.close();
  }
}