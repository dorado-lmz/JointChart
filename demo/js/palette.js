/**
 * Created by lmz on 16/5/4.
 */

joint.palette = (function(){

    var template =
    '<div class="panel-group" id="accordion"><div class="panel panel-default" id="{class}"><div class="panel-heading"><h4 class="panel-title"><a data-toggle="collapse" data-parent="#accordion" href="#{href}"><div id="palette-header-input" class="palette-header"><i class="expanded fa fa-angle-down"></i><span>{title}</span></div></a></h4 ></div><div id="{href}" class="panel-collapse collapse in"><div class="panel-body"></div></div></div></div>';

    var basicElements = {
        'basic':{
                'basic.Rect':{
                    size:{width:31,height:16},
                    position:{x:2,y:10}
                },
                'basic.CRect':{
                    size:{width:31,height:16},
                    position:{x:2,y:10}
                },
                'basic.Circle':{
                    size:{width:20,height:20},
                    position:{x:18,y:18}
                },
                'basic.Ellipse': {
                    size: {width: 31, height: 20},
                    position: {x: 18, y: 18}
                }
            },
        'uml_class':{
            'uml.Class':{
                size:{width:31,height:20},
                position:{x:2,y:10},
            },
            'uml.Abstract':{
                size:{width:31,height:20},
                position:{x:2,y:10},
                attrs:{
                    '.uml-class-name-text': {
                        'ref-y':.5,
                        'font-size': 8,
                        'fill': '#f3f3f3',
                    }
                }
            },
            'uml.Interface':{
                size:{width:31,height:20},
                position:{x:2,y:10},
            }
        },
        'uml_state':{
            'uml.StartState':{
                size:{width:20,height:20},
                position:{x:18,y:18}
            },
            'uml.EndState':{
                size:{width:20,height:20},
                position:{x:18,y:18}
            },
            'uml.State':{
                size:{width:31,height:20},
                position:{x:2,y:10},
                attrs: {
                    '.uml-state-name': {
                        'font-size': 8
                    }
                }
            }
        }
    };

    var paletteSeparator = {};

    function substitute(str,o,regexp){
        return str.replace(regexp || /\\?\{([^{}]+)\}/g, function (match, name) {
            return (o[name] === undefined) ? '' : o[name];
        });
    }

    function drag_palette_separator(){
        $('#palette-separator').draggable({
            axis: "x",
            start: function (event, ui) {
                paletteSeparator.start = ui.position.left;
                paletteSeparator.chartLeft = $("#workspace").offset().left;
                paletteSeparator.width = $("#palette").width();
            },
            drag: function(event,ui) {
                var d = ui.position.left-paletteSeparator.start;
                var newPaletteWidth = paletteSeparator.width+d;

                var newChartLeft = paletteSeparator.chartLeft+d;
                $("#workspace").css("left",newChartLeft);
                $("#palette").width(newPaletteWidth);
            },
            stop:function(event,ui) {
                $("#palette-separator").css("right","auto");
                $("#palette-separator").css("left",($("#palette").width()+2)+"px");
            }
        });
    }

    function init(){
        drag_palette_separator();
        _.each(basicElements,function(category,category_name){
            var selector = '#'+category_name+" .panel-body";
            var str = substitute(template,{class:category_name,title:category_name,href:'collapse'+category_name});
            $('#palette-container').append($(str));
            _.each(category, function (element,key) {
                $(selector).append(getPaleteeSvg(category_name,key,element));
            });
        });
        $('.geItem').draggable({
            helper: 'clone',
            appendTo: 'body',
            revert: true,
            revertDuration: 50
        });
    }

    return {
        init:init,
        //getConfigByType:getConfigByType
    }

})();