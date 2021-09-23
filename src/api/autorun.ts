import { Reaction } from "../core/reaction"

/**
 * 取消传参,只允许同步的autorun
 * Creates a named reactive view and keeps it alive, so that the view is always
 * updated if one of the dependencies changes, even when the view is not further used by something else.
 * @param view The reactive view
 * @returns disposer function, which can be used to stop the view from being updated in the future.
 */
export function autorun(
    view: (r: any) => any,
) {

    const name: string = "Autorun"
    let reaction: Reaction

    // normal autorun
    reaction = new Reaction(
        name,
        function (this: Reaction) {
            this.track(reactionRunner)
        },
    )


    function reactionRunner() {
        view(reaction)
    }

    reaction.schedule_()
    return reaction.getDisposer_()
}


