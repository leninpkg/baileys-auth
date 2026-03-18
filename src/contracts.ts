import { AuthenticationCreds, SignalDataTypeMap } from "baileys";

export type SignalValue = SignalDataTypeMap[keyof SignalDataTypeMap];

/**
 * Defines the persistence contract used to store and retrieve session-scoped
 * authentication and signal data.
 *
 * Implementations are responsible for mapping `(sessionId, key)` pairs to a
 * durable storage backend (for example, database, cache, or file system).
 */
export interface IDataSource<T> {
  /**
   * Persists a signal value or authentication credentials for a specific session and key.
   *
   * @param sessionId Unique identifier of the session.
   * @param key Logical key used to store the value.
   * @param value Signal value or authentication credentials to persist.
   * @returns A promise that resolves when the value is successfully written.
   */
  write(sessionId: string, key: string, value: T): Promise<void>;

  /**
   * Reads a previously persisted signal value or authentication credentials for a specific session and key.
   *
   * @param sessionId Unique identifier of the session.
   * @param key Logical key used to retrieve the value.
   * @returns A promise that resolves with the stored value, or `null` when no
   * value exists for the given session and key.
   */
  read(sessionId: string, key: string): Promise<T | null>;

  /**
   * Deletes a previously persisted signal value or authentication credentials for a specific session and key.
   * @param sessionId Unique identifier of the session.
   * @param key Logical key used to identify the value to delete.
   * @returns A promise that resolves when the value is successfully deleted.
   */
  delete(sessionId: string, key: string): Promise<void>;

  /**
   * Deletes all persisted data associated with a specific session.
   * @param sessionId Unique identifier of the session.
   * @returns A promise that resolves when all data for the session is successfully deleted.
   */
  flush(sessionId: string): Promise<void>;
}

/**
 * Defines the contract for serializing and deserializing signal values.
 *
 * This interface encapsulates two complementary operations:
 * - `replace`: converts an internal value (`SignalValue`) into a serializable
 *   format (`T`) for storage or transport.
 * - `revive`: reconstructs the original value (`SignalValue`) from the
 *   serialized format (`T`).
 *
 * @typeParam T External type used to represent the serialized data.
 */
export interface IDataReplacer<T> {
  /**
   * Converts an internal value into a serializable representation.
   *
   * @param value Original signal value or authentication credentials.
   * @returns Value converted to the external `T` format.
   */
  replace: (value: SignalValue | AuthenticationCreds) => T;

  /**
   * Reconstructs the internal value from the serialized representation.
   *
   * @param value Value in the external `T` format.
   * @returns Restored value in the `SignalValue` or `AuthenticationCreds` format.
   */
  revive: (value: T) => SignalValue | AuthenticationCreds;
}