import React from 'react';
import DepolyStore from '../stores/DepolyStore.js';
import {parseFlow, triggerEvent} from '../runtime/runtime.js';
import Tabs from 'react-bootstrap/lib/Tabs';
import Tab from 'react-bootstrap/lib/Tab';
import InfoComponent from './InfoComponent.js';
import EventSystemComponent from './EventSystemComponent.js';

class SidebarComponent extends React.Component {
  constructor(props) {
    super(props);
    this.onDeploy = this.onDeploy.bind(this);
  }

  render() {
    return (
      <div id="sidebar">
        <SidebarTabsComponent graph={this.props.graph}/>
        <div id="sidebar-footer"></div>
      </div>
    )
  }
  componentDidMount() {
    DepolyStore.addDepolyListener(this.onDeploy);
  }

  componentWillUnmount() {
    DepolyStore.removeDepolyListener(this.onDeploy);
  }

  onDeploy(){
    console.log(DepolyStore.getFlow());
    parseFlow(DepolyStore.getFlow(),this.props.graph);
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
        <Tabs defaultActiveKey={this.state.activeKey} animation={false} className="tabs">
          <Tab eventKey={1} title="Info">
            <InfoComponent graph={this.props.graph}/>
          </Tab>
          <Tab eventKey={2} title="EventSystem">
            <EventSystemComponent graph={this.props.graph} triggerEvent={this.triggerEvent}/>
          </Tab>
        </Tabs>
    );
  }

  triggerEvent(event){
    var eventName;
    if(eventName = event.target.parentNode.getAttribute('data-event-name')){
      triggerEvent(eventName);
    }
    // triggerEvent(eventName);
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
