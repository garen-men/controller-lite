// mobx整体步骤:
// 1，创建reaction 对象
// 2，将获取observablevalue属性和值的方法传入到 reaction.track中，
// 3，调用reaction.track中trackDerivedFunction
// 4，在trackDerivedFunction 通过传入的f.call()发起收集依赖
// 5，调用observablevalue中的get方法，
// 6，通过Atom 中的 reportObserved方法将 observablevalue对象收集到 reaction.newObserving_队列中
// 7，使用绑定依赖方法 bindDependencies(derivation: IDerivation)将 创建的对象那个 reaction绑定到observablevalue对象的observers中
// 8, globalState.trackingDerivation 用于中间关联和暂存数据



import {
    autorun,
    makeAutoObservable,
    // toJS,
} from "./index-mobx";
import { observer } from "./index-react";


export default {
    observer,
    autorun,
    makeAutoObservable,

    // toJS
}