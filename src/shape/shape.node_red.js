/**
 * Created by lmz on 16/5/8.
 */
dedu.shape.node_red = {};
/**
 * `subflowportModel` for node-red
 * @class
 * @augments dedu.shape.devs.Model.
 */
dedu.shape.node_red.subflowportModel = dedu.shape.devs.Model.extend({
    defaults:dedu.util.deepSupplement({
        markup: '<g class="rotatable"><g class="scalable"><rect class="body"/></g><g class="inPorts"/><g class="outPorts"/><text class="port_label small_label"/><text class="port_label port_index"/></g>',
        type:'node_red.subflowportModel',
        size:{
            width:40,
            height:40
        },
        attrs:{
            'rect.body':{
                rx:'8',
                ry:'8',
                'stroke-dasharray': '5,5',
                fill: '#eee',
                stroke: '#999'
            },
            'text.small_label':{
                'stroke-width': 0,
                fill: '#888',
                style:{'font-size': 10},
                'alignment-baseline': 'middle',
                'text-anchor': 'middle',
                ref: '.body',
                'ref-x': 20, 'ref-y':8,
                text:'output'
            },
            'text.port_index':{
                ref: '.body',
                'ref-x': 20, 'ref-y':18,
                'text':1
            }

        }
    },dedu.shape.devs.Model.prototype.defaults),
    initialize: function (options) {
        this.set("outPorts", options.outputs);
        this.set("inPorts", options.inputs);
        this.get('attrs')['text.port_index'].text = options.index;
        dedu.shape.devs.Model.prototype.initialize.apply(this,arguments);
    }

});

dedu.shape.node_red.subflowportModelView = dedu.shape.devs.ModelView.extend({

    renderView: function () {

    }
});