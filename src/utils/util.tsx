
/**
 * 随机生成UUID
 */
export function UUID(): string {
    return 'uuid-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
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
export function classList(dom: Element): Pick<DOMTokenList, 'add' | 'remove' | 'toggle' | 'contains'> {
    const _dom = dom;
    let classes: Array<string> = dom?.className?.trim().split(/\s+/g) || [];
    return {
        add(...params: string[]): void {
            (classes as Array<any>).push(params);
            classes = classes.flat();
            _dom && (_dom.className = classes.join(' ').trim());
        },
        remove(...params: string[]): void {
            params.forEach((param = '') => {
                const index = classes.indexOf(param);
                if (index !== -1) {
                    classes.splice(index, 1)
                }
            });
            if (_dom && classes.length === 0) {
                return _dom.removeAttribute('class');
            }
            _dom && (_dom.className = classes.join(' ').trim());
        },
        toggle(token: string, force?: boolean): boolean {
            const index = classes.indexOf(token);
            if (index === -1) {
                classes.push(token);
            } else if (!force) {
                classes.splice(index, 1)
            }
            if (_dom && classes.length === 0) {
                _dom.removeAttribute('class');
                return true
            }
            _dom && (_dom.className = classes.join(' ').trim());
            return true;
        },
        contains(token: string): boolean {
            return !!classes.find(item => token === item)
        }
    }

}
