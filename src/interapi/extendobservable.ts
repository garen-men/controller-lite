
import { $mobx } from "../core/atom"
import { endBatch, startBatch } from "../core/observable"
import { asObservableObject } from "../types/observableobject"
import { getOwnPropertyDescriptors, ownKeys } from "../utils/utils"

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    properties: B,
    annotations?: any,
): A & B {

    // Pull descriptors first, so we don't have to deal with props added by administration ($mobx)
    const descriptors = getOwnPropertyDescriptors(properties)

    const adm: any = asObservableObject(target)[$mobx]
    startBatch()
    try {
        ownKeys(descriptors).forEach(key => {
            adm.extend_(
                key,
                descriptors[key as any],
                // must pass "undefined" for { key: undefined }
                !annotations ? true : key in annotations ? annotations[key] : true
            )
        })
    } finally {
        endBatch()
    }
    return target as any
}
