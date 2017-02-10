import React from 'react';
import _ from 'lodash';

class SideBarComponent extends React.Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div id="sidebar">
        <ul id="sidebar-tabs"></ul>
        <div id="sidebar-content"></div>
        <div id="sidebar-footer"></div>
      </div>
    );
  }
}

export default SideBarComponent;
