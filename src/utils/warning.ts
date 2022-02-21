/**
 * 警告
 * @param valid
 * @param component
 * @param message
 * @param node
 */
export default function warning(valid: boolean, component: string, message: string,node?:HTMLElement):void {
    // Support uglify
    if (process.env.NODE_ENV !== 'production' && !valid && console !== undefined) {
        if(node){
            console.warn(`Warning: [handler-fragment: ${component}]`,node,message);
        }else{
            console.warn(`Warning: [handler-fragment: ${component}] ${message}`);
        }
    }
}
