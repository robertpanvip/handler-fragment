import * as React from 'react';
import warning from "./utils/warning";
import Handler from "./Handler";
import {classList} from "./utils/util";

interface FocusWithinProps {
    children: React.ReactElement,
    focusClassName?: string
    disabled?: boolean
}

const noop: () => void = () => undefined;

const {stopPropagation} = FocusEvent.prototype

FocusEvent.prototype.stopPropagation = function (...rest) {
    this.path.forEach((node: any) => {
        if (this.type === 'blur') {
            node.__onBlur && node.__onBlur();
        } else if (this.type === 'focus') {
            node.__onFocus && node.__onFocus();
        }
    })
    return stopPropagation.call(this, ...rest)
}

/***
 * 该组件的功能是类似于css伪类:focus-within
 * 即当前组件包裹的children的子组件获得焦点、那么当前组件包裹的children就会添加is-focus类
 */
export default class FocusWithin extends React.PureComponent<FocusWithinProps> {
    private el = React.createRef<any>();
    static defaultProps = {
        focusClassName: 'is-focus'
    }

    /**
     * 组件挂载完成
     */
    componentDidMount(): void {
        const keys = Object.keys(this.props)
            .filter(key => key !== 'children' && key !== 'disabled' && key !== 'focusClassName')
            .map(key => key + '属性无效，');
        warning(
            keys.length === 0,
            'FocusWithin',
            keys + 'FocusWithin组件只支持children、disabled、focusClassName属性'
        );

        if (this.el.current) {
            const __onFocus = this.el.current.__onFocus || noop;
            this.el.current.__onFocus = () => {
                this.handleFocus();
                return __onFocus()
            }
            const __onBlur = this.el.current.__onBlur || noop;
            this.el.current.__onBlur = () => {
                this.handleBlur();
                return __onBlur()
            }
        }

    }

    /**
     * 处理聚焦
     */
    private handleFocus: () => void = () => {
        const {disabled, focusClassName} = this.props;
        if (!disabled) {
            const classes = classList(this.el.current as HTMLElement)
            if (!classes.contains(focusClassName)) {
                classes.add(focusClassName)
            }
        }
    }

    /**
     * 处理失去焦点
     */
    private handleBlur = () => {
        const {disabled, focusClassName} = this.props;
        if (!disabled) {
            const classes = classList(this.el.current as HTMLElement)
            if (classes.contains(focusClassName)) {
                classes.remove(focusClassName)
            }
        }
    }

    /**
     * 渲染函数
     */
    render(): React.ReactNode {
        const {children} = this.props;
        return (
            <Handler
                ref={this.el}
                onFocus={this.handleFocus}
                onBlur={this.handleBlur}
            >
                {children}
            </Handler>
        )


    }
}
