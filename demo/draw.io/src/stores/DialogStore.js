import dispatcher from '../dispatcher/AppDispatcher.js';
import { EventEmitter } from 'events';

var cell = null;

function setCell(_cell){
  cell = _cell;
}

var DialogStore = Object.assign({}, EventEmitter.prototype, {
   addStateSettingsListener: function (callback){
    this.on('change', callback)
  },

   removeStateSettingsListener: function(callback) {
    this.removeListener('change', callback)
  },

   getCell: function(){
    return cell;
  }


});

function handleAction(action){
  if(action.type === 'settingState'){
    setCell(action.cell);
    DialogStore.emit('change');
  }
}

DialogStore.dispatchToken = dispatcher.register(handleAction);

export default DialogStore;
