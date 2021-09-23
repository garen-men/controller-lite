
import { $mobx } from "../core/atom"
import { endBatch, startBatch } from "../core/observable"
import { asObservableObject } from "../types/observableobject"
import { addHiddenProp, ownKeys } from "../utils/utils"

const keysSymbol = Symbol("mobx-keys")

export function makeAutoObservable(
    target: any,
    overrides?: any,
): any {

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
        target[keysSymbol].forEach((key:any) =>
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
