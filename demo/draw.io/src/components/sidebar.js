import React from 'react';

class SidebarComponent extends React.Component {
	render(){
		return (
			<div id="sidebar">
	            <ul id="sidebar-tabs" className="red-ui-tabs"></ul>
	            <div id="sidebar-content"></div>
	            <div id="sidebar-footer"></div>
	        </div>
		)
	}
}

export default SidebarComponent;
