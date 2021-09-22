import { configure } from "../interapi/configure"

export function defaultNoopBatch(callback: () => void) {
    callback()
}

export function observerBatching(reactionScheduler: any) {
    if (!reactionScheduler) {
        reactionScheduler = defaultNoopBatch
        console.warn("[MobX] Failed to get unstable_batched updates from react-dom")
    }
    configure({ reactionScheduler })
}
