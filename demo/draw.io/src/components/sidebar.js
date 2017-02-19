import React from 'react';
import DepolyStore from '../stores/DepolyStore.js';
import {parseFlow} from '../runtime/runtime.js';
import Tabs from 'react-bootstrap/lib/Tabs';
import Tab from 'react-bootstrap/lib/Tab';
import InfoComponent from './InfoComponent.js';
import EventSystemComponent from './EventSystemComponent.js';

class SidebarComponent extends React.Component {

  render() {
    return (
      <div id="sidebar">
        <SidebarTabsComponent graph={this.props.graph}/>
        <div id="sidebar-footer"></div>
      </div>
    )
  }
  componentDidMount() {
    DepolyStore.addDepolyListener(this.onDepoly);
  }

  componentWillUnmount() {
    DepolyStore.removeDepolyListener(this.onDepoly);
  }

  onDepoly(){
    console.log(DepolyStore.getFlow());
    parseFlow(DepolyStore.getFlow())
  }

}

class SidebarTabsComponent extends React.Component {
  constructor() {
    super();
    this.state = {
      activeKey: 1
    }
  }

  render() {
    return (
        <Tabs defaultActiveKey={this.state.activeKey} animation={false} id="noanim-tab-example">
          <Tab eventKey={1} title="Info" className="sidebar-content">
            <InfoComponent graph={this.props.graph}/>
          </Tab>
          <Tab eventKey={2} title="EventSystem" className="sidebar-content">
            <EventSystemComponent graph={this.props.graph}/>
          </Tab>
        </Tabs>
    );
  }

  handleSelect = (eventKey, event)=> {
    this.setState({
      activeKey: eventKey
    });
    console.log(event.target)
    console.log(eventKey)
  }

}

export default SidebarComponent;
