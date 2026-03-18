import makeWASocket, { DisconnectReason } from "baileys";
import { BaileysAuth } from "../baileys-auth";

type BaileysSocket = ReturnType<typeof makeWASocket>;

export interface SetupAuthListenersOptions {
  /** When `true`, clears session data if logout is detected. */
  clearSessionOnLogout?: boolean;
  /** When `true`, creates a new socket after logout and rebinds listeners. */
  recreateSocketOnLogout?: boolean;
  /** Optional delay in milliseconds before creating a new socket after logout (default: 0). */
  recreateSocketDelayMs?: number;
  /** Factory used to create a new socket instance when recreate is enabled. */
  createSocket?: () => BaileysSocket | Promise<BaileysSocket>;
}

/**
 * Registers authentication-related Baileys event handlers for a socket.
 *
 * This helper wires two listeners:
 * - `creds.update`: persists updated credentials using {@link BaileysAuth.saveCreds}.
 * - `connection.update`: when the connection is closed due to logged out state,
 *   optionally clears both persisted session data and in-memory credentials.
 *
 * @typeParam T Serialized value type used by the underlying data source.
 * @param auth Session-scoped auth manager responsible for persisting and clearing auth data.
 * @param sock Active Baileys socket returned by `makeWASocket`.
 * @param options Listener behavior options.
 */
export function setupAuthListeners<T>(
  auth: BaileysAuth<T>,
  sock: BaileysSocket,
  {
    clearSessionOnLogout = true,
    recreateSocketOnLogout = false,
    recreateSocketDelayMs = 0,
    createSocket
  }: SetupAuthListenersOptions = {}
): void {
  if (recreateSocketOnLogout && !createSocket) {
    throw new Error("createSocket is required when recreateSocketOnLogout is enabled");
  }

  sock.ev.on("creds.update", async () => {
    await auth.saveCreds();
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection !== "close") {
      return;
    }

    const boomError = lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
    const statusCode = boomError?.output?.statusCode;
    if (clearSessionOnLogout && statusCode === DisconnectReason.loggedOut) {
      await auth.clearData();
      await auth.clearCreds();
    }

    if (recreateSocketOnLogout && statusCode === DisconnectReason.loggedOut && createSocket) {
      if (recreateSocketDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, recreateSocketDelayMs));
      }
      const newSocket = await createSocket();
      setupAuthListeners(auth, newSocket, {
        clearSessionOnLogout,
        recreateSocketOnLogout,
        recreateSocketDelayMs,
        createSocket
      });
    }
  });
}