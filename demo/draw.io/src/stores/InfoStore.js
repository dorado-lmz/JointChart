import dispatcher from '../dispatcher/AppDispatcher.js';
import { EventEmitter } from 'events';

var cell = null;
var link = null;

function setCell(_cell){
  cell = _cell;
}
function setLink(_link){
  link = _link;
}

var InfoStore = Object.assign({}, EventEmitter.prototype, {
   addStateSettingsListener: function (callback){
    this.on('cell_change', callback)
  },

   removeStateSettingsListener: function(callback) {
    this.removeListener('cell_change', callback)
  },

  getCell: function(){
    return cell;
  },

  addLinkInfoListener: function(callback) {
    this.on('link_change', callback)
  },
  removeLinkInfoListener: function(callback) {
    this.removeListener('link_change', callback)
  },
  getLink: function(){
    return link;
  }


});

function handleAction(action){
  if(action.type === 'infoOfState'){
    setCell(action.cell);
    InfoStore.emit('cell_change');
  }else if(action.type === 'infoOfLink'){
    setLink(action.link);
    InfoStore.emit('link_change');
  }
}

InfoStore.dispatchToken = dispatcher.register(handleAction);

export default InfoStore;
