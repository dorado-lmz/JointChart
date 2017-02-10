import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';
import Button from 'react-bootstrap/lib/Button'

class SettingsComponent extends React.Component{

  render(){
    return (
      <Modal show={this.props.dialog.show}>
        <Modal.Header>
          <Modal.Title className="pull-left">Modal title</Modal.Title>
          <Button bsStyle="success" className="pull-right">子状态</Button>
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
          <Button onClick={this.props.closeDialog}>Close</Button>
          <Button bsStyle="primary">Save changes</Button>
        </Modal.Footer>

      </Modal>
      );
  }
}
export default SettingsComponent;
