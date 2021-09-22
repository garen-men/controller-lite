import { autorun } from "./api/autorun"
import { makeAutoObservable } from "./api/makeObservable"
import { toJS } from "./api/tojs"



export {
    toJS,
    makeAutoObservable,
    autorun
}

// declare const __MOBX_DEVTOOLS_GLOBAL_HOOK__: { injectMobx: (any) => void }
// if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
//     // See: https://github.com/andykog/mobx-devtools/
//     __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
//         spy,
//         extras: {
//             getDebugName
//         },
//         $mobx
//     })
// }