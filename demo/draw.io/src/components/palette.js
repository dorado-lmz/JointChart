import Accordion from 'react-bootstrap/lib/Accordion'
import Panel from 'react-bootstrap/lib/Panel'
import React from 'react';

class PaletteComponent extends React.Component {
	constructor(){
		super();
		this.state = {
			basicElements: {}
		};
	}
	render(){
		let basicElements = this.state.basicElements,
        categorys = Object.keys(basicElements)
		return (
			<div id="palette">
	            <div id="palette-search">
	                <i className="glyphicon glyphicon-search"></i>
	                <input id="palette-search-input" type="text" placeholder="filter nodes"></input>
	                <a href="#" id="palette-search-clear"><i className="glyphicon glyphicon-remove"></i></a>
	            </div>
	            <Accordion id="palette-container">
	            	{categorys.map((category,index) =>
		            	<Panel className="palette-category" id={'palette-container-'+category} header={category} eventKey={index} key={index}>
                    <ElemComponent category={category} elems={Object.keys(basicElements[category])}/>
		             	</Panel>
	            	)}
	            </Accordion>
	            <div id="palette-footer">
	                <a className="palette-button" id="palette-collapse-all" href="#">
	                	<i className="glyphicon glyphicon-menu-up"></i>
	                </a>
	                <a className="palette-button" id="palette-expand-all" href="#">
	                	<i className="glyphicon glyphicon-menu-down"></i>
	                </a>
	            </div>
	        </div>
		);
	}

	componentDidMount(){
		var basicElements = {
	        'basic':{
	                'basic.Rect':{
	                    size:{width:31,height:16},
	                    position:{x:2,y:10}
	                },
	                'basic.CRect':{
	                    size:{width:31,height:16},
	                    position:{x:2,y:10}
	                },
	                'basic.Circle':{
	                    size:{width:20,height:20},
	                    position:{x:18,y:18}
	                },
	                'basic.Ellipse': {
	                    size: {width: 31, height: 20},
	                    position: {x: 18, y: 18}
	                }
	            },
	        'uml_state':{
	            'state-start':{
	                size:{width:20,height:20},
	                position:{x:18,y:18}
	            },
	            'state-end':{
	                size:{width:20,height:20},
	                position:{x:18,y:18}
	            },
	            'state':{
	                size:{width:31,height:20},
	                position:{x:2,y:10},
	                attrs: {
	                    '.uml-state-name': {
	                        'font-size': 8
	                    }
	                }
	            },
              'branch': {},
              'terminate': {},
              'history': {},
              'detail-history': {}
	        }
	    };
		this.setState({
			basicElements:basicElements
		});
	}
}

class ElemComponent extends React.Component {
  dragStart = (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      node_type: e.target.className.match(/iconoo\-([\w|\-]+)/)[1],
      category: this.props.category
    }));
  }
	render(){
		var href = 'collapse-'+this.props.category,
			elems = this.props.elems;

		return (
      <div>
        {
           elems.map((elem,key) =>
             <a href="javascript:void(0);" key={key}><i className={"iconoo-"+elem} draggable="true"
             onDragStart={this.dragStart}></i></a>)
         }
      </div>
		);
	}
}


export default PaletteComponent;
