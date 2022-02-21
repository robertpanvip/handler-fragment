import * as React from 'react';
import {OutSide, FocusWithin, Handler} from "../src";
class Test extends React.PureComponent {

    state = {};
    ref = React.createRef<HTMLDivElement>();

    /**
     *
     */
    componentDidMount() {
        console.log(this.ref);
    }

    /**
     *
     */
    render() {
        return (
            <div ref={this.ref}>
                <Handler

                    ref={(ref) => {
                        console.log('You will get the divs ref !!!', ref);
                    }}
                    onClick={(e) => {
                        console.log('any event you can add to handler ');
                    }}
                >
                    <div>123</div>
                </Handler>
                <FocusWithin >
                    <div className="form-control"><input/></div>
                </FocusWithin>
                <OutSide
                    ref={this.ref}
                    onOutSideClick={() => {
                        alert('You clicked outside of this component!!!');
                    }}
                >
                    <div style={{border: '1px solid',width:200,height:200}} />
                </OutSide>
            </div>
        );
    }
}

/***
 *
 * @constructor
 */
export default function App(): React.ReactElement<HTMLElement> {
    return (
        <div className="app">
            <Test/>
        </div>
    )
}
