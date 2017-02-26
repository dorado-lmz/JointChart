import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import Button from 'react-bootstrap/lib/Button'
import ButtonGroup from 'react-bootstrap/lib/ButtonGroup';
import DialogStore from '../stores/DialogStore.js';
import TabActionCreators from '../actions/TabActionCreators';
import EventActionCreators from '../actions/EventActionCreators';

class DialogComponent extends React.Component{

  constructor() {
      super();
      this.state = {
          dialog: {
              show: false
          },
          type: 'stateSettings'
      }
      this.onShow = this.onShow.bind(this);
      this.onEventShow = this.onEventShow.bind(this);
  }

  stateSettingsDialog(){
    let regions= {}, cell = this.state.dialog.config, name="",enter,entry,exit;
    if(!cell)
      return null;
    regions = cell.regions;
    name = cell.get('name');
    enter = cell.enter;
    entry = cell.entry;
    exit = cell.exit;
    return (
      <Modal show={this.state.dialog.show}>
        <Modal.Header>
          <div className="btn-group" role="group">
            {_.keys(regions).map((name)=>
              <Button key={name} onClick={this.openRegionByName}>{name}</Button>
            )}
          </div>
          <Button bsStyle="success" className="pull-right" onClick={this.newRegion}>new region</Button>
        </Modal.Header>


        <Modal.Body>
          <form className="form-horizontal">
            <div className="form-group">
              <label htmlFor="inputName" >Name</label>
              <div className="col-sm-10">
                <input type="text" className="form-control" ref="inputName" id="inputName" defaultValue={name}/>
              </div>
            </div>
            <div>
            <ul className="nav nav-tabs">
              <li role="presentation" className="active"><a href="#entry" data-toggle="tab">entry</a></li>
              <li role="presentation"><a href="#run" data-toggle="tab">run</a></li>
              <li role="presentation"><a href="#exit" data-toggle="tab">exit</a></li>
            </ul>
            <div className="tab-content">
              <div role="tabpanel" className="tab-pane active" id="enter">
                <textarea className="form-control" ref="inputEnter" defaultValue={enter} rows="3"></textarea>
              </div>
              <div role="tabpanel" className="tab-pane" id="entry">
                <textarea className="form-control" ref="inputEntry" defaultValue={entry} rows="3"></textarea>
              </div>
              <div role="tabpanel" className="tab-pane" id="exit">
                <textarea className="form-control" ref="inputExit" defaultValue={exit} rows="3"></textarea>
              </div>
            </div>
            </div>

          </form>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={this.onHide}>Close</Button>
          <Button bsStyle="primary" onClick={this.saveState}>Save changes</Button>
        </Modal.Footer>

      </Modal>);
  }

  render(){
    let type=this.state.type, content=null;
    switch(type){
      case 'stateSettings':
        content = this.stateSettingsDialog();
        break;
      case 'eventSettings':
        content = this.eventSetingsDialog();
        break;
    }
    return content;
  }

  eventSetingsDialog(){
    return (
      <Modal show={this.state.dialog.show}>
        <Modal.Header>
          <span>Event</span>
        </Modal.Header>

        <Modal.Body>
          <form className="form-horizontal">
            <div className="form-group">
              <label htmlFor="inputName" className="col-sm-2 control-label">Category</label>
              <div className="col-sm-10">
                <input type="text" className="form-control" ref="inputCategory" id="inputName" placeholder="Name"/>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="inputName" className="col-sm-2 control-label">Name</label>
              <div className="col-sm-10">
                <input type="text" className="form-control" ref="inputName" id="inputName" placeholder="Name"/>
              </div>
            </div>
            <div>
            </div>

          </form>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={this.onHide}>Close</Button>
          <Button bsStyle="primary" onClick={this.saveEvent}>Save changes</Button>
        </Modal.Footer>

      </Modal>);
  }

  saveState = (e) => {
    var cell = DialogStore.getCell();
    cell.set('name',this.refs.inputName.value);
    cell.enter = this.refs.inputEnter.value;
    cell.entry = this.refs.inputEntry.value;
    cell.exit = this.refs.inputExit.value;
    this.onHide();
  }

  saveEvent = (e) => {
    let event = {
      category: this.refs.inputCategory.value,
      name: this.refs.inputName.value
    };
    EventActionCreators.updateEvent(event);
  }

  onShow(){
    var cell = DialogStore.getCell();
    this.setState({
      dialog: {
        show: true,
        config: cell
      },
      type: 'stateSettings'
    })
  }
  onEventShow(){
     var event = DialogStore.getEvent();
    this.setState({
      dialog: {
        show: true,
        config: event
      },
      type: 'eventSettings'
    })
  }
  onHide= (e) => {
    this.setState({
      dialog: {
        show: false
      }
    })
  }

  openRegionByName = (e) =>{
    var regionName = e.target.textContent;
    var config = {
      cell: this.state.dialog.config,
      regionName: regionName
    }
    TabActionCreators.newTab(config);
    this.onHide();
  }

  newRegion= (e) => {
    var config = {
      cell: this.state.dialog.config,
    }
    TabActionCreators.newTab(config);
    this.onHide();
  }

  componentDidMount() {
    DialogStore.addStateSettingsListener(this.onShow);
    DialogStore.addEventSettingsListener(this.onEventShow);
  }

  componentWillUnmount() {
    DialogStore.removeStateSettingsListener(this.onShow);
     DialogStore.removeEventSettingsListener(this.onEventShow);
  }
}
export default DialogComponent;
