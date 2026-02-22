// Lazy-load pymport to avoid startup crashes in restricted environments
import { Proxify } from "./pythonInterop";

let _json: Proxify<{
    loads(s: string): any,
    dumps(obj: any, options?: { ensure_ascii?: boolean, indent?: number }): string
}> | undefined;

const jsonProxy = new Proxy({} as any, {
    get(_, prop) {
        if (!_json) {
            const { pymport, proxify } = require("pymport");
            _json = proxify(pymport("json"));
        }
        return (_json as any)[prop];
    }
}) as Proxify<{
    loads(s: string): any,
    dumps(obj: any, options?: { ensure_ascii?: boolean, indent?: number }): string
}>;

export const json = jsonProxy;
export default json;