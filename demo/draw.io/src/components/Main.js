require('normalize.css/normalize.css');
require('styles/App.styl');

import React from 'react';

import PaletteComponent from './palette.js';
import WorkspaceComponent from './workspace.js';
import SidebarComponent from './sidebar.js';

class AppComponent extends React.Component {
  render() {
    return (
      <div className="index">
        <PaletteComponent />
        <WorkspaceComponent />
        <SeparatorComponent position="sidebar"/>
        <SidebarComponent/>
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
