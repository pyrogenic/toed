import React from 'react';
import './App.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Col from 'react-bootstrap/Col';
import { OxfordLanguage } from './types/OxfordDictionariesAPI';

interface IProps {

}

interface IState {
  apiBaseUrl: string;
  app_id?: string;
  app_key?: string;

  q?: string;
  language?: OxfordLanguage;
}

export default class App extends React.Component<IProps, IState> {
  constructor(props: Readonly<IProps>) {
    super(props);
    this.state = {
      apiBaseUrl: "https://od-api.oxforddictionaries.com/api/v2",
      app_id: localStorage.getItem("oed/app_id") || undefined,
      app_key: localStorage.getItem("oed/app_key") || undefined,
    };
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
    </Container>;
  }

  private go = () => {
    fetch(`${this.state.apiBaseUrl}/words/${this.state.language}`)
  }
}
