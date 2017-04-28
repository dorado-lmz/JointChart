import StateJS from 'StateJS';
var statements = '', PseudoStateMap = {
    'uml.StartState': StateJS.PseudoStateKind.Initial,
    'uml.EndState': StateJS.PseudoStateKind.Terminate,
    'uml.Choice': StateJS.PseudoStateKind.Choice,
    'uml.ShallowHistory': StateJS.PseudoStateKind.ShallowHistory,
    'uml.DeepHistory': StateJS.PseudoStateKind.DeepHistory,
};

var _graph;
export function parseFlow(flow,graph) {
  if(graph){
    _graph = graph;
  }
  statements = '';
    var flat_states = flow.flat_states, transitions = flow.transitions,
        state_machine = flow.state_machine,_events=[],_callback={},_state_machine = [];
    for (var id in state_machine) {
        var state = state_machine[id];
        parseCell(state);
        _state_machine.push(state);
    }
    for(var id in transitions){
        var transition = transitions[id],
        event = {
            id: transition.id,
            from: flat_states[transition.src].name,
            to: flat_states[transition.target].name
        },callback;

        if(transition.events){
          callback = {
              when:transition.events,
              _callback: transition.actions
          }
          _callback[transition.id] = callback;
        }
        _events.push(event);
    }

    create({
        states: _state_machine,
        events: _events,
        callbacks: _callback
    });
}

function parseCell(state){
    if (PseudoStateMap[state.type] !== void 0){
        state.kind = PseudoStateMap[state.type];
    }else if(state.regions){
        for(var name in state.regions){
          var region = state.regions[name];
          for(var subState in region){
            parseCell(region[subState]);
          }
        }
    }
}
var model ;
var instance ;
StateJS.setConsole(console);
function create(cfg) {
    var states = cfg.states || [];
    var events = cfg.events || [];
    var callbacks = cfg.callbacks || {};
    model = new StateJS.StateMachine("model");
    parseStateList(states, "model");
    parseTransitions(events, callbacks);
    console.log(statements);
    instance = new StateJS.StateMachineInstance(dedu.util.randomString(5));
    instance.graph = _graph||{};
    statements += 'StateJS.initialise(model, instance);';
    eval(statements);
    triggerEvent.bind({
      model: model,
      instance: instance
    })
}

export function triggerEvent(eventName){
  StateJS.evaluate(model,instance,eventName);
}

function parseStateList(array_state, parent) {

    for (var index in array_state) {
        parseState(array_state[index], parent);
    }
}

function parseState(state, parent) {
    if (state.kind !== undefined) {
        if (StateJS.PseudoStateKind.Initial === state.kind) {
            concat("var " + state.name + " = new StateJS.PseudoState('" + state.name + "', " + parent + ", StateJS.PseudoStateKind.Initial);");
        } else if(StateJS.PseudoStateKind.Choice === state.kind){
            concat("var " + state.name + " = new StateJS.PseudoState('" + state.name + "', " + parent + ", StateJS.PseudoStateKind.Choise);");
        }else if(StateJS.PseudoStateKind.ShallowHistory === state.kind){
            concat("var " + state.name + " = new StateJS.PseudoState('" + state.name + "', " + parent + ", StateJS.PseudoStateKind.ShallowHistory);");
        }else if(StateJS.PseudoStateKind.DeepHistory === state.kind){
            concat("var " + state.name + " = new StateJS.PseudoState('" + state.name + "', " + parent + ", StateJS.PseudoStateKind.DeepHistory);");
        }
    } else {
        concat(`var ${state.name} = new StateJS.State('${state.name}', ${parent}).entry(function(){
          ${state.onEnter || ''}
        }).exit(function(){
          ${state.onExit || ''}
        });`);
    }
    if (state.regions) {
        parseRegions(state.regions, state.name);
    }
}

function parseRegions(regions, state_name) {
    for (var pro in regions) {
        concat("var " + pro + " = new StateJS.Region('" + pro + "', " + state_name + ");");
        parseStateList(regions[pro], pro);
    }
}

function parseTransitions(events, callbacks) {
    for (let item of events) {
        var callback = callbacks[item.id];
        if (callback) {
            let statement = `${item.from}.to(${item.to}).setAttribute({
              chart_id: '${item.id}'
            })`;
            if (callback.when) {
                for (let when_item of callback.when) {
                    statement += `.when(
                      function(message){
                          return message === '${when_item}' ;
                      }).effect(function(message, instance){
                          console.warn(this.chart_id);
                          instance.graph.trigger('process_transition',{id:this.chart_id})
                      })`;
                }

            }
            if(callback._callback){
                for (let callback_item of callback._callback) {
                  statement += `.effect(function(message, instance){
                    ${parseAction(callback_item)}
                  })
                  `;
                }
            }
            concat(statement);
        } else {
            concat(item.from + ".to(" + item.to + ");");
        }
    }
}

function parseAction(actionName) {
  var res;
  switch(actionName){
    case 'delay1':
      res = 'setTimeout(function(){console.log("asdf")},1000);';
  }
  return res;
}

function concat(statement: string) {
    statements += statement + "\n";
}



