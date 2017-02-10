import React from 'react';
import _ from 'lodash';
import $ from 'jquery';
import Backbone from 'backbone';
//import {org} from 'imports?$=jquery,_=lodash,Backbone=backbone!../joint_chart.min.js';
import dedu from 'joint_chart';
import {getConfigByType} from '../stores/chart_utils.js';
import TabsComponent from './tabs.js';
import DeployActionCreators from '../actions/DeployActionCreators';

class WorkspaceComponent extends React.Component {
  dragOver = (e)=>{
    //this.style.background='red'
    e.preventDefault();
  };
  drop = (e)=>{
    let {node_type,category} = JSON.parse(e.dataTransfer.getData('text/plain')),
        chart = this.chart,
        graph = this.props.graph;
    console.log(node_type);
    var namespaceClass = dedu.util.getByPath(
      chart.options.cellViewNamespace, getConfigByType(category,node_type), ".")
    let cell = new namespaceClass({
      position:{
        x: e.pageX-this.originPosition.x,
        y: e.pageY-this.originPosition.y
      }
    });
    graph.addCell(cell);
  };

  deploy = (e) => {
    let graph = this.props.graph;
    // DeployActionCreators.deploy(graph.exportGraph());
    DeployActionCreators.deploy(graph.active_cells());
  };

	render(){
		return (
			<div id="workspace">
	            <div id="designer_header">
	                <div id="toolbar">
                    <button type="button" className="btn btn-danger btn-xs pull-right" onClick={this.deploy}>Deploy</button>
	                </div>
	            </div>

              <TabsComponent graph={this.props.graph}/>

	            <div id="chart"
                        className="ui-droppable"
                        onDragOver={this.dragOver}
                        onDrop={this.drop}></div>
	            <div id="chart_ext">
	                <textarea id="linker_text_edit"></textarea>
	            </div>
	            <div id="workspace-toolbar">
	                <span data-i18n="event">event:</span>
	                <input type="text" />
	                <span data-i18n="event">condition:</span>
	                <input type="text" />
	                <span data-i18n="event">action:</span>
	                <input type="text" />
	                <a className="button" id="workspace-statechart-transition-ok" href="#" data-i18n="[append]subflow.deleteSubflow">
	                	<i className="fa fa-check-square"></i> ok
	                </a>
	            </div>
	            <div id="workspace-footer">
	                <a className="workspace-footer-button" id="btn-zoom-out" href="#">
	                	<i className="fa fa-minus"></i>
	                </a>
	                <a className="workspace-footer-button" id="btn-zoom-zero" href="#">
	                	<i className="fa fa-circle-o"></i>
	                </a>
	                <a className="workspace-footer-button" id="btn-zoom-in" href="#">
	                	<i className="fa fa-plus"></i>
	                </a>
	            </div>
	        </div>
		);
	}
	componentDidMount(){
    let graph = this.props.graph;

		var chart = this.chart = new dedu.Chart({
		    el: $('#chart'),
		    width: 5000,
		    height: 5000,
		    tabindex:1,
		    gridSize: 1,
		    model:graph,
		    style: {

		   	}});
    let bound_box = document.getElementById('chart').getBoundingClientRect();
    this.originPosition = {
      x: bound_box.left,
      y: bound_box.top,
    };

    graph.on('cell:pointerdblclick', (cell) => {
      if (cell instanceof dedu.Cell) {
        var config = {};
        config.title = cell.get('name');
        config.body = ``;

        var openDialog = this.props.openDialog;
        openDialog(config);
      }
    });
	}

}

export default WorkspaceComponent;
