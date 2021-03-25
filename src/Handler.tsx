import * as React from 'react';
import autoBind from "./utils/autoBind";
import omit from "./utils/omit";
import {forwardRef} from "./utils/ref";
import {combineRef, UUID,RefObject} from "./utils/util";
import warning from "./utils/warning";
import requestAnimationFrame from 'raf';

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

/***
 * 该组件的功能相当于在children之前用一个div去包裹了 事件全部由div捕获处理了 但是最终div是没有显示在页面上的
 */
@forwardRef()
@autoBind
export default class Handler extends React.PureComponent<HandlerProps> {
    private readonly directlyRef: RefObject<Node>;

    private el: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();
    private readonly key: string;
    private parentNode: ParentNode;
    private removedSibling: ChildNode;
    private childNodes: ChildNode[];

    /**
     * 构造函数
     * @param props
     */
    constructor(props: HandlerProps) {
        super(props);
        this.directlyRef = combineRef(props, true);
        this.key = UUID();
    }

    /**
     *给ref手动赋值
     * @param node
     */
    assignmentRef(node: Node): void {
        if (this.directlyRef instanceof Function) {
            this.directlyRef(node)
        } else {
            this.directlyRef.current = node;
        }
    }

    /**
     * 组件挂载完成
     */
    componentDidMount(): void {
        const {
            disabled,
            onBeforeReplace,
            onAfterReplace,
        } = this.props;
        const {parentNode, childNodes} = this.el.current;
        this.parentNode = parentNode;
        this.childNodes = Array.from(childNodes);
        if (!disabled) {
            this.removedSibling = this.el.current.nextSibling;
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

            (this.el.current as ParentNode).UUID = this.key;

            /***
             * 因为下面this.el.current的children被插入到this.el.current的parentNode中去了
             * react库在fiber中保留的是this.el.current 操作的是this.el.current  而这个时候this.el.current 下面没有childNode
             * 所以需要将this.el.current 的方法覆写一遍
             * @param oldChild
             */
            this.el.current.removeChild = (oldChild) => {
                try {
                    this.childNodes = this.childNodes.filter(node => node !== (oldChild as Node));
                    if (this.childNodes.length === 0) {
                        /**childNodes 之前只有一个 现在移除后就没有了 那么removedSibling=oldChild.nextSibling**/
                        this.removedSibling = oldChild.nextSibling;
                    }
                    const {length} = this.childNodes;
                    /**删除操作交由父类去操作**/
                    const res = parentNode.removeChild(oldChild);
                    requestAnimationFrame(() => {
                        /**一般执行了removeChild 后可能会执行appendChild 这里判断如果没有执行appendChild 后应该给ref赋值**/
                        if (this.childNodes.length === length) {
                            this.assignmentRef(this.childNodes[0]);
                        }
                    });
                    return res;
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    return null;
                }
            };
            this.el.current.replaceChild = (newChild, oldChild) => {
                try {
                    const res = parentNode.replaceChild(newChild, oldChild);

                    this.childNodes = this.childNodes.map(node => {
                        if (node === (oldChild as Node)) {
                            return newChild as ChildNode
                        }
                        return node;
                    });

                    this.assignmentRef(this.childNodes[0]);
                    return res;
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    return null;
                }

            };

            this.el.current.insertBefore = (newChild, refChild) => {
                const index = this.childNodes.findIndex(node => node === refChild);
                this.childNodes.splice(index, 0, (newChild as unknown as ChildNode));
                let res;
                try {
                    res = parentNode.insertBefore(newChild, refChild);
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    res = null;
                }
                this.assignmentRef(this.childNodes[0]);
                return res;
            };

            this.el.current.appendChild = (newChild) => {
                try {
                    const removedSibling = this.childNodes.length === 0 ? this.removedSibling : this.childNodes[this.childNodes.length - 1].nextSibling;
                    const res = !removedSibling
                        ? parentNode.appendChild(newChild)
                        : parentNode.insertBefore(newChild, removedSibling);
                    this.childNodes.push(newChild as unknown as ChildNode);
                    this.assignmentRef(this.childNodes[0]);
                    return res
                } catch (e) {
                    warning(false, 'Handler', e.message)
                    return null
                }
            };

            Array.from(childNodes).forEach(node => {
                beforeReplace(node);
                parentNode.insertBefore(node, this.el.current);
            });

            afterReplace();

            parentNode.removeChild(this.el.current);

            CallbacksMap.forEach(([methodsCallbacks, method]: [MethodsCallback, Methods]) => {
                if (!this.parentNode[methodsCallbacks]) {
                    this.parentNode[methodsCallbacks] = [];
                    this.parentNode[method] = function (...params: any[]) {
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

            this.parentNode.insertBeforeCallbacks.push(this.insertBefore)
            this.parentNode.removeChildCallbacks.push(this.removeChild)
            this.parentNode.removeChildCallbacks.push(this.replaceChild)

            this.assignmentRef(this.childNodes[0]);

        }
    }

    /**
     *在..之前插入
     * @param callee
     * @param newChild
     * @param refChild
     */
    insertBefore(callee: Node, newChild: Node, refChild: ParentNode): CallbackReturn {
        if (refChild.UUID === this.key) {
            return {
                valid: true,
                return: callee.insertBefore(newChild, this.childNodes[0])
            }
        }
    }

    /**
     *替换
     * @param callee
     * @param newChild
     * @param oldChild
     */
    replaceChild(callee: Node, newChild: ParentNode, oldChild: Node): CallbackReturn {
        if (newChild.UUID === this.key) {

            this.childNodes.forEach(childNode => {
                callee.replaceChild(newChild, childNode)
            });

            return {
                valid: true,
                return: oldChild
            }
        }
    }

    /**
     *移除
     * @param callee
     * @param oldChild
     */
    removeChild(callee: Node, oldChild: ParentNode): CallbackReturn {
        if (oldChild.UUID === this.key) {
            this.childNodes.forEach(childNode => {
                callee.removeChild(childNode)
            });
            return {
                valid: true,
                return: oldChild
            }
        }
    }

    /**
     * 组件销毁
     */
    componentWillUnmount(): void {
        const {children} = this.props;
        const count = React.Children.count(children);
        if (count !== 1 && children) {
            return;
        }
        requestAnimationFrame(() => {
            CallbacksMap.forEach(([methodsCallbacks, method]: [MethodsCallback, Methods]) => {
                this.parentNode[methodsCallbacks] = this.parentNode[methodsCallbacks].filter(callback => callback !== (this as any)[method]);
            })
        })
    }


    /**
     * 渲染函数
     */
    render(): React.ReactNode {
        const {children, disabled} = this.props;
        const count = React.Children.count(children);
        if (count !== 1 && children) {
            warning(false, 'Handler', 'Since this component passes more than one child, the ref it gets can only get the first one');
        }
        let omitProps = omit(
            this.props,
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
        return (
            <div
                ref={this.el}
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
}

