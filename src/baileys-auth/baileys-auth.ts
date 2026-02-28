import { initAuthCreds, proto } from "baileys";
import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from "baileys/lib/Types/Auth";
import { IDataReplacer, IDataSource } from "./contracts";

export interface BaileysAuthOptions<T> {
  sessionId: string;
  dataSource: IDataSource<T>;
  dataReplacer: IDataReplacer<T>
  credentials?: AuthenticationCreds;
}

type LoadSessionOptions<T> = Omit<BaileysAuthOptions<T>, "credentials">;
type SignalKey = keyof SignalDataTypeMap;

class BaileysAuth<T> {
  private _sessionId: string;
  private _dataSource: IDataSource<T>;
  private _dataReplacer: IDataReplacer<T>;
  private _credentials: AuthenticationCreds;

  public constructor({ dataSource, dataReplacer, sessionId, credentials }: BaileysAuthOptions<T>) {
    this._sessionId = sessionId;
    this._dataSource = dataSource;
    this._dataReplacer = dataReplacer;
    this._credentials = credentials || initAuthCreds();
  }

  public get sessionId(): string {
    return this._sessionId;
  }

  public get credentials(): AuthenticationCreds {
    return this._credentials;
  }

  public get authState(): AuthenticationState {
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

  public async saveCredentials(): Promise<void> {
    const replaced = this._dataReplacer.replace(this._credentials);
    await this._dataSource.write(this._sessionId, "credentials", replaced);
  }

  public async clearCredentials(): Promise<void> {
    this._credentials = initAuthCreds();
    await this._dataSource.delete(this._sessionId, "credentials");
  }

  public async clearAllSessionData(): Promise<void> {
    await this._dataSource.delete(this._sessionId, "credentials");
  }

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

  private toKey(type: string, id: string): string {
    return `${type}:${id}`;
  }

}

export default BaileysAuth;