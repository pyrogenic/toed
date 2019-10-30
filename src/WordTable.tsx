import React from "react";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import Table from "react-bootstrap/Table";
import IWordRecord from "./IWordRecord";

interface IProps {
    records: IWordRecord[];
}

// interface IState {
//     /* */
// }

function WordRow({ record }: { record: IWordRecord }) {
    return <>
    <tr>
        <td rowSpan={2}>{record.q}</td>
        <td>{record.result
            ? JSON.stringify(record.result, undefined, 2).split("\n").map((t) => <p>{t}</p>)
            : <Spinner animation="border" />}</td>
        <td><ul>
            {record.notes.map((note, index) =>
                <Form.Control value={note} onChange={(e: any) =>
                    record.notes[index] = e.target.value} />)}
        </ul></td>
    </tr>
    <tr>
        <td>x</td>
        <td>y</td>
    </tr>
    </>;
}

export default class WordTable extends React.Component<IProps, {}> {
    // constructor(props Readonly<IProps>) {
    //     super(props);
    // }
    public render() {
        return <Table striped={true} bordered={true} hover={true} responsive={true}>
            <thead>
                <th>Query</th>
                <th>Data</th>
                <th>Notes</th>
            </thead>
            <tbody>
                {this.props.records.map((record) => <WordRow record={record} />)}
            </tbody>
        </Table>;
    }
}
