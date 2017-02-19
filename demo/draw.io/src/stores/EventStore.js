import dispatcher from '../dispatcher/AppDispatcher.js';
import { EventEmitter } from 'events';

var event = null;

function setEvent(_event){
  event = _event;
}

var EventStore = Object.assign({}, EventEmitter.prototype, {
   addEventModifyListener: function (callback){
    this.on('event_modify', callback)
  },

   removeEventModifyListener: function(callback) {
    this.removeListener('event_modify', callback)
  },

   getEvent: function(){
    return event;
  }


});

function handleAction(action){
  if(action.type === 'updateEvent'){
    setEvent(action.event);
    EventStore.emit('event_modify');
  }
}

EventStore.dispatchToken = dispatcher.register(handleAction);

export default EventStore;
