import * as React from "react";
import Badge from "react-bootstrap/Badge";

interface IProps {

}

interface IState {

}

export default class TagComponent extends React.Component<IProps, IState> {
    public render() {
        return <>
            <Badge variant="secondary"><span className="oi oi-eye" title="focus" aria-hidden={true} /></Badge>

            <span className="oi oi-ellipses" title="More Info" aria-hidden={true} />
        </>;
    }
}
