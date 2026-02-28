import { AuthenticationCreds, BufferJSON } from "baileys";
import { IDataReplacer, SignalValue } from "../contracts";

/**
 * Default JSON-based replacer implementation for {@link IDataReplacer}.
 *
 * This class uses `JSON.stringify` and `JSON.parse` for serialization and
 * deserialization, respectively. It also applies Baileys' `BufferJSON`
 * to handle Buffer objects correctly.
 */
export class JsonReplacer implements IDataReplacer<string> {
  public replace(value: SignalValue | AuthenticationCreds): string {
    return JSON.stringify(value, BufferJSON.replacer);
  }

  public revive(value: string): SignalValue | AuthenticationCreds {
    return JSON.parse(value, BufferJSON.reviver);
  }
}