import React from 'react';
import DepolyStore from '../stores/DepolyStore.js';

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
    console.log(DepolyStore.getFlow())
  }

}


class SidebarTabsComponent extends React.Component {
  constructor() {
    super();
    this.state = {
      tabs: {},
      activeTab: null
    };
  }

  render() {
    var tabs = this.state.tabs;
    return (<ul id="sidebar-tabs" className="red-ui-tabs">
      {
        _.map(tabs, (tab, key) =>
          <li className={tab.active ? "red-ui-tab active" : "red-ui-tab"} key={key} onClick={this.activeTab} style={tab.style}>
            <a href={"#" + tab.hash} className="red-ui-tab-label" title={tab.label}>
              <span>{tab.label}</span>
            </a>
          </li>
        )
      }
    </ul>);
  }
  componentWillMount() {
    this.createTab("info");
  }


  createTab(hash) {
    var tabs = this.state.tabs;
    var activeTab = this.state.activeTab;
    tabs[hash] = {
      hash: hash,
      label: 'info',
      active: true
    };
    activeTab && (tabs[activeTab.hash].active = false);
    this.setState({
      activeTab: tabs[hash],
      tabs: tabs
    })
  }
  switchTab(hash) {
    if (!hash) return;
    var tabs = this.state.tabs;
    var activeTab = this.state.activeTab;
    activeTab && (tabs[activeTab.hash].active = false);
    tabs[hash] && (tabs[hash].active = true);

    this.setState({
      activeTab: tabs[hash],
      tabs: tabs
    })
  }
}

export default SidebarComponent;
