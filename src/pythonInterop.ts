import { PyObject } from "pymport";

// Type safe-ish PyObject subset
export interface ProxyPyObject<T> {
    /**
     * Get a property from the object, equivalent to Python member operator .
     * @param {string} name property name
     * @returns {any}
     */
    get: <R = any>(name: string) => Proxify<R>,

    /**
     * Check if a property exists. Equivalent to Python hasattr(o, name)
     * @param {string | any} key property name, only sets accept values that are not a string
     * @returns {boolean}
     */
    has: (name: string | any) => boolean,

    toJS: () => T,

    // Provide access to the full PyObject
    __PyObject__: PyObject
}

export type Proxify<T> = T extends ProxyPyObject<any> ? T : // Prevent nested proxies
    (T extends string | number | Buffer ? {} : // Types that needs no specialization
    (T extends (...a: any) => infer R ? (...a: Parameters<T>) => Proxify<R> : 
    (T extends Array<infer R>         ? ProxyListLike<R> :
    (T extends Map<infer K extends string | number, infer V> ? ProxyDict<K, V> :
    (T extends object                 ? ProxyObject<T> : T)))))
    & ProxyPyObject<T>;

export interface HasLength {
    length: number
}

export interface HasIterator<T> {
    [Symbol.iterator]: () => Iterator<Proxify<T>>
}

export interface ProxyListLike<T> extends HasLength, HasIterator<T> {
    item: (index: number) => Proxify<T>
};

export interface ProxyDict<K, V> extends HasLength, HasIterator<K> {
    item: (index: K) => Proxify<V>
};

export type ProxyObject<T> = { [K in keyof T]: Proxify<T[K]> };

// Allows bypassing Proxify
export type PreProxied<T> = T & ProxyPyObject<T>;