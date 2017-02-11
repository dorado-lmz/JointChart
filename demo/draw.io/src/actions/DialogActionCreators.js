import dispatcher from '../dispatcher/AppDispatcher.js';

function settingState(cell){
  var action = {
      type: 'settingState',
      cell: cell
  };

  dispatcher.dispatch(action);

};

var DialogActionCreators = {
  settingState: settingState
}

export default DialogActionCreators;
