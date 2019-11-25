import * as React from "react";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Pass from "./Pass";

interface IProps {
    value: Pass;
    focus: boolean;
    change(pass: Pass): void;
    toggleFocus(): void;
}

interface IState {

}

export default class PassComponent extends React.Component<IProps, IState> {
    public render() {
        const { change: realChange, focus, toggleFocus, value } = this.props;
        return <Row>
            <Col>
                <Button variant={focus ? "secondary" : "outline-secondary"} onClick={toggleFocus}>
                    <span className="oi oi-eye" title="focus" aria-hidden={true} />
                </Button>
            </Col>
            <ButtonGroup as={Col}>
                <Button
                    onClick={change.bind(null, Pass.primary)}
                    size="sm"
                    variant={
                        value === Pass.primary
                            ? "primary"
                            : "outline-primary"}
                >
                    <span className="oi oi-thumb-up" title="Normal" />
                </Button>
                <Button
                    onClick={change.bind(null, Pass.secondary)}
                    size="sm"
                    variant={
                        value === Pass.secondary
                            ? "primary"
                            : "outline-primary"}
                >
                    <span className="oi oi-thumb-down" title="Discourage" />
                </Button>
                <Button
                    onClick={change.bind(null, Pass.banned)}
                    size="sm"
                    variant={
                        value === Pass.banned
                            ? "primary"
                            : "outline-primary"}
                >
                    <span className="oi oi-ban" title="Disallow" />
                </Button>
            </ButtonGroup>
        </Row>;

        function change(v: Pass) {
            realChange(v);
        }
    }
}
