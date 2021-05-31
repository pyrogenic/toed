import isEqual from "lodash/isEqual";
import React from "react";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ButtonToolbar from "react-bootstrap/ButtonToolbar";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import defaultConfig from "./default.od3config.json";
import { IPipelineConfig } from "./OxfordDictionariesPipeline";
import stringify from "./stringify";

export default function ConfigImportBox({ currentConfig, setConfig }: {
    currentConfig: IPipelineConfig;
    setConfig(config: IPipelineConfig): void;
}) {
    const [value, setValue] = React.useState(stringify(currentConfig));
    const [configError, setConfigError] = React.useState<{
        config?: IPipelineConfig;
        error?: Error;
    }>({});
    React.useEffect(() => {
        try {
            setConfigError({ config: JSON.parse(value) });
        } catch (error) {
            setConfigError({ error });
        }
    }, [value]);
    const { config, error } = configError;
    const inputArea = <Col>
        <Form.Control
            as={"textarea"}
            rows={10}
            cols={24}
            value={value}
            onChange={({ target: { value } }) => setValue(value)}
        />
    </Col>;
    const isDefault = !error && isEqual(config, defaultConfig);
    const isCurrent = isEqual(config, currentConfig);
    const toolbar = <Col as={ButtonToolbar}>
        <Button
            as={"a"}
            variant={"link"}
            href={`data:application/json,${value}`}
            download="current.od3config.json">
            Export
        </Button>
        <Button
            size={"sm"}
            variant={isDefault ? "primary" : "warning"}
            disabled={isDefault}
            onClick={() => setValue(stringify(defaultConfig))}>
            Default
        </Button>
        <ButtonGroup>
            <Button
                size={"sm"}
                variant="outline-primary"
                disabled={isCurrent}
                onClick={() => setValue(stringify(currentConfig))}>
                Undo
            </Button>
            <Button
                size={"sm"}
                disabled={!!error || isEqual(config, currentConfig)}
                title={error ? error.message : undefined}
                onClick={() => config && setConfig(config)}>
                Save
            </Button>
        </ButtonGroup>
    </Col>;
    return <>
        <Row className={"mb-2"}>
            {inputArea}
        </Row>
        <Row>
            {toolbar}
        </Row>
    </>;
}
