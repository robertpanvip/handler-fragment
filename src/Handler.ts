import React, {forwardRef} from 'react'
import {findDOMNode} from 'react-dom'

type GetDomNodeProp = Omit<React.DOMAttributes<any>, 'dangerouslySetInnerHTML'>

interface ClassGetDomNodeProps extends GetDomNodeProp {
    __forwardRef?: ((node: Element | null | Text) => void) | React.MutableRefObject<Element | null | Text>
}

/**
 * 获取children的dom ref 同时可以给dom添加react合成事件
 * 原理是劫持了react 的合成事件
 */
class ClassDomNode extends React.PureComponent<ClassGetDomNodeProps> {
    /**
     * ref 赋值
     */
    assignmentRef() {
        const node = findDOMNode(this);

        if (node && node instanceof Element) {
            //__reactEventHandlers 是16.8在使用的  __reactProps是17使用的
            const [key, targetProps] = Object.entries(node).find(([key]) => key.startsWith('__reactEventHandlers') || key.startsWith('__reactProps')) || [];
            const cloneProps = {
                ...targetProps,
            }
            const _props = {
                ...this.props,
            }
            delete _props.__forwardRef;
            delete _props.children;
            Object.entries(_props).forEach(([prop, value]: [string, Function]) => {
                if (value && typeof value !== 'function' ) {
                    console.warn(`${prop} not support`)
                } else if (value) {
                    cloneProps[prop] = (...params: any[]) => {
                        const method = targetProps[prop];
                        method?.(...params);
                        value(...params);
                    }
                }
            });
            (node as any)[key] = cloneProps;
        }
        if (typeof this.props.__forwardRef === 'function') {
            this.props.__forwardRef(node)
        } else {
            this.props.__forwardRef.current = node
        }
    }

    /**
     *加载完成
     */
    componentDidMount() {
        this.assignmentRef()
    }

    /**
     * 更新后
     */
    componentDidUpdate() {
        this.assignmentRef()
    }

    /**
     *渲染函数
     */
    render() {
        return this.props.children;
    }
}

const Handler = forwardRef<Element | null | Text, GetDomNodeProp>((props, ref) => {
    return React.createElement(ClassDomNode, {
        ...props,
        __forwardRef: ref
    })
})
Handler.displayName = 'Handler';
export default Handler;
