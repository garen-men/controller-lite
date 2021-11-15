import * as React from "react"

import { observer as observerLite } from "../index-react-lite"

import { makeClassComponentObserver } from "./observerClass"

const hasSymbol = typeof Symbol === "function" && Symbol.for

const ReactMemoSymbol = hasSymbol
    ? Symbol.for("react.memo")
    : typeof React.memo === "function" && React.memo((props: any) => null)["$$typeof"]


export function observer(component:any){

    if (ReactMemoSymbol && component["$$typeof"] === ReactMemoSymbol) {
        throw new Error(
            "使用observer后不需要使用memo"
        )
    }

    // ForwardRef的特殊处理
    // if (ReactForwardRefSymbol && component["$$typeof"] === ReactForwardRefSymbol) {
    //     const baseRender = component["render"]
    //     if (typeof baseRender !== "function")
    //         throw new Error("render property of ForwardRef was not a function")
    //     return React.forwardRef(function ObserverForwardRef() {
    //         const args = arguments
    //         return <Observer>{() => baseRender.apply(undefined, args)}</Observer>
    //     }) as T
    // }

    // 验证是函数组件 还是类组件
    if (
        typeof component === "function" &&
        (!component.prototype || !component.prototype.render) &&
        !component["isReactClass"] &&
        !Object.prototype.isPrototypeOf.call(React.Component, component)
    ) {
        return observerLite(component)
    }

    return makeClassComponentObserver(component)
}
