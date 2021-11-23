
// we don't use globalState for these in order to avoid possible issues with multiple
import { getDescriptor } from "../utils/utils"
import { allowStateReadsEnd, allowStateReadsStart, untrackedEnd, untrackedStart } from "./derivation"
import { globalState } from "./globalstate"
import { endBatch, startBatch } from "./observable"

// mobx versions
let currentActionId = 0
let nextActionId = 1
const isFunctionNameConfigurable = getDescriptor(() => {}, "name")?.configurable ?? false

// we can safely recycle this object
const tmpNameDescriptor: PropertyDescriptor = {
    value: "action",
    configurable: true,
    writable: false,
    enumerable: false
}

export function createAction(
    actionName: string,
    fn: Function,
    autoAction: boolean = false,
    ref?: Object
): Function {
    function res() {
        return executeAction(actionName, autoAction, fn, ref || this, arguments)
    }
    res.isMobxAction = true
    if (isFunctionNameConfigurable) {
        tmpNameDescriptor.value = actionName
        Object.defineProperty(res, "name", tmpNameDescriptor)
    }
    return res
}

export function executeAction(
    actionName: string,
    canRunAsDerivation: boolean,
    fn: Function,
    scope?: any,
    args?: IArguments
) {
    const runInfo = _startAction(actionName, canRunAsDerivation, scope, args)
    try {
        return fn.apply(scope, args)
    } catch (err) {
        runInfo.error_ = err
        throw err
    } finally {
        _endAction(runInfo)
    }
}

export interface IActionRunInfo {
    prevDerivation_: any
    prevAllowStateChanges_: boolean
    prevAllowStateReads_: boolean
    startTime_: number
    error_?: any
    parentActionId_: number
    actionId_: number
    runAsAction_?: boolean
}

export function _startAction(
    actionName: string,
    canRunAsDerivation: boolean, // true for autoAction
    scope: any,
    args?: IArguments
): IActionRunInfo {
    let startTime_: number = 0
    const prevDerivation_ = globalState.trackingDerivation
    const runAsAction = !canRunAsDerivation || !prevDerivation_
    startBatch()
    let prevAllowStateChanges_ = globalState.allowStateChanges // by default preserve previous allow
    if (runAsAction) {
        untrackedStart()
        prevAllowStateChanges_ = allowStateChangesStart(true)
    }
    const prevAllowStateReads_ = allowStateReadsStart(true)
    const runInfo = {
        runAsAction_: runAsAction,
        prevDerivation_,
        prevAllowStateChanges_,
        prevAllowStateReads_,
        startTime_,
        actionId_: nextActionId++,
        parentActionId_: currentActionId
    }
    currentActionId = runInfo.actionId_
    return runInfo
}

export function _endAction(runInfo: IActionRunInfo) {
    if (currentActionId !== runInfo.actionId_) {
        //die(30)
    }
    currentActionId = runInfo.parentActionId_

    if (runInfo.error_ !== undefined) {
        globalState.suppressReactionErrors = true
    }
    allowStateChangesEnd(runInfo.prevAllowStateChanges_)
    allowStateReadsEnd(runInfo.prevAllowStateReads_)
    endBatch()
    if (runInfo.runAsAction_) untrackedEnd(runInfo.prevDerivation_)
    globalState.suppressReactionErrors = false
}

export function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T {
    const prev = allowStateChangesStart(allowStateChanges)
    try {
        return func()
    } finally {
        allowStateChangesEnd(prev)
    }
}

export function allowStateChangesStart(allowStateChanges: boolean) {
    const prev = globalState.allowStateChanges
    globalState.allowStateChanges = allowStateChanges
    return prev
}

export function allowStateChangesEnd(prev: boolean) {
    globalState.allowStateChanges = prev
}
