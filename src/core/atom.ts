import { Lambda } from "../utils/utils"
import { IDerivationState_ } from "./derivation"
import { endBatch, propagateChanged, reportObserved, startBatch } from "./observable"

export const $mobx = Symbol("mobx administration")
export class Atom{
    isPendingUnobservation_ = false // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed
    isBeingObserved_ = false
    observers_ = new Set()

    diffValue_ = 0
    lastAccessedBy_ = 0
    lowestObserverState_ = IDerivationState_.NOT_TRACKING_
    /**
     * Create a new atom. For debugging purposes it is recommended to give it a name.
     * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
     */
    constructor(public name_ = "Atom") { }

    // onBecomeObservedListeners
    public onBOL: Set<Lambda> | undefined
    // onBecomeUnobservedListeners
    public onBUOL: Set<Lambda> | undefined

    public onBO() {
        if (this.onBOL) {
            this.onBOL.forEach(listener => listener())
        }
    }

    public onBUO() {
        if (this.onBUOL) {
            this.onBUOL.forEach(listener => listener())
        }
    }

    /**
     * Invoke this method to notify mobx that your atom has been used somehow.
     * Returns true if there is currently a reactive context.
     */
    public reportObserved(): boolean {
        return reportObserved(this)
    }

    /**
     * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
     */
    public reportChanged() {
        startBatch()
        propagateChanged(this)
        endBatch()
    }

    toString() {
        return this.name_
    }
}

export function createAtom(
    name: string,
) {
    const atom = new Atom(name)
    return atom
}