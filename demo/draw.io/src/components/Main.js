require('normalize.css/normalize.css');
require('styles/App.scss');

import React from 'react';
import dedu from 'joint_chart';
import PaletteComponent from './palette.js';
import WorkspaceComponent from './workspace.js';
import SidebarComponent from './sidebar.js';
import DialogComponent from './DialogComponent.js';


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
        <WorkspaceComponent graph={this.graph}/>
        <SeparatorComponent position="sidebar"/>
        <SidebarComponent graph={this.graph}/>
        <DialogComponent/>
      </div>
    );
  }
  componentDidMount(){
    var that = this;
    $.Shortcuts.add({
      type: 'down',
      mask: 'Delete',
      handler: function() {
          that.graph.removeSection();
      }
    }).start();

  }
  componentWillUnmount(){
    $.Shortcuts.stop();
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
