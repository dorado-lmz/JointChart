import dispatcher from '../dispatcher/AppDispatcher.js';
import { EventEmitter } from 'events';

var cell = null;
var event = null;

function setCell(_cell){
  cell = _cell;
}

function setEvent(_event) {
  event = _event;
}

var DialogStore = Object.assign({}, EventEmitter.prototype, {
   addStateSettingsListener: function (callback){
    this.on('change', callback)
  },

  addEventSettingsListener: function(callback) {
    this.on('event_change', callback)
  },

   removeStateSettingsListener: function(callback) {
    this.removeListener('change', callback)
  },

  removeEventSettingsListener: function(callback) {
    this.removeListener('event_change', callback)
  },

  getCell: function(){
    return cell;
  },

  getEvent: function(){
    return event;
  }

});

function handleAction(action){
  if(action.type === 'settingState'){
    setCell(action.cell);
    DialogStore.emit('change');
  }else if(action.type === 'settingEvent'){
    setEvent(action.event);
    DialogStore.emit('event_change');
  }
}

DialogStore.dispatchToken = dispatcher.register(handleAction);

export default DialogStore;
