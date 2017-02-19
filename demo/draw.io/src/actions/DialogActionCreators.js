import dispatcher from '../dispatcher/AppDispatcher.js';

function settingState(cell){
  var action = {
      type: 'settingState',
      cell: cell
  };

  dispatcher.dispatch(action);
};

function settingEvent(event) {
  var action = {
    type: 'settingEvent',
    event: event
  };

  dispatcher.dispatch(action);
}

function infoOfState(cell){
  var action = {
      type: 'infoOfState',
      cell: cell
  };

  dispatcher.dispatch(action);
};

function infoOfLink(cell){
  var action = {
      type: 'infoOfLink',
      link: cell
  };

  dispatcher.dispatch(action);
};



var DialogActionCreators = {
  settingState: settingState,
  infoOfState: infoOfState,
  infoOfLink: infoOfLink,
  settingEvent: settingEvent
}

export default DialogActionCreators;
