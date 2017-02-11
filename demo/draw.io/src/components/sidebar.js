import React from 'react';
import DepolyStore from '../stores/DepolyStore.js';
import {parseFlow} from '../runtime/runtime.js';
import Nav from 'react-bootstrap/lib/Nav'
import NavItem from 'react-bootstrap/lib/NavItem'

class SidebarComponent extends React.Component {

  render() {
    return (
      <div id="sidebar">
        <SidebarTabsComponent />
        <div id="sidebar-content">

        </div>
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
  }

  render() {
    return (
      <Nav bsStyle="tabs" activeKey="1" onSelect={this.handleSelect}>
        <NavItem eventKey="1" href="/home">Info</NavItem>
        <NavItem eventKey="2" title="Item">NavItem 2 content</NavItem>
      </Nav>
    );
  }

  handleSelect = (eventKey, event)=> {
    console.log(event.target)
    console.log(eventKey)
  }

}

export default SidebarComponent;
