import React from "react";
import Form from "react-bootstrap/Form";
import Table from "react-bootstrap/Table";
import IWordRecord from "./IWordRecord";
import "./WordTable.css";

interface IProps {
    records: IWordRecord[];
}

// interface IState {
//     /* */
// }

function WordRow({ record }: { record: IWordRecord }) {
    const result = record.result || {};
    const { etymology, example } = result;
    const definitions = result.definitions || {};
    const partsOfSpeech = Object.keys(definitions);
    let partOfSpeech: string | undefined;
    const {pipelineNotes} = record;
    const pipelineNoteList = pipelineNotes && pipelineNotes.length && <ul>{
        pipelineNotes.map((note, index) => <li key={index}>{note}</li>)
    }</ul>;
    return <>
        <tr>{/* row 1 */}
            <td rowSpan={6}>
                <b>{result.entry_rich}</b>
                <br />
                <i>{result.pronunciation_ipa}</i>
            </td>
            <td rowSpan={2}>{partOfSpeech = partsOfSpeech.pop()}</td>
            <td>{partOfSpeech && definitions[partOfSpeech][0]}</td>
            <td><small>{record.q}</small></td>
        </tr>
        <tr>{/* row 2 */}
            <td>{partOfSpeech && definitions[partOfSpeech][1]}</td>
            <td rowSpan={5}>
                {pipelineNoteList}
                <Form.Control value={record.notes} onChange={(e: any) =>
                    record.notes = e.target.value} />
            </td>
        </tr>
        <tr>{/* row 3 */}
            <td rowSpan={2}>{partOfSpeech = partsOfSpeech.pop()}</td>
            <td>{partOfSpeech && definitions[partOfSpeech][0]}</td>
        </tr>
        <tr>{/* row 4 */}
            <td>{partOfSpeech && definitions[partOfSpeech][1]}</td>
        </tr>
        <tr>{/* row 5 */}
            <td>Etymology</td><td>{etymology}</td>
        </tr>
        <tr>{/* row 6 */}
            <td>Example</td><td>{example}</td>
        </tr>
    </>;
}

export default class WordTable extends React.Component<IProps, {}> {
    // constructor(props Readonly<IProps>) {
    //     super(props);
    // }
    public render() {
        return <Table striped={false} bordered={false} hover={true} responsive={true} size="sm" className="word-table">
            <thead>
                <th>Word</th>
                <th colSpan={2}>Definition</th>
                <th>Notes</th>
            </thead>
            <tbody>
                {this.props.records.map((record) => <WordRow record={record} />)}
            </tbody>
        </Table>;
    }
}
