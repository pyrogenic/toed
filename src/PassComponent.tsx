import * as React from "react";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Pass from "./Pass";

interface IProps {
    value: Pass;
    change(pass: Pass): void;
}

interface IState {

}

export default class PassComponent extends React.Component<IProps, IState> {
    public render() {
        const { change: realChange, value } = this.props;
        return <ButtonGroup>
            <Button
                onClick={change.bind(null, Pass.primary)}
                size="sm"
                variant={
                    value === Pass.primary
                        ? "light"
                        : "outline-light"}
            >
                <span className="oi oi-thumb-up" title="Normal" />
            </Button>
            <Button
                onClick={change.bind(null, Pass.secondary)}
                size="sm"
                variant={
                    value === Pass.secondary
                        ? "secondary"
                        : "outline-secondary"}
            >
                <span className="oi oi-thumb-down" title="Discourage" />
            </Button>
            <Button
                onClick={change.bind(null, Pass.banned)}
                size="sm"
                variant={
                    value === Pass.banned
                        ? "danger"
                        : "outline-danger"}
            >
                <span className="oi oi-ban" title="Disallow" />
            </Button>
        </ButtonGroup>;

        function change(v: Pass) {
            realChange(v);
        }
    }
}
