import dispatcher from '../dispatcher/AppDispatcher.js';

function updateEvent(event){
  var action = {
      type: 'updateEvent',
      event: event
  };

  dispatcher.dispatch(action);

};

var EventActionCreators = {
  updateEvent: updateEvent
}

export default EventActionCreators;
