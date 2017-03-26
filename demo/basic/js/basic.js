requirejs.config({
  baseUrl: '../../',
  paths: {
    jquery: 'vendor/jquery/dist/jquery',
    snap: 'vendor/Snap.svg/dist/snap.svg',
    underscore: 'vendor/underscore/underscore',
    backbone: 'vendor/backbone/backbone',
    g: 'src/geometry',
    src: 'src'
  },
  shim: {
    V: {
      exports: 'V'
    },
    g:{
      exports: 'g'
    }
  }
});

require(["joint_chart"],function (dedu) {
  var graph = new dedu.Graph;
  var chart = new dedu.Chart({
    el: $('#chart'),
    width: 5000,
    height: 5000,
    tabindex: 1,
    gridSize: 1,
    model: graph,
    style: {

    }
  });
  var rb = new dedu.shape.basic.Rect({
    position: {
      x: 350,
      y: 50
    },
    size: {
      width: 150,
      height: 30
    },
    attrs: {
      text: {
        text: 'basic.Rect'
      }
    }
  });
  graph.addCell(rb);
  // var m2 = new dedu.shape.devs.Model({
  //   position: {
  //     x: 50,
  //     y: 50
  //   },
  //   size: {
  //     width: 50,
  //     height: 40
  //   },
  //   inPorts: ['in1', 'in2'],
  //   outPorts: ['out'],
  //   attrs: {
  //     '.label': {
  //       text: 'Model',
  //       'ref-x': .4,
  //       'ref-y': .2
  //     },
  //     rect: {
  //       fill: '#2ECC71'
  //     },
  //     '.inPorts circle': {
  //       fill: '#16A085',
  //       magnet: 'passive',
  //       type: 'input'
  //     },
  //     '.outPorts circle': {
  //       fill: '#E74C3C',
  //       type: 'output'
  //     }
  //   }
  // });
  // graph.addCell(m2);


  // var m3 = new dedu.shape.devs.Model({
  //   position: {
  //     x: 35,
  //     y: 15
  //   },
  //   size: {
  //     width: 50,
  //     height: 40
  //   },
  //   inPorts: ['in1', 'in2'],
  //   outPorts: ['out'],
  //   attrs: {
  //     '.label': {
  //       text: 'Model',
  //       'ref-x': .4,
  //       'ref-y': .2
  //     },
  //     rect: {
  //       fill: '#2ECC71'
  //     },
  //     '.inPorts circle': {
  //       fill: '#16A085',
  //       magnet: 'passive',
  //       type: 'input'
  //     },
  //     '.outPorts circle': {
  //       fill: '#E74C3C',
  //       type: 'output'
  //     }
  //   }
  // });
  // graph.addCell(m3);

  var state1 = new dedu.shape.uml.State({
    position: {
      x: 150,
      y: 150
    },
    size: {
      width: 55,
      height: 30
    },
    events: ['enter', 'exit'],
  })

  graph.addCell(state1);

  var start_state = new dedu.shape.uml.StartState({
    position: {
      x: 250,
      y: 150
    },
    size: {
      width: 30,
      height: 30
    },
  });

  graph.addCell(start_state);

  var choise = new dedu.shape.uml.Choice({
    position: {
      x: 250,
      y: 350
    },
    size: {
      width: 50,
      height: 50
    },
  });

  graph.addCell(choise);



  var end_state = new dedu.shape.uml.EndState({
    position: {
      x: 100,
      y: 150
    },
    size: {
      width: 30,
      height: 30
    },
  });

  graph.addCell(end_state);

  var history1 = new dedu.shape.uml.DeepHistory({
    position: {
      x: 300,
      y: 200
    },
    size: {
      width: 30,
      height: 30
    },
  })
  graph.addCell(history1);

  var history2 = new dedu.shape.uml.ShadowHistory({
    position: {
      x: 300,
      y: 230
    },
    size: {
      width: 30,
      height: 30
    },
  })
  graph.addCell(history2);

  var simple = new dedu.shape.simple.Generic({
    position: {
      x: 50,
      y: 150
    },
    size: {
      width: 40,
      height: 20
    },
  })

  graph.addCell(simple);

  var simple2 = new dedu.shape.simple.Generic({
    position: {
      x: 350,
      y: 350
    },
    size: {
      width: 30,
      height: 30
    },
  });



  graph.addCell(simple2);
});


// chart.on('cell:pointerdown',function(cellView){
//    if (cellView.model instanceof dedu.Link) return;
//    if(cellView.model.get('selected') && cellView.model.previous('selected') === false){
//        if(!halo){

//            halo = new dedu.plugins.Halo({cellView:cellView});
//        }

//        halo.render({cellView:cellView});
//    }

// });





// var m1 = new dedu.shape.node.Model({
//     position: { x: data.x, y: data.y },
//     size: { width: 120, height: 30 },
//     attrs: {

//     },
//     data:data

// });
// graph.addCell(m1);




// var link6 = new dedu.Link({

//     source: { id: m1.id },
//     target: { id: m2.id },
//     labels: [
//         { position: {distance:.5}, attrs: { text: { text: 'event1[condition1]/action1' } }},
//         // { position: { distance: .5, offset: { x: 20, y: 0 } }, attrs: { text: { text: 'Foo', fill: 'white', 'font-family': 'sans-serif' }, rect: { stroke: '#F39C12', 'stroke-width': 20, rx: 5, ry: 5 } }},
//         // { position: -10, attrs: { text: { text: '*' } }}
//     ],
//     attrs: {
//         '.marker-target': {
//             d: 'M 10 0 L 0 5 L 10 10 z'
//         }
//     }
// });
// graph.addCell(link6);

// var subflowport = new dedu.shape.node_red.subflowportModel({
//   position: {
//     x: 120,
//     y: 350
//   },
//   outputs: [1],
//   inputs: ['i1'],
//   index: 2
// });

// graph.addCell(subflowport);


// graph.layout();

//var link1 = new dedu.Link({
//    source:{id:m1.id},
//    target:{id:m2.id}
//});
//graph.addCell(link1);


//
//var l1 = new dedu.Link();
//graph.addCell(l1);
//l1.set('vertices',[{x:300,y:60},{x:400,y:60}]);
