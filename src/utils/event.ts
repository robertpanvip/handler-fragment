
interface EventTargetInstance{
    constructor:()=>EventTargetInstance,
    addEventListener:(type:string, callback:()=>void)=>void,
    removeEventListener:(type:string, callback:()=>void)=>void
    dispatchEvent:(event:any)=>void
}
export interface Event {
    target?: EventTarget,
    symbol?: symbol,
    callback?: (event: any) => void,
    [key: string]: any
}

export default class EventTarget{

    private readonly listeners:any;

    /**
     * 构造函数
     */
    constructor(){
        this.listeners = {};
    }

    /**
     *添加监听
     * @param type
     * @param callback
     */
    addEventListener(type:string|symbol, callback:(event?:any)=>void):void {
        if(!(type in this.listeners)) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
    }

    /**
     *移除监听
     * @param type
     * @param callback
     */
    removeEventListener(type:string|symbol, callback:(event?:any)=>void) :void{
        if(!(type in this.listeners)) {
            return;
        }
        const stack = this.listeners[type];
        for(let i = 0, l = stack.length; i < l; i++) {
            if(stack[i] === callback){
                stack.splice(i, 1);
                return this.removeEventListener(type, callback);
            }
        }
    }

    /**
     *触发监听
     * @param type
     * @param params
     */
    dispatchEvent(type:string|symbol,params?:any):void {
        if(!(type in this.listeners)) {
            return;
        }
        const stack = this.listeners[type];
        for(let i = 0, l = stack.length; i < l; i++) {
            stack[i].call(this, params);
        }
    }
}


