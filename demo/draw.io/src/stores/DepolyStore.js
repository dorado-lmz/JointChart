
import dispatcher from '../dispatcher/AppDispatcher.js';
import { EventEmitter } from 'events';

var flow = null;

function setFlow(_flow){
  flow = _flow;
}

var DepolyStore = Object.assign({}, EventEmitter.prototype, {
   addDepolyListener: function (callback){
    this.on('deploy', callback)
  },

   removeDepolyListener: function(callback) {
    this.removeListener('deploy', callback)
  },

   getFlow: function(){
    return flow;
  }


});

function handleAction(action){
  if(action.type === 'deploy'){
    setFlow(action.flow);
    DepolyStore.emit('deploy');
  }
}

DepolyStore.dispatchToken = dispatcher.register(handleAction);

export default DepolyStore;
