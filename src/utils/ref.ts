import React from "react"
/**
 *ref转发
 */
export function forwardRef(name = 'forwardRef') {
    return function <T, W extends T, P>(Component: T): W {
        const RenderComponent = Component as unknown as React.ComponentType<P>;
        const ForwardedComponent = React.forwardRef((props: any, ref: any) => {
            return React.createElement(RenderComponent, {...props, [name]: ref},props.children)
        });
        ForwardedComponent.displayName = `${RenderComponent.displayName||RenderComponent.name}-ForwardRef`;
        return ForwardedComponent as unknown as W;
    }
}
