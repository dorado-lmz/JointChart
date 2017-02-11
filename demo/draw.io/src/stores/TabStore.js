import dispatcher from '../dispatcher/AppDispatcher.js';
import { EventEmitter } from 'events';

var cell = null;
var regionName = "";

function setCell(_cell,_regionName){
  cell = _cell;
  regionName = _regionName;
}

var TabStore = Object.assign({}, EventEmitter.prototype, {
   addStateSettingsListener: function (callback){
    this.on('change', callback)
  },

   removeStateSettingsListener: function(callback) {
    this.removeListener('change', callback)
  },

   getConfig: function(){
    return {
      cell: cell,
      regionName: regionName
    };
  }


});

function handleAction(action){
  if(action.type === 'newTab'){
    setCell(action.cell,action.regionName);
    TabStore.emit('change');
  }
}

TabStore.dispatchToken = dispatcher.register(handleAction);

export default TabStore;

