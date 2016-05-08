/**
 * Created by lmz on 16/4/12.
 */


joint.keyboard = (function() {

    var chart = joint.chart.chart;
    var graph = joint.chart.graph;
    function init(){
        init_event();
        chart.on("paper:selection_create",function(evt){
            if(this.model.selectionSet.length == 0){
                RED.keyboard.remove(/* backspace */ 8);
            }else{
                RED.keyboard.add(/* backspace */ 8, function () {
                    if($('#chart_ext #linker_text_edit').is(":hidden")){
                        deleteSelection();
                        d3.event.preventDefault();
                    }

                });
            }
        },chart);
    }

    function init_event(){
        RED.keyboard.add(/* a */ 65,{ctrl:true},function(){selectAll();d3.event.preventDefault();});
        RED.keyboard.add(/* = */ 187,{ctrl:true},function(){zoomIn();d3.event.preventDefault();});
        RED.keyboard.add(/* - */ 189,{ctrl:true},function(){zoomOut();d3.event.preventDefault();});
        RED.keyboard.add(/* 0 */ 48,{ctrl:true},function(){zoomZero();d3.event.preventDefault();});
        RED.keyboard.add(/* v */ 86,{ctrl:true},function(){importNodes(clipboard);d3.event.preventDefault();});
    }


    function selectAll(){
        graph.selectAll();
    }

    function zoomIn(){

    }

    function zoomOut(){

    }

    function zoomZero(){

    }

    function importNodes(clipboard){

    }

    function deleteSelection(){
        graph.removeSection();
    }


    return {
        init:init
    }
})();








