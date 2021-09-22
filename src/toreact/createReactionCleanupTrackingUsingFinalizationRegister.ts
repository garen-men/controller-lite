import { Reaction } from "../core/reaction"
import { createTrackingData } from "./createTrackingData"

/**
 * FinalizationRegistry-based uncommitted reaction cleanup
 */
export function createReactionCleanupTrackingUsingFinalizationRegister(
    FinalizationRegistry:any
) {
    const cleanupTokenToReactionTrackingMap = new Map()
    let globalCleanupTokensCounter = 1

    const registry = new FinalizationRegistry(function cleanupFunction(token: number) {
        const trackedReaction = cleanupTokenToReactionTrackingMap.get(token)
        if (trackedReaction) {
            trackedReaction.reaction.dispose()
            cleanupTokenToReactionTrackingMap.delete(token)
        }
    })

    return {
        addReactionToTrack(
            reactionTrackingRef: any,
            reaction: Reaction,
            objectRetainedByReact: object
        ) {
            const token = globalCleanupTokensCounter++

            registry.register(objectRetainedByReact, token, reactionTrackingRef)
            reactionTrackingRef.current = createTrackingData(reaction)
            reactionTrackingRef.current.finalizationRegistryCleanupToken = token
            cleanupTokenToReactionTrackingMap.set(token, reactionTrackingRef.current)

            return reactionTrackingRef.current
        },
        recordReactionAsCommitted(reactionRef) {
            registry.unregister(reactionRef)

            if (reactionRef.current && reactionRef.current.finalizationRegistryCleanupToken) {
                cleanupTokenToReactionTrackingMap.delete(
                    reactionRef.current.finalizationRegistryCleanupToken
                )
            }
        },
        forceCleanupTimerToRunNowForTests() {
            // When FinalizationRegistry in use, this this is no-op
        },
        resetCleanupScheduleForTests() {
            // When FinalizationRegistry in use, this this is no-op
        }
    }
}
