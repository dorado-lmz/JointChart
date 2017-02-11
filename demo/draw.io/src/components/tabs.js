import React from 'react';
import _ from 'lodash';
import TabStore from '../stores/TabStore.js';

class TabsComponent extends React.Component {
  constructor() {
    super();
    this.state = {
      tabs: {},
      activeTab: null
    };
  }
  addTab = (e) => {
    this.createTab();
  };
  activeTab = (e) => {
    var id = e.currentTarget.getElementsByTagName('a')[0].attributes.href.value;
    this.switchTab(id.substring(1))
  }
  onTabDblClick = (e) => {
    // if (tab.type != "subflow") {
    //   showRenameWorkspaceDialog(tab.id);
    // } else {
    //   RED.editor.editSubflow(RED.nodes.subflow(tab.id));
    // }
    var id = e.currentTarget.getElementsByTagName('a')[0].attributes.href.value.substring(1);
    if (confirm("are you sure?")) {
      var graph = this.props.graph;
      var active_id = graph.removeGraph(id);
      this.removeTab(id, active_id);
    }
  }

  format = (e)=>{
    var graph = this.props.graph;
    graph.layout();
  }

  render() {
    var tabs = this.state.tabs;
    return (
      <section className="tabs">
        <ul id="workspace-tabs" className="red-ui-tabs">
          {
            _.map(tabs, (tab, key) =>
              <li className={tab.active ? "red-ui-tab active" : "red-ui-tab"} key={key} onClick={this.activeTab} onDoubleClick={this.onTabDblClick}>
                <a href={"#" + tab.id} className="red-ui-tab-label" title={tab.label}>
                  <span>{tab.label}</span>
                </a>
              </li>
            )
          }
        </ul>
        <div id="workspace-add-tab">
          <a id="btn-workspace-add-tab" onClick={this.addTab} href="#">
            <i className="glyphicon glyphicon-plus"></i>
          </a>
        </div>
        <div id="workspace-format-tab">
          <a id="btn-workspace-format-tab" onClick={this.format} href="#">
            <i className="fa fa-circle-o"></i>
          </a>
        </div>
      </section>
    );
  }
  componentWillMount() {
    this.createTab();
    var graph = this.props.graph;
    // graph.on('cell:pointerdblclick', (cell) => {
    //   if (cell instanceof dedu.Cell) {
    //    // var tab = graph.createSubGraph(cell);
    //    this.createTab(cell);

    //   }
    // });
  }

  onAddTab = (e) => {
    var config  = TabStore.getConfig();
    this.createTab(config.cell,config.regionName);
  }

  componentDidMount() {
    TabStore.addStateSettingsListener(this.onAddTab);
  }

  componentWillUnmount() {
    TabStore.removeStateSettingsListener(this.onAddTab);
  }

  removeTab(id, active_id) {
    if (!id) return;
    var graph = this.props.graph;
    var tabs = this.state.tabs;
    var activeTab;
    delete tabs[id];

    activeTab = tabs[active_id];
    activeTab.active = true;

    this.setState({
      activeTab: activeTab,
      tabs: tabs
    })
  }
  createTab(parent,regionName) {
    var graph = this.props.graph;
    var tabs = this.state.tabs;
    var activeTab = this.state.activeTab;
    var graph_ref = graph.createGraph(parent, {region_name:regionName});

    var uuid = graph_ref.id;
    tabs[uuid] = {
      id: uuid,
      label: 'state',
      active: true
    };
    activeTab && (tabs[activeTab.id].active = false);
    this.setState({
      activeTab: tabs[uuid],
      tabs: tabs
    })
  }
  switchTab(id) {
    var graph = this.props.graph;
    if (!id) return;
    var tabs = this.state.tabs;
    var activeTab = this.state.activeTab;
    activeTab && (tabs[activeTab.id].active = false);
    tabs[id] && (tabs[id].active = true);
    graph.switchGraph(id);
    this.setState({
      activeTab: tabs[id],
      tabs: tabs
    })
  }
}


export default TabsComponent;
