org.dedu.draw.shape.node = {};
/**
 * @class
 * @augments org.dedu.draw.shape.devs.Model
 */
org.dedu.draw.shape.node.Model = org.dedu.draw.shape.devs.Model.extend({
    defaults:org.dedu.draw.util.deepSupplement({
        markup: '<g class="rotatable"><g class="scalable"><g class="body nodegroup"/></g><text class="label"/><g class="inPorts"/><g class="outPorts"/></g>',
        type:'node.Model',
        size:{
            width:120,
            height:28
        },
        attrs:{
            'rect.node': {'width': 140, height: 30},
            '.port-body': {
                r: 4,
                magnet: true,
                stroke: '#000000'
            },
            'rect.node_button_button_shadow':{'width': 32, height: 26},
            'rect.node_button_button':{'width': 16, height: 18},
            '.label': {'ref-x':.5, 'ref-y':.3, ref: '.node', 'text-anchor': 'middle', fill: '#000',style:{'font-weight':'normal'}},
        }

    },org.dedu.draw.shape.devs.Model.prototype.defaults),
    initialize: function () {
        this.data = this.get('data');
        var outputs = [];
        var inputs = [];
        for (var i = 0; i < this.data.outputs; i++) {
            outputs[i] = 'out' + i;
        }
        for (i = 0; i < this.data.inputs; i++) {
            inputs[i] = 'in' + i;
        }
        this.set("outPorts", outputs);
        this.set("inPorts", inputs);
        this.attr(".label/text", this.data.type);
        org.dedu.draw.shape.devs.Model.prototype.initialize.apply(this,arguments);
    }
});

/**
 * @class
 * @augments org.dedu.draw.shape.devs.ModelView
 */
org.dedu.draw.shape.node.ModelView = org.dedu.draw.shape.devs.ModelView.extend({

    options:{},

    renderView: function () {

        var nodegroup = this.vel.findOne('.nodegroup');

        //获取绑定数据
        var data = this.model.data;
        var size = this.model.get('size');

        var allAttrs = this.model.get('attrs');
        var l = data._def.label;
        l = (typeof l === "function" ? l.call(data) : l)||"";
        allAttrs['.label'].text = l;

        //判断节点是否需要按钮
        if (data._def.button) {
            var nodeButtonGroup = V('g');
            nodegroup.append(nodeButtonGroup);
            nodeButtonGroup.attr("transform", function () {
                    return "translate(" + ((data._def.align == "right") ? 94 : -25) + ",2)";
                })
                .attr("class", function () {
                    return "node_button " + ((data._def.align == "right") ? "node_right_button" : "node_left_button");
                });
            nodeButtonGroup.append(V('rect')
                .attr("class", "node_button_button_shadow")
                .attr("rx", 5)
                .attr("ry", 5)
                .attr("fill", "#eee"));//function() { return d._def.color;}

            nodeButtonGroup.append(V('rect')
                .attr("class", "node_button_button")
                .attr("x",function () {
                    return data._def.align == "right" ? 11 : 5
                })
                .attr("y", 4)
                .attr("rx", 4)
                .attr("ry", 4)
                .attr("fill",function () {
                    return data._def.color;
                })
                .attr("cursor", "pointer"));
        }
        //var mainRect
        nodegroup.append(V('rect')
            .attr("class", "node")
            .toggleClass ("node_unknown", function () {
                return data.type == "unknown";
            })
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", function () {
                return data._def.color;
            })
            .attr('width',size.width)
            .attr('height',size.height));

        if (data._def.icon) {
            var icon_group = V('g')
                .attr("class", "node_icon_group")
                .attr("x", 0).attr("y", 0);
            nodegroup.append(icon_group);


            var icon_shade = V('rect')
                .attr("x", 0).attr("y", 0)
                .attr("class", "node_icon_shade")
                .attr("width", "30")
                .attr("stroke", "none")
                .attr("fill", "#000")
                .attr("fill-opacity", "0.05")
                .attr("height", function () {
                    return Math.min(50, size.height);
                });
            icon_group.append(icon_shade);

            var icon = V('image')
                .attr("xlink:href", "icons/" + data._def.icon)
                .attr("class", "node_icon")
                .attr("x", 0)
                .attr("width", "30")
                .attr("height", "30");
            icon_group.append(icon);

            var icon_shade_border = V('path')
                .attr("d", function () {
                    return "M 30 1 l 0 " + (size.height - 2)
                })
                .attr("class", "node_icon_shade_border")
                .attr("stroke-opacity", "0.1")
                .attr("stroke", "#000")
                .attr("stroke-width", "1");
            icon_group.append(icon_shade_border);


            if ("right" == data._def.align) {
                icon_group.attr('class', 'node_icon_group node_icon_group_' + data._def.align);
                icon_shade_border.attr("d", function () {
                    return "M 0 1 l 0 " + (size.height - 2)
                });
                //icon.attr('class','node_icon node_icon_'+d._def.align);
                //icon.attr('class','node_icon_shade node_icon_shade_'+d._def.align);
                //icon.attr('class','node_icon_shade_border node_icon_shade_border_'+d._def.align);
            }

            var img = new Image();
            img.src = "icons/" + data._def.icon;
            img.onload = function () {
                icon.attr("width", Math.min(img.width, 30));
                icon.attr("height", Math.min(img.height, 30));
                icon.attr("x", 15 - Math.min(img.width, 30) / 2);
                //if ("right" == d._def.align) {
                //    icon.attr("x",function(){return d.w-img.width-1-(d.outputs>0?5:0);});
                //    icon_shade.attr("x",function(){return d.w-30});
                //    icon_shade_border.attr("d",function(){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2);});
                //}
            }

            //icon.style("pointer-events","none");
            icon_group.attr("pointer-events", "none");
        }

        return this;
    },

    focus: function () {

        this.vel.findOne('.node').addClass('selected');
    },
    unfocus:function(){

        this.vel.findOne('.node').removeClass('selected');
    }
});