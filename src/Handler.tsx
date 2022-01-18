import * as React from 'react';
import {useRef, useEffect, forwardRef} from 'react';
import warning from "./utils/warning";
import omit from "./utils/omit";
import {UUID} from "./utils/util";

interface HandlerProps extends React.DOMAttributes<HTMLElement> {
    children: React.ReactElement,
    disabled?: boolean,
    /**在替换之前的处理**/
    onBeforeReplace?: (current: HTMLElement) => void,
    /**在替换之后的处理**/
    onAfterReplace?: () => void,

    /**私有属性不可使用**/
    forwardRef?: any
}

type MethodsCallback = 'insertBeforeCallbacks' | 'replaceChildCallbacks' | 'removeChildCallbacks'
type Methods = 'insertBefore' | 'replaceChild' | 'removeChild'
const CallbacksMap = [
    ['insertBeforeCallbacks', 'insertBefore'],
    ['replaceChildCallbacks', 'replaceChild'],
    ['insertBeforeCallbacks', 'insertBefore'],
    ['removeChildCallbacks', 'removeChild'],
];

interface CallbackReturn {
    valid: boolean;
    return: Node;
}

interface ParentNode extends Node {
    UUID?: string
    insertBeforeCallbacks?: Array<(...params: any[]) => CallbackReturn>,
    replaceChildCallbacks?: Array<(...params: any[]) => CallbackReturn>,
    removeChildCallbacks?: Array<(...params: any[]) => CallbackReturn>
}

interface Ins {
    readonly key?: string;
    parentNode?: ParentNode;
    removedSibling?: ChildNode;
    childNodes?: ChildNode[],
    insertBefore: (callee: Node, newChild: Node, refChild: ParentNode) => CallbackReturn
    replaceChild: (callee: Node, newChild: ParentNode, oldChild: Node) => CallbackReturn,
    removeChild: (callee: Node, oldChild: ParentNode) => CallbackReturn,
    assignmentRef: (node: Node) => void
}


/**
 *
 * @constructor
 */
