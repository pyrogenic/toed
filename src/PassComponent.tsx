import * as React from "react";
import Button, { ButtonProps } from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import Dropdown from "react-bootstrap/Dropdown";
import Row from "react-bootstrap/Row";
import Focus, { FocusIcons } from "./Focus";
import { iconClassName } from "./OpenIconicNames";
import Pass from "./Pass";

interface IProps {
    pass: Pass;
    focus: Focus;
    words?: string[];
    changePass(pass: Pass): void;
    changeFocus(focus: Focus, solo: boolean): void;
    lookup(word: string): void;
}

interface IState {

}

export default class PassComponent extends React.Component<IProps, IState> {
    public render() {
        const { lookup, pass, changePass, focus, changeFocus, words } = this.props;
        const CustomToggle = React.forwardRef<Button, ButtonProps>(
            ({ children, onClick }, ref: any) => (
                <Button ref={ref} size="sm" variant="outline-secondary" onClick={(e) => {
                    e.preventDefault();
                    onClick?.(e);
                }}>
                    {children}
                </Button>
            ));
        return <><Row>
            <ButtonGroup as={Col} className="mb-2">
                <Button
                    onClick={changeFocus.bind(null, Focus.hide, false)}
                    size="sm"
                    variant={focus === Focus.hide ? "secondary" : "outline-secondary"}
                >
                    <span
                        className={iconClassName(FocusIcons[Focus.hide])}
                        title="hide"
                        aria-hidden={true}
                    />
                </Button>
                <Button
                    onClick={changeFocus.bind(null, Focus.normal, false)}
                    size="sm"
                    variant={focus === Focus.normal ? "secondary" : "outline-secondary"}
                >
                    <span
                        className={iconClassName(FocusIcons[Focus.normal])}
                        title="normal"
                        aria-hidden={true}
                    />
                </Button>
                <Button
                    onClick={changeFocus.bind(null, Focus.focus, false)}
                    size="sm"
                    variant={focus === Focus.focus ? "secondary" : "outline-secondary"}
                >
                    <span
                        className={iconClassName(FocusIcons[Focus.focus])}
                        title="focus"
                        aria-hidden={true}
                    />
                </Button>
                <Dropdown onSelect={(word: string | null) => word && lookup(word)}>
                    <Dropdown.Toggle as={CustomToggle} id="tagged-words">
                        <span className="oi oi-list" title="list" aria-hidden={true} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        {words?.map((word) => <Dropdown.Item key={word} eventKey={word}>{word}</Dropdown.Item>)}
                    </Dropdown.Menu>
                </Dropdown>
            </ButtonGroup>
        </Row>
            <Row>
                <ButtonGroup as={Col}>
                    <Button
                        onClick={change.bind(null, Pass.primary)}
                        size="sm"
                        variant={
                            pass === Pass.primary
                                ? "primary"
                                : "outline-primary"}
                    >
                        <span className="oi oi-thumb-up" title="Normal" />
                    </Button>
                    <Button
                        onClick={change.bind(null, Pass.secondary)}
                        size="sm"
                        variant={
                            pass === Pass.secondary
                                ? "primary"
                                : "outline-primary"}
                    >
                        <span className="oi oi-minus" title="Discourage" />
                    </Button>
                    <Button
                        onClick={change.bind(null, Pass.tertiary)}
                        size="sm"
                        variant={
                            pass === Pass.tertiary
                                ? "primary"
                                : "outline-primary"}
                    >
                        <span className="oi oi-thumb-down" title="Avoid" />
                    </Button>
                    <Button
                        onClick={change.bind(null, Pass.banned)}
                        size="sm"
                        variant={
                            pass === Pass.banned
                                ? "primary"
                                : "outline-primary"}
                    >
                        <span className="oi oi-ban" title="Disallow" />
                    </Button>
                </ButtonGroup>
            </Row></>;

        function change(v: Pass) {
            changePass(v);
        }
    }
}
