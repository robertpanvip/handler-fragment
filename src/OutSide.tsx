import React, {useRef, useEffect, useContext, forwardRef} from 'react';
import {once as onceFn} from "./utils/util";
import {findDOMNode} from 'react-dom';
import warning from "./utils/warning";
import EventTarget from "./utils/event"
import Handler from "./Handler";

interface OutSideProps {
    onOutSideClick?: (e: React.MouseEvent) => void
    onClick?: (e: React.MouseEvent) => void
    onMouseEnter?: (e: React.MouseEvent) => void
    onMouseLeave?: (e: React.MouseEvent) => void
    onFocus?: (e: React.FocusEvent) => void
    onBlur?: (e: React.FocusEvent) => void,

    children?: JSX.Element,
    /**
     * 触发时机 默认为inner
     * inner :只有当你鼠标点击目标后然后鼠标再次点击非目标地方的时候触发
     * 也就是说必须先触发一次 然后才能触发对应的事件
     *
     * outside:一开始点击目标外面就会触发对应的事件
     */
    triggerTiming?: 'inner' | 'outside',

    /**是否只执行一次**/
    once?: boolean,
}

interface Instance {
    onceClick?: (e: MouseEvent) => void,
    triggerInner?: boolean,
    isPropagationStopped?: boolean,
    pointerEvents?:string
}

type ForwardRef<T> = (instance: T) => void | React.MutableRefObject<T> | React.RefObject<T> | null;
type _Window = typeof window & { __observerDocument__: boolean }

const EVENT_ATTR = [
    'currentTarget',
    'eventPhase',
    'bubbles',
    'cancelable',
    'defaultPrevented',
    'isTrusted',
    'preventDefault',
    'timeStamp',
    'type',
    'nativeEvent',
    'target',
    'altKey',
    'button',
    'buttons',
    'clientX',
    'clientY',
    'ctrlKey',
    'getModifierState',
    'metaKey',
    'movementX',
    'movementY',
    'pageX',
    'pageY',
    'relatedTarget',
    'screenX',
    'screenY',
    'shiftKey',
    'detail',
    'view'
];
const target = new EventTarget();

/**
 * document 事件处理函数
 */
function documentClickHandler(e: MouseEvent) {
    target.dispatchEvent('click', e);
}


if (!(window as _Window).__observerDocument__) {
    /**确保只监听一次**/
    /**由于react的合成事件也是监听的document 这里想要让documentClickHandler 必须先于react的合成事件之前就必须先于构造函数之前执行**/
    document.addEventListener('click', documentClickHandler, true);
    /**确保只监听一次**/
    (window as _Window).__observerDocument__ = true;
}

const OutSideContext = React.createContext(undefined);

OutSideContext.displayName = 'OutSideContext';


