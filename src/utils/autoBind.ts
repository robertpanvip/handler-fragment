/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
const {
    defineProperty,
    getOwnPropertyDescriptor,
    getOwnPropertyNames,
    getOwnPropertySymbols,
    getPrototypeOf
} = Object;
let mapStore: WeakMap<any, any>;

interface Descriptor {
    value?: Function
    configurable?: boolean,
    enumerable?: boolean,
    get?: () => any,
    set?: (value: any) => void
}

interface OwnPropertyDescriptors {
    [propName: string]: PropertyDescriptor
}

/**
 *
 * @param fn
 * @param context
 * @returns {(function(): *)|{new(...args: any[]): any} | ((...args: any[]) => any) | OmitThisParameter<{bind}|*> | {bind} | * | {new(...args: any[]): any} | ((...args: any[]) => any)}
 */
function bind(fn: Function, context: any) {
    if (fn.bind) {
        return fn.bind(context);
    } else {
        return function __autobind__() {
            /* eslint-disable prefer-rest-params */
            return fn.apply(context, arguments);
        };
    }
}

/**
 *
 * @param obj
 * @param fn
 * @returns {*}
 */
function getBoundSuper(obj: any, fn: Function) {
    if (typeof WeakMap === 'undefined') {
        throw new Error(
            `Using @autobind on ${fn.name}() requires WeakMap support due to its use of super.${fn.name}()
      See https://github.com/jayphelps/core-decorators.js/issues/20`
        );
    }

    if (!mapStore) {
        mapStore = new WeakMap();
    }

    if (mapStore.has(obj) === false) {
        mapStore.set(obj, new WeakMap());
    }

    const superStore = mapStore.get(obj);

    if (superStore.has(fn) === false) {
        superStore.set(fn, bind(fn, obj));
    }

    return superStore.get(fn);
}


const getOwnKeys: (object: any) => (string | symbol)[] = getOwnPropertySymbols
    ? function (object: any) {
        return [...getOwnPropertyNames(object), ...getOwnPropertySymbols(object)];
    }
    : getOwnPropertyNames;

/**
 * 得到自身的描述信息
 * @param obj
 */
function getOwnPropertyDescriptors(obj: any): OwnPropertyDescriptors {
    const descriptors = {} as any;
    getOwnKeys(obj).forEach(
        key => (descriptors[key] = getOwnPropertyDescriptor(obj, key))
    );
    return descriptors;
}

/**
 *
 * @param key
 * @returns {function(*=): *}
 */
function createDefaultSetter(key: string | symbol) {
    return function set(newValue: any) {
        Object.defineProperty(this, key, {
            configurable: true,
            writable: true,
            // IS enumerable when reassigned by the outside word
            enumerable: true,
            value: newValue
        });

        return newValue;
    };
}

/**
 *重新定个方法中的this
 * @param target class
 * @param key class中方法
 * @param desc 描述信息
 * @returns {{set: (function(*=): *), enumerable: *, get(): (*|*|*|*), configurable: *}|(function(): *)|*}
 */
function autoBindMethod(target: Function, key: string | symbol, desc: Descriptor): Descriptor {
    const {value: fn, configurable, enumerable} = desc;
    if (typeof fn !== 'function') {
        throw new SyntaxError(`@autobind can only be used on functions, not: ${fn}`);
    }

    const {constructor} = target;

    return {
        configurable,
        enumerable,

        get() {
            // Class.prototype.key lookup
            // Someone accesses the property directly on the prototype on which it is
            // actually defined on, i.e. Class.prototype.hasOwnProperty(key)
            if (this === target) {
                return fn;
            }

            // Class.prototype.key lookup
            // Someone accesses the property directly on a prototype but it was found
            // up the chain, not defined directly on it
            // i.e. Class.prototype.hasOwnProperty(key) == false && key in Class.prototype
            if (this.constructor !== constructor && getPrototypeOf(this).constructor === constructor) {
                return fn;
            }

            /**调用super.sameMethod()的自动绑定方法，它也是自动绑定的，依此类推。**/
            if (this.constructor !== constructor && key in this.constructor.prototype) {
                return getBoundSuper(this, fn);
            }

            const boundFn = bind(fn, this);

            defineProperty(this, key, {
                configurable: true,
                writable: true,
                // NOT enumerable when it's a bound method
                enumerable: false,
                value: boundFn
            });

            return boundFn;
        },
        set: createDefaultSetter(key)
    };
}


/**
 * 自动绑定类
 * @param klass
 */
function autoBindClass(klass: Function) {
    /**得到原型上每个方法的描述信息**/
    const descriptors = getOwnPropertyDescriptors(klass.prototype) as any;
    /**方法名称**/
    const keys = getOwnKeys(descriptors);
    for (let i = 0, l = keys.length; i < l; i++) {
        /**每个方法名称**/
        const key = keys[i];
        /**方法对应的描述信息**/
        const desc = descriptors[key];
        if (typeof desc.value !== 'function' || key === 'constructor') {
            continue;
        }
        /**给每个方法重新绑定this**/
        defineProperty(klass.prototype, key, autoBindMethod(klass.prototype, key, desc));
    }
}

/**
 * react类中自动绑定this
 * @param args
 * @returns {(function(): (void|{enumerable, get, configurable}))|void|{enumerable, get, configurable}}
 */
export default function autoBind(...args: any[]): any {
    if (args.length === 1) {
        return autoBindClass(args[0]);
    } else {
        const [target, key, desc] = args;
        return autoBindMethod(target, key, desc);
    }
}
