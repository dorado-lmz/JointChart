import React from 'react';
import _ from 'lodash';
import ListGroup from 'react-bootstrap/lib/ListGroup';
import ListGroupItem from 'react-bootstrap/lib/ListGroupItem';
import PanelGroup from 'react-bootstrap/lib/PanelGroup';
import Panel from 'react-bootstrap/lib/Panel';
import Button from 'react-bootstrap/lib/Button';
import DialogActionCreators from '../actions/DialogActionCreators';
import EventStore from '../stores/EventStore';

class EventSystemComponent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeKey: ''
    }
  }

  render(){
    let events = this.props.graph.events||{};
        return (
        <section>
        <div className="sidebar-header">
          <span className="button-group">
            <a id="debug-tab-filter" className="sidebar-header-button" href="#" onClick={this.addEvent}>
              <i className="glyphicon glyphicon-plus"></i>
            </a>
          </span>
          <span className="button-group">
            <a id="debug-tab-clear" title="clear log" className="sidebar-header-button" href="#">
              <i className="glyphicon glyphicon-trash"></i>
            </a>
          </span>
        </div>
        <PanelGroup activeKey={this.state.activeKey} onSelect={this.handleSelect} accordion>
          {
            _.map(events,(_eventCollection,category)=>
                <Panel header={category} eventKey={category} key={category} >
                  <ListGroup>
                    {
                      _.map(_eventCollection, (event, _id) =>
                        <ListGroupItem key={_id} >{event.name}
                          <a id="debug-tab-clear" title="clear log" data-event-name={category+'-'+_id} className="sidebar-header-button pull-right" onClick={this.props.triggerEvent} href="#">
                            <i className="glyphicon glyphicon-triangle-right"></i>
                          </a>
                        </ListGroupItem>
                      )
                    }
                  </ListGroup>
                </Panel>
            )
          }
        </PanelGroup>
      </section>
        );
  }

  handleSelect= (eventKey, event)=>{
     this.setState({
      activeKey: eventKey
    });
  }

  onUpdateEvent = (e) => {
    let event =  EventStore.getEvent(), graph = this.props.graph, category=event.category, id=event.id;
    graph.events || (graph.events = {});
    if(category){
      if(!id){
        id = event.id = _.uniqueId('event_');
        graph.events[category] || (graph.events[category] = {});
      }
      graph.events[category][id] = event;
      this.setState({
        activeKey: category
      })
    }

  }

  addEvent = (e) =>{
    DialogActionCreators.settingEvent();
  }

  componentDidMount() {
    EventStore.addEventModifyListener(this.onUpdateEvent);
  }

  componentWillUnmount() {
    EventStore.removeEventModifyListener(this.onUpdateEvent);
  }

}

export default EventSystemComponent
