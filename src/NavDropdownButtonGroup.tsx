import compact from "lodash/compact";
import React from "react";
import { ButtonProps } from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Dropdown from "react-bootstrap/Dropdown";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import App from "./App";

export default function NavDropdownButtonGroup({ variant, label, className, words, getOnClick, children }:
    React.PropsWithChildren<{
        variant: ButtonProps["variant"],
        label: string,
        className?: string,
        words: string[],
        getOnClick: App["getOnClick"],
    }>) {
    const [show, setShow] = React.useState(false);
    const disabled = words.length === 0;
    const fakeButtonClassName = compact(["btn", `btn-${variant}`, disabled && "disabled"]).join(" ");
    return <Nav>
        <Navbar.Text className={className}>
            <ButtonGroup>
                <div className={fakeButtonClassName} style={{ padding: 0 }}>
                    <Dropdown className="d-flex justify-content-start" show={show} onToggle={setShow}>
                        <Dropdown.Toggle
                            id={`nav-${label}`}
                            className="flex-fill text-left"
                            variant={variant}
                            style={{ border: "none" }}
                            disabled={disabled}>
                            {label}{words.length > 0 && ` (${words.length})`}
                        </Dropdown.Toggle>
                        {show && <Dropdown.Menu>
                            {
                                words.map((q) =>
                                    <Dropdown.Item key={q} onClick={getOnClick(q)}>{q}</Dropdown.Item>,
                                )
                            }
                        </Dropdown.Menu>}
                    </Dropdown>
                </div>
                {children}
            </ButtonGroup>
        </Navbar.Text>
    </Nav>;
}
