
/**
 * Reactions are a special kind of derivations. Several things distinguishes them from normal reactive computations
 *
 * 1) They will always run, whether they are used by other computations or not.
 * This means that they are very suitable for triggering side effects like logging, updating the DOM and making network requests.
 * 2) They are not observable themselves
 * 3) They will always run after any 'normal' derivations
 * 4) They are allowed to change the state and thereby triggering themselves again, as long as they make sure the state propagates to a stable state in a reasonable amount of iterations.
 *
 * The state machine of a Reaction is as follows:
 *
 * 1) after creating, the reaction should be started by calling `runReaction` or by scheduling it (see also `autorun`)
 * 2) the `onInvalidate` handler should somehow result in a call to `this.track(someFunction)`
 * 3) all observables accessed in `someFunction` will be observed by this reaction.
 * 4) as soon as some of the dependencies has changed the Reaction will be rescheduled for another run (after the current mutation or transaction). `isScheduled` will yield true once a dependency is stale and during this period
 * 5) `onInvalidate` will be called, and we are back at step 1.
 *
 */

import { createInstanceofPredicate, Lambda } from "../utils/utils"
import { clearObserving, IDerivation, IDerivationState_, isCaughtException, shouldCompute, TraceMode, trackDerivedFunction } from "./derivation"
import { globalState } from "./globalstate"
import { endBatch, startBatch } from "./observable"
import { unstable_batchedUpdates } from "react-dom"

export interface IReactionPublic {
    dispose(): void
    trace(enterBreakPoint?: boolean): void
}

export interface IReactionDisposer {
    (): void
    $mobx: Reaction
}

export class Reaction{
    observing_ = [] // nodes we are looking at. Our value depends on these nodes
    newObserving_ = []
    dependenciesState_ = IDerivationState_.NOT_TRACKING_
    diffValue_ = 0
    runId_ = 0
    unboundDepsCount_ = 0
    isDisposed_ = false
    isScheduled_ = false
    isTrackPending_ = false
    isRunning_ = false
    isTracing_: TraceMode = TraceMode.NONE

    constructor(
        public name_: string = "Reaction",
        private onInvalidate_: () => void,
        private errorHandler_?: (error: any, derivation: IDerivation) => void,
        public requiresObservable_ = false
    ) {}

    onBecomeStale_() {
        this.schedule_()
    }

    schedule_() {
        if (!this.isScheduled_) {
            this.isScheduled_ = true
            globalState.pendingReactions.push(this)
            runReactions()
        }
    }

    isScheduled() {
        return this.isScheduled_
    }

    /**
     * internal, use schedule() if you intend to kick off a reaction
     */
    runReaction_() {
        if (!this.isDisposed_) {
            startBatch()
            this.isScheduled_ = false
            const prev = globalState.trackingContext
            globalState.trackingContext = this
            if (shouldCompute(this)) {
                this.isTrackPending_ = true

                try {
                    this.onInvalidate_()
                } catch (e) {
                    this.reportExceptionInDerivation_(e)
                }
            }
            globalState.trackingContext = prev
            endBatch()
        }
    }
    // 核心方法 
    track(fn: () => void) {
        if (this.isDisposed_) {
            return
        }
        startBatch()
        this.isRunning_ = true
        const prevReaction = globalState.trackingContext // reactions could create reactions...
        globalState.trackingContext = this
        const result = trackDerivedFunction(this, fn, undefined)
        globalState.trackingContext = prevReaction
        this.isRunning_ = false
        this.isTrackPending_ = false
        if (this.isDisposed_) {
            // disposed during last run. Clean up everything that was bound after the dispose call.
            clearObserving(this)
        }
        if (isCaughtException(result)) this.reportExceptionInDerivation_(result.cause)
        endBatch()
    }

    reportExceptionInDerivation_(error: any) {
        if (this.errorHandler_) {
            this.errorHandler_(error, this)
            return
        }
        const message = `[mobx] uncaught error in '${this}'`
        if (!globalState.suppressReactionErrors) {
            console.error(message, error)
        } 
        globalState.globalReactionErrorHandlers.forEach(f => f(error, this))
    }

    dispose() {
        if (!this.isDisposed_) {
            this.isDisposed_ = true
            if (!this.isRunning_) {
                // if disposed while running, clean up later. Maybe not optimal, but rare case
                startBatch()
                clearObserving(this)
                endBatch()
            }
        }
    }

    getDisposer_(): IReactionDisposer {
        const r = this.dispose.bind(this) as IReactionDisposer
        r[$mobx] = this
        return r
    }

    toString() {
        return `Reaction[${this.name_}]`
    }

}

export function onReactionError(handler: (error: any, derivation: IDerivation) => void): Lambda {
    globalState.globalReactionErrorHandlers.push(handler)
    return () => {
        const idx = globalState.globalReactionErrorHandlers.indexOf(handler)
        if (idx >= 0) globalState.globalReactionErrorHandlers.splice(idx, 1)
    }
}

/**
 * Magic number alert!
 * Defines within how many times a reaction is allowed to re-trigger itself
 * until it is assumed that this is gonna be a never ending loop...
 */
const MAX_REACTION_ITERATIONS = 100


export function runReactions() {
    // 如果执行反应,那么新反应不会执行
    if (globalState.inBatch > 0 || globalState.isRunningReactions) return
    // 启用REACT批量更新
    unstable_batchedUpdates(() => runReactionsHelper())
}

function runReactionsHelper() {
    globalState.isRunningReactions = true
    const allReactions = globalState.pendingReactions
    let iterations = 0

    // While running reactions, new reactions might be triggered.
    // Hence we work with two variables and check whether
    // we converge to no remaining reactions after a while.
    while (allReactions.length > 0) {
        if (++iterations === MAX_REACTION_ITERATIONS) {
            console.error(
                `[mobx]循环触发超过100次: ${allReactions[0]}`
            )
            allReactions.splice(0) // clear reactions
        }
        let remainingReactions = allReactions.splice(0)
        for (let i = 0, l = remainingReactions.length; i < l; i++)
            remainingReactions[i].runReaction_()
    }
    globalState.isRunningReactions = false
}

export const isReaction = createInstanceofPredicate("Reaction", Reaction)

