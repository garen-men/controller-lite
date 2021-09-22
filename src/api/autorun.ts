import { Reaction } from "../core/reaction"
import { EMPTY_OBJECT } from "../utils/utils"

export interface IAutorunOptions {
    delay?: number
    name?: string
    /**
     * Experimental.
     * Warns if the view doesn't track observables
     */
    requiresObservable?: boolean
    scheduler?: (callback: () => void) => any
    onError?: (error: any) => void
}

/**
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(
    view: (r: any) => any,
    opts: IAutorunOptions = EMPTY_OBJECT
) {

    const name: string =
        opts?.name ?? ("Autorun")
    const runSync = !opts.scheduler && !opts.delay
    let reaction: Reaction

    if (runSync) {
        // normal autorun
        reaction = new Reaction(
            name,
            function (this: Reaction) {
                this.track(reactionRunner)
            },
            opts.onError,
            opts.requiresObservable
        )
    } else {
        const scheduler = createSchedulerFromOptions(opts)
        // debounced autorun
        let isScheduled = false

        reaction = new Reaction(
            name,
            () => {
                if (!isScheduled) {
                    isScheduled = true
                    scheduler(() => {
                        isScheduled = false
                        if (!reaction.isDisposed_) reaction.track(reactionRunner)
                    })
                }
            },
            opts.onError,
            opts.requiresObservable
        )
    }

    function reactionRunner() {
        view(reaction)
    }

    reaction.schedule_()
    return reaction.getDisposer_()
}

export type IReactionOptions<T> = IAutorunOptions & {
    fireImmediately?: boolean
    equals: any
}

const run = (f: () => any) => f()

function createSchedulerFromOptions(opts: IAutorunOptions) {
    return opts.scheduler
        ? opts.scheduler
        : opts.delay
        ? (f: TimerHandler) => setTimeout(f, opts.delay!)
        : run
}

