import dispatcher from '../dispatcher/AppDispatcher.js';

function newTab(config){
  var action = {
      type: 'newTab',
      cell: config.cell,
      regionName: config.regionName
  };

  dispatcher.dispatch(action);

};

var TabActionCreators = {
  newTab: newTab
}

export default TabActionCreators;
