/**
 * Created by lmz on 16/5/4.
 */

joint.chart = (function(){




    $('#chart_ext #linker_text_edit').autoTextarea({
        maxHeight:220
    });

    var basicElements = {
        'basic':{
            'basic.Rect':{

            },
            'basic.CRect':{

            },
            'basic.Circle':{

            },
            'basic.Ellipse': {

            }
        },
        'uml_class':{
            'uml.Class':{
                name:'class',
                attributes:'sdf'
            },
            'uml.Abstract':{
                attrs:{
                    '.uml-class-name-text': {
                        'ref-y': 0.5,
                        'font-size': 8,
                        'fill': '#f3f3f3',
                    }
                }
            },
            'uml.Interface':{

            }
        },
        'uml_state':{
            'uml.StartState':{

            },
            'uml.EndState':{

            },
            'uml.State':{

            }
        }
    };

    function getConfigByType(category,node_type){
        return basicElements[category][node_type];
    }

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
    function chart_drop(){
        $('#chart').droppable({
            accept:'.geItem',
            drop:function(event,ui){
                var node_type = ui.draggable[0].type;
                var category = ui.draggable[0].category;
                d3.event = event;
                var mousePos = d3.touches(this)[0]||d3.mouse(this);

                var namespaceClass = org.dedu.draw.util.getByPath(chart.options.cellViewNamespace, node_type, ".");
                var cell = new namespaceClass(_.merge(getConfigByType(category,node_type),{
                    position:{
                        x:mousePos[0],
                        y:mousePos[1]
                    }
                }));
                graph.addCell(cell);

            }
        });
    }

    function init_event(){
        chart.on('cell:pointerdblclick',function(cellView,event,x,y){
            if(cellView instanceof org.dedu.draw.shape.uml.StateView){
                var event = prompt("please input event",'');
                if (event!=null && event!=""){
                    var events = cellView.model.get('events');
                    events.push(event);
                    cellView.model.trigger('change:events');
                }
            }
            if(cellView instanceof org.dedu.draw.LinkView){
                cellView.hideLabels();
                $('#chart_ext #linker_text_edit').css({
                    left:x,
                    top:y,
                    display:'block'
                });
                chart.on('blank_pointDown', function () {
                    var val = $('#chart_ext #linker_text_edit').val();
                    if(val.length!=0){
                        cellView.model.set('labels',[{
                            position: {distance:.5},
                            attrs:{text: { text: val }}
                        }]);
                    }else{
                        cellView.model.set('labels',null);
                    }
                    $('#chart_ext #linker_text_edit').hide();
                    cellView.showLabel();
                    chart.off('blank_pointDown');
                });
            }
        },chart);

    }

    function init(){
        chart_drop();
        init_event();
    }

    return {
        init:init,
        chart:chart,
        graph:graph
    }
})();

