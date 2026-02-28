import { Pool, PoolConfig } from "pg";
import { IDataSource } from "../contracts";

/**
 * PostgreSQL-based data source implementation for {@link IDataSource}.
 *
 * This class stores session values in a `session_data` table and automatically
 * creates the table when first used.
 */
export class PostgresDataSource implements IDataSource<string> {
  private _pool: Pool;
  private _ready: Promise<void>;

  /**
   * Creates a PostgreSQL data source.
   *
   * @param connection A PostgreSQL connection string or `pg` pool configuration.
   */
  public constructor(connection: string | PoolConfig) {
    this._pool = typeof connection === "string"
      ? new Pool({ connectionString: connection })
      : new Pool(connection);

    this._ready = this.bootstrap();
  }

  public async write(sessionId: string, key: string, value: string): Promise<void> {
    await this._ready;
    await this._pool.query(
      `
      INSERT INTO session_data(session_id, data_key, value)
      VALUES ($1, $2, $3)
      ON CONFLICT(session_id, data_key)
      DO UPDATE SET value = EXCLUDED.value
      `,
      [sessionId, key, value]
    );
  }

  public async read(sessionId: string, key: string): Promise<string | null> {
    await this._ready;
    const result = await this._pool.query<{ value: string }>(
      `
      SELECT value
      FROM session_data
      WHERE session_id = $1 AND data_key = $2
      LIMIT 1
      `,
      [sessionId, key]
    );

    return result.rows[0]?.value ?? null;
  }

  public async delete(sessionId: string, key: string): Promise<void> {
    await this._ready;
    await this._pool.query(
      `
      DELETE FROM session_data
      WHERE session_id = $1 AND data_key = $2
      `,
      [sessionId, key]
    );
  }

  public async close(): Promise<void> {
    await this._pool.end();
  }

  private async bootstrap(): Promise<void> {
    await this._pool.query(
      `
      CREATE TABLE IF NOT EXISTS session_data (
        session_id TEXT NOT NULL,
        data_key TEXT NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY(session_id, data_key)
      )
      `
    );
  }
}
