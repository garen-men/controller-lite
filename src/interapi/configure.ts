import { setReactionScheduler } from "../core/reaction";

export function configure(options: {
    reactionScheduler?: (f: () => void) => void
}): void {

    if (options.reactionScheduler) {
        setReactionScheduler(options.reactionScheduler)
    }
}
