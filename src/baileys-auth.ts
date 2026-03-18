import { initAuthCreds, proto } from "baileys";
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from "baileys/lib/Types/Auth";
import { IDataReplacer, IDataSource } from "./contracts";

/**
 * Configuration used to create a {@link BaileysAuth} instance.
 *
 * @typeParam T Serialized value type handled by the provided data source and
 * data replacer implementations.
 */
export interface BaileysAuthOptions<T> {
  /** Unique identifier of the auth session. */
  sessionId: string;

  /** Data source responsible for persisting session-related values. */
  dataSource: IDataSource<T>;

  /** Replacer responsible for serialization/deserialization transformations. */
  dataReplacer: IDataReplacer<T>

  /** Optional preloaded credentials; when omitted, fresh credentials are created. */
  credentials?: AuthenticationCreds;
}

/**
 * Options used when loading a session from persisted storage.
 *
 * This type is equivalent to {@link BaileysAuthOptions} without `credentials`
 * because credentials are loaded or initialized internally.
 *
 * @typeParam T Serialized value type handled by persistence layers.
 */
export type LoadSessionOptions<T> = Omit<BaileysAuthOptions<T>, "credentials">;

/**
 * Alias of supported key categories from Baileys signal data map.
 */
export type SignalKey = keyof SignalDataTypeMap;

/**
 * Session-scoped authentication manager for Baileys credentials and signal keys.
 *
 * This class wraps persistence operations and exposes the
 * {@link AuthenticationState} shape expected by Baileys.
 *
 * @typeParam T Serialized value type used by the persistence layer.
 */
export class BaileysAuth<T> {
  /** Current session identifier. */
  private _sessionId: string;

  /** Persistence adapter used to read/write/delete serialized values. */
  private _dataSource: IDataSource<T>;

  /** Serializer/deserializer adapter for credentials and signal values. */
  private _dataReplacer: IDataReplacer<T>;

  /** In-memory authentication credentials for the active session. */
  private _credentials: AuthenticationCreds;

  /**
   * Creates a new auth manager instance.
   *
   * @param options Construction options including session, storage, and
   * serialization dependencies.
   */
  public constructor({ dataSource, dataReplacer, sessionId, credentials }: BaileysAuthOptions<T>) {
    this._sessionId = sessionId;
    this._dataSource = dataSource;
    this._dataReplacer = dataReplacer;
    this._credentials = credentials || initAuthCreds();
  }

  /**
   * Gets the identifier of the current session.
   */
  public get sessionId(): string {
    return this._sessionId;
  }

  /**
   * Gets the current in-memory authentication credentials.
   */
  public get creds(): AuthenticationCreds {
    return this._credentials;
  }

  /**
   * Gets the Baileys-compatible authentication state.
   *
   * The returned object exposes credential data and signal key handlers for
   * retrieving and persisting key material through the configured data source.
   */
  public get state(): AuthenticationState {
    return {
      creds: this._credentials,
      keys: {
        get: async (type, ids) => {
          const data: Record<string, any> = {};

          await Promise.all(
            ids.map(async (id) => {
              const value = await this._dataSource.read(this._sessionId, this.toKey(type, id));
              if (type === "app-state-sync-key" && value) {
                data[id] = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks: Array<Promise<void>> = [];
          for (const type in data) {
            for (const id in data[type as SignalKey]) {
              const key = this.toKey(type, id);
              const value = data[type as SignalKey]?.[id];
              let task: Promise<void>;
              if (value) {
                task = this._dataSource.write(this._sessionId, key, this._dataReplacer.replace(value));
              } else {
                task = this._dataSource.delete(this._sessionId, key);
              }
              tasks.push(task);
            }
          }
          await Promise.all(tasks);
        }
      }
    }
  }

  /**
   * Persists the current credentials in the configured data source.
   *
   * @returns A promise resolved when credentials are successfully saved.
   */
  public async saveCreds(): Promise<void> {
    const replaced = this._dataReplacer.replace(this._credentials);
    await this._dataSource.write(this._sessionId, "credentials", replaced);
  }

  /**
   * Resets in-memory credentials and removes persisted credentials.
   *
   * @returns A promise resolved when persisted credentials are deleted.
   */
  public async clearCreds(): Promise<void> {
    this._credentials = initAuthCreds();
    await this._dataSource.delete(this._sessionId, "credentials");
  }

  /**
   * Clears all persisted data associated with the current session.
   *
   * @returns A promise resolved when session data cleanup completes.
   */
  public async clearData(): Promise<void> {
    await this._dataSource.flush(this._sessionId);
  }

  /**
   * Loads or initializes a session and returns a ready-to-use auth manager.
   *
   * @typeParam T Serialized value type used by persistence adapters.
   * @param options Session loading dependencies and identifiers.
   * @returns A new {@link BaileysAuth} instance bound to the target session.
   */
  public static async fromSession<T>({ dataSource, dataReplacer, sessionId }: LoadSessionOptions<T>): Promise<BaileysAuth<T>> {
    let credentials: AuthenticationCreds;
    const loadedCreds = await dataSource.read(sessionId, "credentials");

    if (loadedCreds) {
      credentials = dataReplacer.replace(loadedCreds) as AuthenticationCreds;
    } else {
      credentials = initAuthCreds();
    }

    return new BaileysAuth<T>({ dataSource, dataReplacer, sessionId, credentials });
  }

  /**
   * Builds a storage key from a signal key type and item identifier.
   *
   * @param type Signal key category.
   * @param id Unique key identifier within the category.
   * @returns Composite key in `type:id` format.
   */
  private toKey(type: string, id: string): string {
    return `${type}:${id}`;
  }
}