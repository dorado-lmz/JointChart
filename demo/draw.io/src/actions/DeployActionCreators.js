import dispatcher from '../dispatcher/AppDispatcher.js';

function deploy(flow){
  var action = {
      type: 'deploy',
      flow: flow
  };

  dispatcher.dispatch(action);

};

var DeployActionCreators = {
  deploy: deploy
}

export default DeployActionCreators;
