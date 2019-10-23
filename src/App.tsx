import React from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import { OxfordLanguage } from './types/OxfordDictionariesAPI';
import { deserialize } from 'serializr';
import RetrieveEntry from './types/gen/RetrieveEntry';
import IHeadwordEntry from './types/gen/IHeadwordEntry';
import StorageMemo from './StorageMemo';

async function fetchJson(url: string) {
  const app_id = localStorage.getItem("oed/app_id");
  const app_key = localStorage.getItem("oed/app_key");
  if (!app_id || !app_key) {
    throw new Error("missing app id or key");
  }
  const queryResult = await fetch(url, {headers: {Accept: "application/json", app_id, app_key}});
  console.log({ queryResult });
  const result = await queryResult.json();
  console.log({ result });
  return result;
}

interface IProps {

}

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;
  
  language: OxfordLanguage;
  q?: string;
  
  re?: RetrieveEntry;
}

export default class App extends React.Component<IProps, IState> {
  private fetchMemo = new StorageMemo(localStorage, "fetchJson", fetchJson);

  constructor(props: Readonly<IProps>) {
    super(props);
    this.state = {
      apiBaseUrl: "/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
      language: OxfordLanguage.americanEnglish,
      q: sessionStorage.getItem("oed/q") || undefined,
    };
  }

  public componentDidMount() {
    if (this.state.q) {
      this.go();
    }
  }

  public componentDidUpdate() {
    if (this.state.app_id) {
      localStorage.setItem("oed/app_id", this.state.app_id);
    } else {
      localStorage.removeItem("oed/app_id");
    }
    if (this.state.app_key) {
      localStorage.setItem("oed/app_key", this.state.app_key);
    } else {
      localStorage.removeItem("oed/app_key");
    }
    if (this.state.q && this.state.re && this.state.re.results && this.state.re.results[0].word == this.state.q) {
      sessionStorage.setItem("oed/q", this.state.q);
    } else {
      localStorage.removeItem("oed/q");
    }
  }

  public render() {
    return <Container>
      <Form>
        <Form.Row>
          <Col>
            <Form.Control placeholder="App ID" value={this.state.app_id || undefined}
              onChange={(e: any) => this.setState({ app_id: e.target.value })} />

          </Col>
          <Col>
            <Form.Control placeholder="App Key" value={this.state.app_key || undefined}
              onChange={(e: any) => this.setState({ app_key: e.target.value })} />
          </Col>
        </Form.Row>
        <Form.Row>
        <Form.Control placeholder="Search" value={this.state.q}
              onChange={(e: any) => this.setState({ q: e.target.value ? e.target.value : undefined })} />
              <Button onClick={this.go} disabled={!this.state.q || this.state.q.length < 2}>Go</Button>
        </Form.Row>
      </Form>
      <Row>
        <Col>
        {this.state.re && this.state.re.results && this.state.re.results.map(this.renderResponse)}
        </Col>
      </Row>
    </Container>;
  }

  private renderResponse = (entry: IHeadwordEntry) => {
    return <Card key={entry.id}>
      <Card.Header>{entry.word} ({entry.word})</Card.Header>
    </Card>;
  }

  private go = () => {
    const {apiBaseUrl,language, q} = this.state;
    if (!q) {
      return;
    }
    this.fetchMemo.get(`${apiBaseUrl}/words${language ? `/${language}` : ''}?q=${q}`, {
      // bypass: true,
    }).then((json) => {
      console.log({json});
      return deserialize(RetrieveEntry, json);
    }).then((re) => this.setState({re}))
  }
}
