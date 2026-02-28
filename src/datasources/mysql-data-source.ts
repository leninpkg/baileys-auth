import { createPool, Pool, PoolOptions, RowDataPacket } from "mysql2/promise";
import { IDataSource } from "../contracts";

/**
 * MySQL-based data source implementation for {@link IDataSource}.
 *
 * This class stores session values in a `session_data` table and automatically
 * creates the table when first used.
 */
export class MySqlDataSource implements IDataSource<string> {
  private _pool: Pool;
  private _ready: Promise<void>;

  /**
   * Creates a MySQL data source.
   *
   * @param connection A MySQL connection string or `mysql2` pool configuration.
   */
  public constructor(connection: string | PoolOptions) {
    this._pool = typeof connection === "string"
      ? createPool(connection)
      : createPool(connection);

    this._ready = this.bootstrap();
  }

  public async write(sessionId: string, key: string, value: string): Promise<void> {
    await this._ready;
    await this._pool.execute(
      `
      INSERT INTO session_data(session_id, data_key, value)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
      `,
      [sessionId, key, value]
    );
  }

  public async read(sessionId: string, key: string): Promise<string | null> {
    await this._ready;
    const [rows] = await this._pool.query<RowDataPacket[]>(
      `
      SELECT value
      FROM session_data
      WHERE session_id = ? AND data_key = ?
      LIMIT 1
      `,
      [sessionId, key]
    );

    return (rows[0]?.["value"] as string | undefined) ?? null;
  }

  public async delete(sessionId: string, key: string): Promise<void> {
    await this._ready;
    await this._pool.execute(
      `
      DELETE FROM session_data
      WHERE session_id = ? AND data_key = ?
      `,
      [sessionId, key]
    );
  }

  public async close(): Promise<void> {
    await this._pool.end();
  }

  private async bootstrap(): Promise<void> {
    await this._pool.execute(
      `
      CREATE TABLE IF NOT EXISTS session_data (
        session_id VARCHAR(191) NOT NULL,
        data_key VARCHAR(191) NOT NULL,
        value LONGTEXT NOT NULL,
        PRIMARY KEY(session_id, data_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `
    );
  }
}
