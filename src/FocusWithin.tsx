import * as React from 'react';
import autoBind from "./utils/autoBind";
import warning from "./utils/warning";
import Handler from "./handler";
import {classList} from "./utils/util";

interface FocusWithinProps {
    children: React.ReactElement,
    focusClassName?: string
    disabled?: boolean
}

/***
 * 该组件的功能是类似于css伪类:focus-within
 * 即当前组件包裹的children的子组件获得焦点、那么当前组件包裹的children就会添加is-focus类
 */
@autoBind
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
            .filter(key => key !== 'children' && key !== 'disabled'&& key !== 'focusClassName')
            .map(key => key + '属性无效，');
        warning(
            keys.length === 0,
            'FocusWithin',
            keys + 'FocusWithin组件只支持children、disabled、focusClassName属性'
        );
    }

    /**
     * 处理聚焦
     */
    private handleFocus(): void {
        const {disabled,focusClassName} = this.props;
        if (!disabled) {
            classList(this.el.current as HTMLElement).toggle(focusClassName)
        }

    }

    /**
     * 处理失去焦点
     */
    private handleBlur() {
        const {disabled,focusClassName} = this.props;
        if (!disabled) {
            classList(this.el.current as HTMLElement).toggle(focusClassName)
        }
    }

    /**
     * 渲染函数
     */
    render(): React.ReactNode {
        const {children} = this.props;

        const count = React.Children.count(children);
        /*if (count !== 1) {
            warning(false, 'FocusWidthIn', '不应该传入一个数组');
            return children
        }*/
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
