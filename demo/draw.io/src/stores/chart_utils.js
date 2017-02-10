let mappings = {
  'uml_state':{
    'state-start': 'uml.StartState',
    'state-end': 'uml.EndState',
    'state': 'uml.State'
  }
}

export function getConfigByType(category, node_type){
  return mappings[category][node_type];
}

export function parseFlow(flow){

}
