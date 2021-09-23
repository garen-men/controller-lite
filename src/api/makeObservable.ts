
import { $mobx } from "../core/atom"
import { endBatch, startBatch } from "../core/observable"
import { extendObservable } from "../interapi/extendobservable"
import { asObservableObject } from "../types/observableobject"
import { addHiddenProp, isPlainObject, ownKeys } from "../utils/utils"

const keysSymbol = Symbol("mobx-keys")

export function makeAutoObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: any,
): T {

    // Optimization: avoid visiting protos
    // Assumes that annotation.make_/.extend_ works the same for plain objects
    if (isPlainObject(target)) {
        return extendObservable(target, target, overrides)
    }

    const adm = asObservableObject(target)[$mobx]

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
