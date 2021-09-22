// import {
//     $mobx,
//     asObservableObject,
//     endBatch,
//     startBatch,
//     isPlainObject,
//     ownKeys,
//     extendObservable,
//     addHiddenProp
// } from "../internal"

import { $mobx } from "../core/atom"
import { addHiddenProp, isPlainObject, ownKeys } from "../utils/utils"

const keysSymbol = Symbol("mobx-keys")

export function makeAutoObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: any,
    options?: any
): T {

    // Optimization: avoid visiting protos
    // Assumes that annotation.make_/.extend_ works the same for plain objects
    if (isPlainObject(target)) {
        return extendObservable(target, target, overrides, options)
    }

    const adm = asObservableObject(target, options)[$mobx]

    // Optimization: cache keys on proto
    // Assumes makeAutoObservable can be called only once per object and can't be used in subclass
    if (!target[keysSymbol]) {
        const proto = Object.getPrototypeOf(target)
        const keys = new Set([...ownKeys(target), ...ownKeys(proto)])
        keys.delete("constructor")
        keys.delete($mobx)
        addHiddenProp(proto, keysSymbol, keys)
    }

    startBatch()
    try {
        target[keysSymbol].forEach(key =>
            adm.make_(
                key,
                // must pass "undefined" for { key: undefined }
                !overrides ? true : key in overrides ? overrides[key] : true
            )
        )
    } finally {
        endBatch()
    }
    return target
}
