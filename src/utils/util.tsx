import * as React from 'react';
import {findDOMNode} from 'react-dom';
export  interface RefObject<T> {
    current: T | null;
}

/**
 * 随机生成UUID
 */
export function UUID(): any {
    return 'uuid-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 合并函数形式的ref和对象形式的ref
 * @param props
 * @param forceDom 是否将结果统一转成原始Dom
 */
export function combineRef<T>(props: any, forceDom = false): RefObject<T> {
    let ref = props.forwardRef || React.createRef();
    if (ref instanceof Function) {
        const originFn = ref;
        let current: HTMLElement;
        ref = function (ref: any) {
            originFn.bind(this)(ref);
            current = ref;
        };
        Object.defineProperty(ref, 'current', {
            get(): Element | Text {
                return forceDom ? findDOMNode(current) : current
            }
        })
    } else if (forceDom) {
        const objRef = ref;
        ref = {current: null};
        Object.defineProperty(ref, 'current', {
            get(): Element | Text {
                return findDOMNode(objRef.current);
            },
            set(v: any) {
                objRef.current = v;
            }
        })
    }
    return ref
}

/**
 * 只执行一次fn
 * @param fn
 * @param context
 */
export function once(fn: (...params: any) => void, context?: any): (...params: any[]) => any {
    let result: any;

    return function (...params) {
        if (fn) {
            result = fn.apply(context || this, params);
            fn = null;
        }

        return result;
    };
}

/**
 * 类似于dom的classList
 */
export function classList(dom: HTMLElement) {
    const _dom = dom;
    let classes = dom?.className?.trim().split(/\s+/g) || [];
    return {
        add(...params: any) {
            classes.push(params);
            classes = classes.flat();
            _dom && (_dom.className = classes.join(' '));
        },
        remove(...params: string[]) {
            params.forEach((param = '') => {
                const index = classes.indexOf(param);
                if (index !== -1) {
                    classes.splice(index, 1)
                }
            });
            _dom && (_dom.className = classes.join(' '));
        },
        toggle(...params: string[]) {
            params.forEach((param = '') => {
                const index = classes.indexOf(param);
                if (index !== -1) {
                    classes.push(param);
                } else {
                    classes.splice(index, 1)
                }
            });
            _dom && (_dom.className = classes.join(' '));
        },
        contains(...params: string[]) {
            return classes.find(item => params.find(it => it === item))
        }
    }

}
