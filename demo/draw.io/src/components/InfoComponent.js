import React from 'react';
import InfoStore from '../stores/InfoStore.js';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import ListGroup from 'react-bootstrap/lib/ListGroup';
import ListGroupItem from 'react-bootstrap/lib/ListGroupItem';


function FieldGroup({ id, label, help, ...props }) {
  return (
    <FormGroup controlId={id}>
      <ControlLabel>{label}</ControlLabel>
      <FormControl {...props} />
      {help && <HelpBlock>{help}</HelpBlock>}
    </FormGroup>
  );
}
class InfoComponent extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      type: 'welcome'
    }
  }

  stateInfo(){
    let regions = this.state.regions;
    return (<form>
      <FieldGroup
        id="formControlsText"
        type="text"
        label="Name"
        value={this.state.name}
      />
      <FormGroup>
        <ControlLabel>Regions</ControlLabel>
        <ListGroup>
            {_.keys(regions).map((name)=>
              <ListGroupItem key={name} onClick={this.openRegionByName}>{name}</ListGroupItem>
            )}
        </ListGroup>
      </FormGroup>
      </form>);
  }

  linkInfo(){
    let graph = this.props.graph,events = graph.events,event = this.state.event;
    return (
      <form>
      <FieldGroup
        id="formControlsText"
        type="text"
        label="Conditions"
        placeholder="Conditions"
      />
      <FormGroup controlId="formControlsSelect">
        <ControlLabel>Events</ControlLabel>
        <FormControl componentClass="select" value={event || 'none'} placeholder="select" ref="event" onChange={this.eventUpdate}>
          <option value="none">none</option>
          {
            _.map(events, (_eventCollection, category)=>{
              return _.map(_eventCollection, (event,_id)=>
                <option value={category+"-"+_id}>{event.name}</option>)
            })
          }

        </FormControl>
      </FormGroup>
      </form>);
  }

  welcomeInfo(){
    return (
      <p>asdf</p>)
  }

  render(){
    let type= this.state.type,content;
    switch(type){
      case 'welcome':
        content = this.welcomeInfo();
        break;
      case 'state':
        content = this.stateInfo();
        break;
      case 'link':
        content = this.linkInfo();
        break;
    }
    return content;
  }

  onShow = ()=>{
    var cell = InfoStore.getCell(),name,regions;

    name = cell.get('name');
    regions = cell.regions;
    this.setState({
      name: name,
      type: 'state',
      regions: regions
    });
  }
  onLinkShow = ()=>{
    var cell = InfoStore.getLink(),name;
    if(cell.isLink()){
      name = cell.get('name');
      this.setState({
        name: name,
        type: 'link',
        event: cell.event
      });
    }
  }
  eventUpdate = (e) => {
    var cell = InfoStore.getLink(), sel = e.target,
        selected;
    for(let i = 0;i<sel.length;i++){
      let option = sel.options[i];
      if(option.selected){
        selected = option.value;
        break;
      }
    }
    if(selected && selected!='none'){
      cell.event = selected;
    }
     this.setState({
      event: cell.event
     });
    console.log(selected);
  }
  componentDidMount() {
    InfoStore.addStateSettingsListener(this.onShow);
    InfoStore.addLinkInfoListener(this.onLinkShow);
  }

  componentWillUnmount() {
    InfoStore.removeStateSettingsListener(this.onShow);
    InfoStore.removeLinkInfoListener(this.onLinkShow);
  }
}
export default InfoComponent;
