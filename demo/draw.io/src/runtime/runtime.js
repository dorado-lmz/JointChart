
var flow = {
  states:{
    "machineName.operate.on":{
      id: "",
      type:"",//start,end,state,composite state,
      name:"on",
      qualifiedName: "machineName.operate.on",
      onEntry:"",
      onExit:""
    }
  },

  transitions:{
    whens:[],  //条件
    actions:[], //动作
    src: "",
    end: "",
  }
};

var statements = '', PseudoStateMap = {
    'uml.StartState': StateJS.PseudoStateKind.Initial,
    'uml.EndState': StateJS.PseudoStateKind.Terminate,
    'uml.ShallowHistory': StateJS.PseudoStateKind.ShallowHistory,
    'uml.DeepHistory': StateJS.PseudoStateKind.DeepHistory,
};


export function parseFlow(flow) {
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
            name: transition.name,
            from: flat_states[transition.src].name,
            to: flat_states[transition.target].name
        },
        callback = {
            when:transition.events
        };
        _events.push(event);
        // _callback.push(callback);
    }

    create({
        states: _state_machine,
        events: _events,
        callbacks: _callback
    });
}

function parseCell(state){
    if (PseudoStateMap[state.type]){
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

function create(cfg) {
    var states = cfg.states || [];
    var events = cfg.events || [];
    var callbacks = cfg.callbacks || {};

    var model = new StateJS.StateMachine("model");

    parseStateList(states, "model");
    parseTransitions(events, callbacks);
    console.log(statements);
    statements += 'var instance = new StateJS.StateMachineInstance("p3pp3r");StateJS.initialise(model, instance);';
    eval(statements);

}

function parseStateList(array_state, parent) {

    for (var index in array_state) {
        parseState(array_state[index], parent);
    }
}

function parseState(state, parent) {
    if (state.kind != undefined) {
        if (StateJS.PseudoStateKind.Initial === state.kind) {
            concat("var " + state.name + " = new StateJS.PseudoState('" + state.name + "', " + parent + ", StateJS.PseudoStateKind.Initial);");
        } else {

        }
    } else {
        concat("var " + state.name + " = new StateJS.State('" + state.name + "', " + parent + ");");

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
        var callback = callbacks[item.name];
        if (callback) {
            let statement = item.from + ".to(" + item.to + ")";
            if (callback.when) {
                for (let when_item of callback.when) {
                    statement += ".when(" + when_item + ")"
                }
                concat(statement);
            }
        } else {
            concat(item.from + ".to(" + item.to + ");");
        }
    }
}

function concat(statement: string) {
    statements += statement + "\n";
}



