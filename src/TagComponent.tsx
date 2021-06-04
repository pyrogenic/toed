import { PropertyNamesOfType } from "@pyrogenic/asset/lib";
import * as React from "react";
import Badge from "react-bootstrap/Badge";
import { IPassMap, IPipelineConfig } from "./OxfordDictionariesPipeline";

interface IProps {
    prop: PropertyNamesOfType<IPipelineConfig, IPassMap>;
    flag: keyof IPassMap & string;
    // value: IPass;
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
