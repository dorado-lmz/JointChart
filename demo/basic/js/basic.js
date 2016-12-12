



var graph = new org.dedu.draw.Graph;

var chart = new org.dedu.draw.Chart({
    el: $('#chart'),
    width: 5000,
    height: 5000,
    tabindex:1,
    gridSize: 1,
    model:graph,
    style: {

    }
});

var json = '{"id":"30127b7.fcfed84","x":29,"y":187,"w":140,"z":"210d0848.def2f8","type":"inject","_def":{"category":"input","label":"sdfasfadsf","color":"#a6bbcf","defaults":{"name":{"value":""},"topic":{"value":""},"payload":{"value":""},"payloadType":{"value":"date"},"repeat":{"value":""},"crontab":{"value":""},"once":{"value":false}},"inputs":0,"outputs":1,"icon":"inject.png","button":{},"set":{"id":"node-red/inject","name":"inject","types":["inject"],"enabled":true,"module":"node-red","version":"0.11.2-git","added":true}},"inputs":0,"outputs":1,"name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"changed":true,"h":30}';
var data = JSON.parse(json);
var halo;

// chart.on('cell:pointerdown',function(cellView){
//    if (cellView.model instanceof org.dedu.draw.Link) return;
//    if(cellView.model.get('selected') && cellView.model.previous('selected') === false){
//        if(!halo){

//            halo = new org.dedu.draw.plugins.Halo({cellView:cellView});
//        }

//        halo.render({cellView:cellView});
//    }

// });


var rb = new org.dedu.draw.shape.basic.Rect({
    position: { x: 350, y: 50 },
    size: { width: 50, height: 30 },
    attrs: { text: { text: 'basic.Rect' } }
});
graph.addCell(rb);


var m1 = new org.dedu.draw.shape.node.Model({
    position: { x: data.x, y: data.y },
    size: { width: 120, height: 30 },
    attrs: {

    },
    data:data

});
graph.addCell(m1);


var m2 = new org.dedu.draw.shape.devs.Model({
    position: { x: 50, y: 50 },
    size: { width: 50, height: 40 },
    inPorts: ['in1','in2'],
    outPorts: ['out'],
    attrs: {
        '.label': { text: 'Model', 'ref-x': .4, 'ref-y': .2 },
        rect: { fill: '#2ECC71' },
        '.inPorts circle': { fill: '#16A085', magnet: 'passive', type: 'input' },
        '.outPorts circle': { fill: '#E74C3C', type: 'output' }
    }
});
graph.addCell(m2);


var m3 = new org.dedu.draw.shape.devs.Model({
    position: { x: 35, y: 15 },
    size: { width: 50, height: 40 },
    inPorts: ['in1','in2'],
    outPorts: ['out'],
    attrs: {
        '.label': { text: 'Model', 'ref-x': .4, 'ref-y': .2 },
        rect: { fill: '#2ECC71' },
        '.inPorts circle': { fill: '#16A085', magnet: 'passive', type: 'input' },
        '.outPorts circle': { fill: '#E74C3C', type: 'output' }
    }
});
graph.addCell(m3);

var state1 = new org.dedu.draw.shape.uml.State({
    position: { x: 150, y: 150 },
    size: { width: 55, height: 30 },
    events:['enter','exit'],
})

graph.addCell(state1);

var start_state = new org.dedu.draw.shape.uml.StartState({
    position: { x: 250, y: 150 },
    size: { width: 30, height: 30 },
});

graph.addCell(start_state);

var end_state = new org.dedu.draw.shape.uml.EndState({
    position: { x: 100, y: 150 },
    size: { width: 30, height: 30 },
});

graph.addCell(end_state);

var simple = new org.dedu.draw.shape.simple.Generic({
    position: { x: 50, y: 150 },
    size: { width: 40, height: 20 },
})

graph.addCell(simple);

var simple2 = new org.dedu.draw.shape.simple.Generic({
    position: { x: 350, y: 350 },
    size: { width: 30, height: 30 },
})

graph.addCell(simple2);

var link6 = new org.dedu.draw.Link({

    source: { id: m1.id },
    target: { id: m2.id },
    labels: [
        { position: {distance:.5}, attrs: { text: { text: 'event1[condition1]/action1' } }},
        // { position: { distance: .5, offset: { x: 20, y: 0 } }, attrs: { text: { text: 'Foo', fill: 'white', 'font-family': 'sans-serif' }, rect: { stroke: '#F39C12', 'stroke-width': 20, rx: 5, ry: 5 } }},
        // { position: -10, attrs: { text: { text: '*' } }}
    ],
    attrs: {
        '.marker-target': {
            d: 'M 10 0 L 0 5 L 10 10 z'
        }
    }
});
graph.addCell(link6);

var subflowport = new org.dedu.draw.shape.node_red.subflowportModel({
    position: { x: 120, y: 350 },
    outputs:[1],
    inputs:['i1'],
    index:2
});

graph.addCell(subflowport);




//var link1 = new org.dedu.draw.Link({
//    source:{id:m1.id},
//    target:{id:m2.id}
//});
//graph.addCell(link1);


//
//var l1 = new org.dedu.draw.Link();
//graph.addCell(l1);
//l1.set('vertices',[{x:300,y:60},{x:400,y:60}]);
