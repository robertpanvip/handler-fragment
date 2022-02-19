import * as React from 'react';
import {combineRef, once as onceFn} from "./utils/util";
import {findDOMNode} from 'react-dom';
import warning from "./utils/warning";
import EventTarget from "./utils/event"
import Handler from "./Handler";
import {forwardRef} from "./utils/ref";

interface OutSideProps {
    children?: JSX.Element,
    onOutSideClick?: (e: React.MouseEvent) => void
    onClick?: (e: React.MouseEvent) => void
    onMouseEnter?: (e: React.MouseEvent) => void
    onMouseLeave?: (e: React.MouseEvent) => void
    onFocus?: (e: React.FocusEvent) => void
    onBlur?: (e: React.FocusEvent) => void
    /**
     * 触发时机 默认为inner
     * inner :只有当你鼠标点击目标后然后鼠标再次点击非目标地方的时候触发
     * 也就是说必须先触发一次 然后才能触发对应的事件
     *
     * outside:一开始点击目标外面就会触发对应的事件
     */
    triggerTiming?: 'inner' | 'outside',

    /**是否只执行一次**/
    once: boolean,
    forwardRef?: any
}

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

if (!(window as any).__observerDocument__) {
    /**确保只监听一次**/
    /**由于react的合成事件也是监听的document 这里想要让documentClickHandler 必须先于react的合成事件之前就必须先于构造函数之前执行**/
    document.addEventListener('click', documentClickHandler, true);
    /**确保只监听一次**/
    (window as any).__observerDocument__ = true;
}
const OutSideContext = React.createContext(undefined);
OutSideContext.displayName = 'OutSideContext';
/**
 * 用于判断点击的地点是否在children中
 */
@forwardRef()
export default class OutSide extends React.Component<OutSideProps> {
    state = {};

    private readonly el: React.RefObject<any>;

    static contextType = OutSideContext;

    static defaultProps = {
        triggerTiming: 'inner',
        once: true
    };

    /**是否点击了children**/
    private triggerInner: boolean;
    /**只执行一次的onOutSideClick**/
    private onceClick: (...params: any[]) => any;
    private isPropagationStopped = false;

    /**
     *
     * @param props
     */
    constructor(props: OutSideProps) {
        super(props);

        this.el = combineRef(props);

    }

    /***
     * 组件加载后
     */
    componentDidMount(): void {
        const {
            onOutSideClick,
            onClick
        } = this.props;
        if (onOutSideClick || onClick) {
            this.generateOnce();
            target.addEventListener('click', this.handleCallback);
        }
    }

    /**
     * 生成一次执行函数
     */
    generateOnce: () => void = () => {
        const {
            onOutSideClick,
            once,
        } = this.props;
        /**是否只能点击一次**/
        if (once) {
            this.onceClick = onceFn(onOutSideClick);
        }
    }

    /**
     * 组件将要卸载
     */
    componentWillUnmount(): void {
        target.removeEventListener('click', this.handleCallback);
    }


    /**
     * 处理鼠标进入
     * @param e
     */
    handleMouseEnter: (e: React.MouseEvent) => void = (e) => {
        /**事件确保这里只需要在目标元素执行**/
        if (findDOMNode(this.el.current).contains(e.target as HTMLElement)) {

            this.triggerInner = true;

            const {onMouseEnter} = this.props;

            onMouseEnter && onMouseEnter(e)
        }

    }

    /**
     * 处理鼠标进入
     * @param e
     */
    handleMouseLeave: (e: React.MouseEvent) => void = (e) => {
        /**事件确保这里只需要在目标元素执行**/
        if (findDOMNode(this.el.current).contains(e.target as HTMLElement)) {

            const {onMouseLeave} = this.props;

            onMouseLeave && onMouseLeave(e)
        }

    }

    /**
     * 生成event
     * @param e
     */
    generateEvent: (e: MouseEvent) => React.MouseEvent = (e) => {
        const {stopPropagation} = this.context || {};
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
    handleCallback: (e: MouseEvent) => void = (e) => {

        const {triggerTiming, onOutSideClick} = this.props;
        const current = findDOMNode(this.el.current);
        /**ie中不存在e.target 只有e.srcElement**/
        if (!current.contains((e.target || e.srcElement) as Node)) {

            if (triggerTiming === 'outside' || (triggerTiming === 'inner' && this.triggerInner)) {
                let callback: (e: MouseEvent) => void;
                /**是否只执行一次**/
                if (this.props.once) {
                    /**取出this.onceClick等函数**/
                    callback = this.onceClick;
                    /**执行this.onceClick等函数**/
                    callback && callback(e);
                    /**表示当前是没有点击children**/
                    this.triggerInner = false;
                } else {
                    /**如果不是执行一次那么就使用传下来的callback**/
                    !this.isPropagationStopped && onOutSideClick && onOutSideClick(this.generateEvent(e))
                }
            }
        }
    }

    /**
     *处理内部点击
     * @param e
     */
    handleInnerClick: (e: React.MouseEvent<HTMLSpanElement>) => void = (e) => {
        this.triggerInner = true;
        this.generateOnce();

        const {onClick} = this.props;

        onClick && onClick(e)
    }

    /**
     * 渲染函数
     */
    render(): React.ReactNode {
        let {children} = this.props;

        const {
            onFocus,
            onBlur
        } = this.props;

        if (typeof children !== 'object') {
            children = <span>{children}</span>;
            warning(false, 'OutSide', '传入的children不是JSX.Element类型的值')
        }
        const childProps = {
            ...children.props
        };
        return (
            <OutSideContext.Provider
                value={{
                    stopPropagation: () => {
                        this.isPropagationStopped = true;
                    }
                }}
            >
                <Handler
                    ref={this.el}
                    onClick={this.handleInnerClick}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onMouseEnter={this.handleMouseEnter}
                    onMouseLeave={this.handleMouseLeave}
                >
                    {React.cloneElement(children, childProps)}
                </Handler>
            </OutSideContext.Provider>

        )
    }
}
