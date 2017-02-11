require('normalize.css/normalize.css');
require('styles/App.styl');

import React from 'react';

import PaletteComponent from './palette.js';
import WorkspaceComponent from './workspace.js';
import SidebarComponent from './sidebar.js';
import SettingsComponent from './SettingsComponent.js';


class AppComponent extends React.Component {
  constructor(){
    super();
    this.graph = new dedu.Graph({},{
      tabs: true
    });
  }
  render() {
    return (
      <div className="index">
        <PaletteComponent />
        <WorkspaceComponent graph={this.graph} openDialog={this.openDialog}/>
        <SeparatorComponent position="sidebar"/>
        <SidebarComponent graph={this.graph}/>
        <SettingsComponent/>
      </div>
    );
  }

}


class SeparatorComponent extends React.Component {
	render(){
        return (<div id={this.props.position+'-separator'} className="ui-draggable"></div>)
	}
}

AppComponent.defaultProps = {
};

export default AppComponent;
