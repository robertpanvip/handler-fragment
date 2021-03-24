/**
 * 警告
 * @param valid
 * @param component
 * @param message
 */
export default function warning(valid: boolean, component: string, message: string):void {
    // Support uglify
    if (process.env.NODE_ENV !== 'production' && !valid && console !== undefined) {
        console.warn(`Warning: [handler-fragment: ${component}] ${message}`);
    }
}