const RefRenderFunction = function <T>(props: OutSideProps, forward: ForwardRef<T>) {

    let {children} = props;

    const {
        onFocus,
        onBlur,
        onOutSideClick,
        onClick,
        onMouseEnter,
        onMouseLeave,
        triggerTiming = 'inner',
        once = true,
    } = props;

    if (typeof children !== 'object') {
        children = <span>{children}</span>;
        warning(false, 'OutSide', '传入的children不是JSX.Element类型的值')
    }

    const context = useContext(OutSideContext);

    const ins = useRef<Instance>({})

    let ref: any = useRef(null)

    if (forward) {
        if (forward instanceof Function) {
            const originFn = forward;
            let current: HTMLElement;
            ref = function (ref: any) {
                originFn.bind(this)(ref);
                current = ref;
            };
            Object.defineProperty(ref, 'current', {
                get(): Element | Text {
                    return findDOMNode(current)
                }
            })
        } else {
            ref = forward
        }
    }

    /***
     * 组件加载后
     */
    useEffect(() => {
        if (onOutSideClick || onClick) {
            generateOnce();
            target.addEventListener('click', handleCallback);
        }
        return () => {
            target.removeEventListener('click', handleCallback);
        }
    }, [])

    /**
     * 生成一次执行函数
     */
    const generateOnce: () => void = () => {
        /**是否只能点击一次**/
        if (once) {
            ins.current.onceClick = onceFn(onOutSideClick);
        }
    }


    /**
     * 处理鼠标进入
     * @param e
     */
    const handleMouseEnter: (e: React.MouseEvent) => void = (e) => {
        /**事件确保这里只需要在目标元素执行**/
        if (ref.current && findDOMNode(ref.current).contains(e.target as HTMLElement)) {

            ins.current.triggerInner = true;

            onMouseEnter && onMouseEnter(e)
        }

    }

    /**
     * 处理鼠标进入
     * @param e
     */
    const handleMouseLeave: (e: React.MouseEvent) => void = (e) => {
        /**事件确保这里只需要在目标元素执行**/
        if (ref.current && findDOMNode(ref.current).contains(e.target as HTMLElement)) {

            onMouseLeave && onMouseLeave(e)
        }

    }

    /**
     * 生成event
     * @param e
     */
    const generateEvent: (e: MouseEvent) => React.MouseEvent = (e) => {
        if(!context){
            return e as unknown as React.MouseEvent;
        }
        const {stopPropagation} = context;
        let isPropagationStopped = false;
        const event = {
            stopPropagation() {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }
                stopPropagation && stopPropagation();
                isPropagationStopped = true;
            },
            isPropagationStopped() {
                return isPropagationStopped
            }
        };
        EVENT_ATTR.forEach((attr) => {
            Object.defineProperty(event, attr, {
                get() {
                    /**对这个target属性做特殊处理**/
                    if (attr === 'target') {
                        return e.target || e.srcElement
                    }
                    return e[attr as keyof MouseEvent]
                }
            })
        });
        return event as React.MouseEvent
    }

    /**
     * 处理组价的事件
     */
    const handleCallback: (e: MouseEvent) => void = (e) => {

        const current = findDOMNode(ref.current);
        /**ie中不存在e.target 只有e.srcElement**/
        if (!current.contains((e.target || e.srcElement) as Node)) {

            if (triggerTiming === 'outside' || (triggerTiming === 'inner' && ins.current.triggerInner)) {
                let callback: (e: MouseEvent) => void;
                /**是否只执行一次**/
                if (once) {
                    /**取出this.onceClick等函数**/
                    callback = ins.current.onceClick;
                    /**执行this.onceClick等函数**/
                    callback && callback(e);
                    /**表示当前是没有点击children**/
                    ins.current.triggerInner = false;
                } else {
                    /**如果不是执行一次那么就使用传下来的callback**/
                    !ins.current.isPropagationStopped && onOutSideClick && onOutSideClick(generateEvent(e))
                }
            }
        }
    }

    /**
     *处理内部点击
     * @param e
     */
    const handleInnerClick: (e: React.MouseEvent<HTMLSpanElement>) => void = (e) => {
        ins.current.triggerInner = true;

        generateOnce();

        onClick && onClick(e)
    }

    const childProps = {
        ...children.props
    };

    return (
        <OutSideContext.Provider
            value={{
                stopPropagation: () => {
                    ins.current.isPropagationStopped = true;
                }
            }}
        >
            <Handler
                ref={(insRef) => {
                    ref.current = insRef
                    if(insRef){
                        const _style = getComputedStyle(insRef as HTMLElement);
                        if(_style.pointerEvents==='none'){
                            warning(false, 'OutSide', '节点的样式 pointerEvents = none 导致onOutSideClick失效',insRef)
                        }
                    }
                }}
                onClick={handleInnerClick}
                onFocus={onFocus}
                onBlur={onBlur}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {React.cloneElement(children, childProps)}
            </Handler>
        </OutSideContext.Provider>

    )
}

const OutSide = forwardRef<any, OutSideProps>(RefRenderFunction)

OutSide.displayName = 'OutSide';

export default OutSide;
