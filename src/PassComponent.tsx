import * as React from "react";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import Dropdown from "react-bootstrap/Dropdown";
import Row from "react-bootstrap/Row";
import Pass from "./Pass";

interface IProps {
    value: Pass;
    focus: boolean;
    xref?: string[];
    change(pass: Pass): void;
    lookup(word: string): void;
    toggleFocus(): void;
}

interface IState {

}

export default class PassComponent extends React.Component<IProps, IState> {
    public render() {
        const { lookup, change: realChange, focus, toggleFocus, value, xref } = this.props;
        const CustomToggle = React.forwardRef<Button, ConstructorParameters<typeof Button>[0]>(
            ({ children, onClick }, ref: any) => (
            <Button ref={ref} variant="outline-secondary" onClick={(e: { preventDefault: () => void; }) => {
                e.preventDefault();
                onClick(e);
            }}>
                {children}
            </Button>
        ));
        return <Row>
            <ButtonGroup as={Col}>
                <Button variant={focus ? "secondary" : "outline-secondary"} onClick={toggleFocus}>
                    <span className="oi oi-eye" title="focus" aria-hidden={true} />
                </Button>
                <Dropdown onSelect={lookup}>
                    <Dropdown.Toggle as={CustomToggle} id="tagged-words">
                        <span className="oi oi-list" title="list" aria-hidden={true} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        {xref?.map((word) => <Dropdown.Item eventKey={word}>{word}</Dropdown.Item>)}
                    </Dropdown.Menu>
                </Dropdown>
            </ButtonGroup>
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
