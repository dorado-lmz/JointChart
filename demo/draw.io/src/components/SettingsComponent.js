import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import Button from 'react-bootstrap/lib/Button'
import ButtonGroup from 'react-bootstrap/lib/ButtonGroup';
import DialogStore from '../stores/DialogStore.js';
import TabActionCreators from '../actions/TabActionCreators';

class SettingsComponent extends React.Component{

  constructor() {
      super();
      this.state = {
          dialog: {
              show: false
          }
      }
      this.onShow = this.onShow.bind(this);
  }



  render(){
    let regions= {};
    console.log(this.state.dialog.config)
    this.state.dialog.config && (regions = this.state.dialog.config.regions);
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
              <label htmlFor="inputName" className="col-sm-2 control-label">Name</label>
              <div className="col-sm-10">
                <input type="text" className="form-control" id="inputName" placeholder="Name"/>
              </div>
            </div>
            <div>
            <ul className="nav nav-tabs">
              <li role="presentation" className="active"><a href="#entry" data-toggle="tab">entry</a></li>
              <li role="presentation"><a href="#run" data-toggle="tab">run</a></li>
              <li role="presentation"><a href="#exit" data-toggle="tab">exit</a></li>
            </ul>
            <div className="tab-content">
              <div role="tabpanel" className="tab-pane active" id="entry">
                <textarea className="form-control" rows="3"></textarea>
              </div>
              <div role="tabpanel" className="tab-pane" id="run">
                <textarea className="form-control" rows="3"></textarea>
              </div>
              <div role="tabpanel" className="tab-pane" id="exit">
                <textarea className="form-control" rows="3"></textarea>
              </div>
            </div>
            </div>

          </form>
        </Modal.Body>

        <Modal.Footer>
          <Button onClick={this.onHide}>Close</Button>
          <Button bsStyle="primary">Save changes</Button>
        </Modal.Footer>

      </Modal>
      );
  }
  onShow(){
    var cell = DialogStore.getCell();
    this.setState({
      dialog: {
        show: true,
        config: cell
      }
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
  }

  componentWillUnmount() {
    DialogStore.removeStateSettingsListener(this.onShow);
  }
}
export default SettingsComponent;