function HandlerFragment(props: HandlerProps, ref: any): React.ReactElement {
    const el = useRef<HTMLDivElement>(null)
    const ins = useRef<Ins>({
        key: UUID(),

        /**
         *给ref手动赋值
         * @param node
         */
        assignmentRef: (node: Node): void => {
            if (ref instanceof Function) {
                ref(node)
            } else {
                ref.current = node;
            }
        },

        /**
         *在..之前插入
         * @param callee
         * @param newChild
         * @param refChild
         */
        insertBefore: (callee: Node, newChild: Node, refChild: ParentNode): CallbackReturn => {
            if (refChild.UUID === ins.current.key) {
                return {
                    valid: true,
                    return: callee.insertBefore(newChild, ins.current.childNodes[0])
                }
            }
        },
        /**
         *替换
         * @param callee
         * @param newChild
         * @param oldChild
         */
        replaceChild: (callee: Node, newChild: ParentNode, oldChild: Node): CallbackReturn => {
            if (newChild.UUID === ins.current.key) {

                ins.current.childNodes.forEach(childNode => {
                    callee.replaceChild(newChild, childNode)
                });

                return {
                    valid: true,
                    return: oldChild
                }
            }
        },
        /**
         *移除
         * @param callee
         * @param oldChild
         */
        removeChild: (callee: Node, oldChild: ParentNode): CallbackReturn => {
            if (oldChild.UUID === ins.current.key) {
                ins.current.childNodes.forEach(childNode => {
                    callee.removeChild(childNode)
                });
                return {
                    valid: true,
                    return: oldChild
                }
            }
        }
    })
    const {children, disabled} = props;
    const count = React.Children.count(children);
    if (count !== 1 && children) {
        warning(false, 'Handler', 'Since this component passes more than one child, the ref it gets can only get the first one');
    }
    let omitProps = omit(
        props,
        [
            'onBeforeReplace',
            'onAfterReplace',
            'disabled',
            'children',
            'forwardRef'
        ]);
    if (disabled) {
        omitProps = {}
    }

    useEffect(() => {
        const {
            disabled,
            onBeforeReplace,
            onAfterReplace,
        } = props;
        const {parentNode, childNodes} = el.current;
        ins.current.parentNode = parentNode;
        ins.current.childNodes = Array.from(childNodes);
        if (!disabled) {
            ins.current.removedSibling = el.current.nextSibling;
            let shouldFocus = false;
            let activeElement: HTMLElement;
            const beforeReplace = (el: Node) => {
                /*移动位置后之前获得的焦点会失去焦点这里先拿到焦点元素 方便后面重新获得焦点*/
                activeElement = document.activeElement as HTMLElement;
                if (el.contains(activeElement)) {
                    shouldFocus = true;
                }
                onBeforeReplace && onBeforeReplace(el as HTMLElement);
            };

            const afterReplace = () => {
                if (shouldFocus) {
                    activeElement.focus();
                }
                onAfterReplace && onAfterReplace();
            };

            (el.current as ParentNode).UUID = ins.current.key;

            /***
             * 因为下面el.current的children被插入到el.current的parentNode中去了
             * react库在fiber中保留的是el.current 操作的是el.current  而这个时候el.current 下面没有childNode
             * 所以需要将el.current 的方法覆写一遍
             * @param oldChild
             */
            el.current.removeChild = (oldChild) => {
                try {
                    ins.current.childNodes = ins.current.childNodes.filter(node => node !== (oldChild as Node));
                    if (ins.current.childNodes.length === 0) {
                        /**childNodes 之前只有一个 现在移除后就没有了 那么removedSibling=oldChild.nextSibling**/
                        ins.current.removedSibling = oldChild.nextSibling;
                    }
                    const {length} = ins.current.childNodes;
                    /**删除操作交由父类去操作**/
                    const res = parentNode.removeChild(oldChild);
                    requestAnimationFrame(() => {
                        /**一般执行了removeChild 后可能会执行appendChild 这里判断如果没有执行appendChild 后应该给ref赋值**/
                        if (ins.current.childNodes.length === length) {

                            ins.current.assignmentRef(ins.current.childNodes[0]);
                        }
                    });
                    return res;
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    return null;
                }
            };
            el.current.replaceChild = (newChild, oldChild) => {
                try {
                    const res = parentNode.replaceChild(newChild, oldChild);

                    ins.current.childNodes = ins.current.childNodes.map(node => {
                        if (node === (oldChild as Node)) {
                            return newChild as ChildNode
                        }
                        return node;
                    });

                    ins.current.assignmentRef(ins.current.childNodes[0]);
                    return res;
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    return null;
                }

            };

            el.current.insertBefore = (newChild, refChild) => {
                const index = ins.current.childNodes.findIndex(node => node === refChild);
                ins.current.childNodes.splice(index, 0, (newChild as unknown as ChildNode));
                let res;
                try {
                    res = parentNode.insertBefore(newChild, refChild);
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    res = null;
                }
                ins.current.assignmentRef(ins.current.childNodes[0]);
                return res;
            };

            el.current.appendChild = (newChild) => {
                try {
                    const removedSibling = ins.current.childNodes.length === 0 ? ins.current.removedSibling : ins.current.childNodes[ins.current.childNodes.length - 1].nextSibling;
                    const res = !removedSibling
                        ? parentNode.appendChild(newChild)
                        : parentNode.insertBefore(newChild, removedSibling);
                    ins.current.childNodes.push(newChild as unknown as ChildNode);
                    ins.current.assignmentRef(ins.current.childNodes[0]);
                    return res
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    return null
                }
            };

            Array.from(childNodes).forEach(node => {
                beforeReplace(node);
                parentNode.insertBefore(node, el.current);
            });

            afterReplace();

            parentNode.removeChild(el.current);

            CallbacksMap.forEach(([methodsCallbacks, method]: [MethodsCallback, Methods]) => {
                if (!ins.current.parentNode[methodsCallbacks]) {
                    ins.current.parentNode[methodsCallbacks] = [];
                    ins.current.parentNode[method] = function (...params: any[]) {
                        let res;
                        for (let i = 0; i < this[methodsCallbacks].length; i++) {
                            const callback = this[methodsCallbacks][i];
                            try {
                                const _res = callback.call(this, this, ...params)

                                if (_res && _res.valid) {
                                    res = _res.return;
                                    break;
                                }
                            } catch (e) {
                                warning(false, 'Handler', e.message)
                            }
                        }
                        if (res === undefined) {
                            try {
                                return HTMLElement.prototype[method].call(this, ...params)
                            } catch (e) {
                                warning(false, 'Handler', e.message)
                            }
                        } else {
                            return res;
                        }
                    }
                }
            });

            ins.current.parentNode.insertBeforeCallbacks.push(ins.current.insertBefore)
            ins.current.parentNode.removeChildCallbacks.push(ins.current.removeChild)
            ins.current.parentNode.removeChildCallbacks.push(ins.current.replaceChild)

            ins.current.assignmentRef(ins.current.childNodes[0]);

        }

        return () => {
            const {children} = props;
            const count = React.Children.count(children);
            if (count !== 1 && children) {
                return;
            }
            requestAnimationFrame(() => {
                CallbacksMap.forEach(([methodsCallbacks, method]: [MethodsCallback, Methods]) => {
                    ins.current.parentNode[methodsCallbacks] = ins.current.parentNode[methodsCallbacks].filter(callback => callback !== ins.current[method]);
                })
            })
        }
    }, [])

    return (
        <div
            ref={el}
            {...omitProps}
            style={{
                display: 'inline-block',
                padding: 0,
                margin: 0,
                outline: 'none',
                border: 'none',
                width: '100%',
                height: '100%'
            }}
        >
            {children}
        </div>
    )
}

export default forwardRef(HandlerFragment)
