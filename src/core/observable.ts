import { ComputedValue } from "./computedvalue"
import { IDerivationState_ } from "./derivation"
import { globalState } from "./globalstate"
import { runReactions } from "./reaction"
export function addObserver(observable, node) {
    observable.observers_.add(node)
    if (observable.lowestObserverState_ > node.dependenciesState_)
        observable.lowestObserverState_ = node.dependenciesState_
}

export function removeObserver(observable, node) {
    observable.observers_.delete(node)
    if (observable.observers_.size === 0) {
        // deleting last observer
        queueForUnobservation(observable)
    }
}
/**
 * Batch starts a transaction, at least for purposes of memoizing ComputedValues when nothing else does.
 * During a batch `onBecomeUnobserved` will be called at most once per observable.
 * Avoids unnecessary recalculations.
 */
export function startBatch() {
    globalState.inBatch++
}

export function endBatch() {
    if (--globalState.inBatch === 0) {
        runReactions()
        // the batch is actually about to finish, all unobserving should happen here.
        const list = globalState.pendingUnobservations
        for (let i = 0; i < list.length; i++) {
            const observable:any = list[i]
            observable.isPendingUnobservation_ = false
            if (observable.observers_.size === 0) {
                if (observable.isBeingObserved_) {
                    // if this observable had reactive observers, trigger the hooks
                    observable.isBeingObserved_ = false
                    observable.onBUO()
                }
                if (observable instanceof ComputedValue) {
                    // computed values are automatically teared down when the last observer leaves
                    // this process happens recursively, this computed might be the last observabe of another, etc..
                    observable.suspend_()
                }
            }
        }
        globalState.pendingUnobservations = []
    }
}

export function reportObserved(observable): boolean {

    const derivation = globalState.trackingDerivation
    if (derivation !== null) {
        /**
         * Simple optimization, give each derivation run an unique id (runId)
         * Check if last time this observable was accessed the same runId is used
         * if this is the case, the relation is already known
         */
        if (derivation.runId_ !== observable.lastAccessedBy_) {
            observable.lastAccessedBy_ = derivation.runId_
            // Tried storing newObserving, or observing, or both as Set, but performance didn't come close...
            derivation.newObserving_![derivation.unboundDepsCount_++] = observable
            if (!observable.isBeingObserved_ && globalState.trackingContext) {
                observable.isBeingObserved_ = true
                observable.onBO()
            }
        }
        return true
    } else if (observable.observers_.size === 0 && globalState.inBatch > 0) {
        queueForUnobservation(observable)
    }

    return false
}


// Called by Atom when its value changes
export function propagateChanged(observable) {
    if (observable.lowestObserverState_ === IDerivationState_.STALE_) return
    observable.lowestObserverState_ = IDerivationState_.STALE_

    observable.observers_.forEach(d => {
        if (d.dependenciesState_ === IDerivationState_.UP_TO_DATE_) {
            d.onBecomeStale_()
        }
        d.dependenciesState_ = IDerivationState_.STALE_
    })
}
// Called by ComputedValue when it recalculate and its value changed
export function propagateChangeConfirmed(observable) {
    // invariantLOS(observable, "confirmed start");
    if (observable.lowestObserverState_ === IDerivationState_.STALE_) return
    observable.lowestObserverState_ = IDerivationState_.STALE_

    observable.observers_.forEach(d => {
        if (d.dependenciesState_ === IDerivationState_.POSSIBLY_STALE_) {
            d.dependenciesState_ = IDerivationState_.STALE_
        } else if (
            d.dependenciesState_ === IDerivationState_.UP_TO_DATE_ // this happens during computing of `d`, just keep lowestObserverState up to date.
        ) {
            observable.lowestObserverState_ = IDerivationState_.UP_TO_DATE_
        }
    })
    // invariantLOS(observable, "confirmed end");
}
// Used by computed when its dependency changed, but we don't wan't to immediately recompute.
export function propagateMaybeChanged(observable) {
    // invariantLOS(observable, "maybe start");
    if (observable.lowestObserverState_ !== IDerivationState_.UP_TO_DATE_) return
    observable.lowestObserverState_ = IDerivationState_.POSSIBLY_STALE_

    observable.observers_.forEach(d => {
        if (d.dependenciesState_ === IDerivationState_.UP_TO_DATE_) {
            d.dependenciesState_ = IDerivationState_.POSSIBLY_STALE_
            d.onBecomeStale_()
        }
    })
    // invariantLOS(observable, "maybe end");
}
export function queueForUnobservation(observable) {
    if (observable.isPendingUnobservation_ === false) {
        // invariant(observable._observers.length === 0, "INTERNAL ERROR, should only queue for unobservation unobserved observables");
        observable.isPendingUnobservation_ = true
        globalState.pendingUnobservations.push(observable)
    }
}