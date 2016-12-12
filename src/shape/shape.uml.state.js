/**
 * Created by lmz on 16/3/20.
 */

org.dedu.draw.shape.uml = {
};

/**
 * `StartState`
 * @class
 * @augments org.dedu.draw.shape.simple.Generic
 */
org.dedu.draw.shape.uml.StartState = org.dedu.draw.shape.simple.Generic.extend({
    markup:[
        '<g class="rotatable">',
        '<g class="scalable">',
        '<circle class="uml-start-state-body uml-state-body"/>',
        '</g>',
        '</g>'
    ].join(''),

    defaults: org.dedu.draw.util.deepSupplement({
       type: 'uml.StartState',
       size: { width: 25, height: 25 },
       port_ref_position:{
            portup:{
                'ref-x':0,
                'ref-y':-.5,
            },
            portright:{
                'ref-x':.5,
                'ref-y':0
            },
            portdown:{
                'ref-x':0,
                'ref-y':.5
            },
            portleft:{
                'ref-x':-0.5,
                'ref-y':0
            }                        
       },
       attrs: {
           '.uml-start-state-body': {
               'r': 20,
               'stroke': '#333',
               'fill': '#444'
           }
       },
    }, org.dedu.draw.shape.simple.Generic.prototype.defaults)
});

/**
 * @class
 * @augments org.dedu.draw.shape.simple.Generic
 */
org.dedu.draw.shape.uml.EndState = org.dedu.draw.shape.simple.Generic.extend({
        markup: [
            '<g class="rotatable">',
            '<g class="scalable">',
            '<circle class="uml-end-state-body uml-state-body" />',
            '<circle class="uml-end-state-inner"/>',
            '</g>',
            '</g>'
        ].join(''),
        defaults: org.dedu.draw.util.deepSupplement({
            type: 'uml.EndState',
            size: { width: 25, height: 25 },
            port_ref_position: {
                portup: {
                    'ref-x': 0,
                    'ref-y': -.5,
                },
                portright: {
                    'ref-x': .5,
                    'ref-y': 0
                },
                portdown: {
                    'ref-x': 0,
                    'ref-y': .5
                },
                portleft: {
                    'ref-x': -0.5,
                    'ref-y': 0
                }
            },

            attrs: {
               '.uml-end-state-body': {
                   'r': 20,
                   'stroke': '#333'
               },
                '.uml-end-state-inner': {
                   'r': 10,
                   'stroke': '#333'
               }
            }
       }, org.dedu.draw.shape.simple.Generic.prototype.defaults)
});

/**
 * @class
 * @augments org.dedu.draw.shape.simple.Generic.
 */
org.dedu.draw.shape.uml.State = org.dedu.draw.shape.simple.Generic.extend({
    markup: [
        '<g class="rotatable">',
        '<g class="scalable">',
        '<rect class="uml-state-body"/>',
        '</g>',
        '<path class="uml-state-separator"/>',
        '<text class="uml-state-name"/>',
        '<text class="uml-state-events"/>',
        '</g>'
    ].join(''),

    defaults: org.dedu.draw.util.deepSupplement({

        type: 'uml.State',
        size: { width: 60, height: 40 },

        attrs: {
            '.uml-state-body': {
                'width': 200, 'height': 100, 'rx': 10, 'ry': 10,
                'fill': '#fff9ca', 'stroke': '#333', 'stroke-width': 1
            },
            '.uml-state-name': {
                'ref': '.uml-state-body', 'ref-x': .5, 'ref-y':0, 'text-anchor': 'middle',
                'fill': '#000000', 'font-family': 'Courier New', 'font-size': 12,
                'font-weight':'bold'
            },
            '.uml-state-separator': {
                'stroke': '#333', 'stroke-width': 2
            },
            '.uml-state-events': {
                'ref': '.uml-state-separator', 'ref-x': 5, 'ref-y': 5,
                'fill': '#000000', 'font-family': 'Courier New', 'font-size': 10,
                'display':'block'
            }
        },

        events: [],
        name: 'State'
    }, org.dedu.draw.shape.simple.Generic.prototype.defaults)

});

org.dedu.draw.shape.uml.StateView = org.dedu.draw.shape.simple.GenericView.extend({

    initialize: function (options) {
        if(options.skip_render){
            return;
        }
        org.dedu.draw.shape.simple.GenericView.prototype.initialize.apply(this,arguments);
        this.model.on('change:name', this.updateName,this);
        this.model.on('change:events', this.updateEvents,this);
        this.model.on('change:size', this.updatePath,this);
    },

    render:function(){
        org.dedu.draw.shape.simple.GenericView.prototype.render.apply(this,arguments);
        this.originSize = this.model.get('size');
        this.updateName();
        this.updatePath();
        this.updateEvents();
    },

    updateEvents: function () {
        this.vel.findOne('.uml-state-events').text(this.model.get('events').join('\n'));
        var $text = $(".uml-state-events",this.$el);
        var textBbox = V($text[0]).bbox(true, this.$el);
        var size = this.originSize;
        this.model.set('size',{
            width:size.width,
            height:size.height+textBbox.height
        });
    },

    updateName: function () {
        this.vel.findOne('.uml-state-name').text(this.model.get('name'));
    },

    updatePath: function () {

        var $text = $(".uml-state-name",this.$el);
        var textBbox = V($text[0]).bbox(true, this.$el);

        var d = 'M 0 '+textBbox.height+' L ' + this.model.get('size').width + " "+textBbox.height;

        // We are using `silent: true` here because updatePath() is meant to be called
        // on resize and there's no need to to update the element twice (`change:size`
        // triggers also an update).
        this.vel.findOne('.uml-state-separator').attr('d', d);
    },

    focus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },

    unfocus:function(){
        this.vel.findOne('.uml-state-body').attr({
            fill:"#fff9ca"
        });
        this.hideSuspendPort();
    }
});

org.dedu.draw.shape.uml.StartStateView  = org.dedu.draw.shape.simple.GenericView.extend({

    focus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#444"
        });
        this.hideSuspendPort();
    }

});

org.dedu.draw.shape.uml.EndStateView  = org.dedu.draw.shape.simple.GenericView.extend({
    initialize: function (options) {
        this.circle_index  = 2;
        org.dedu.draw.shape.simple.GenericView.prototype.initialize.apply(this,arguments);
    },
    focus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus:function(){
        this.vel.findOne('.uml-state-body').attr({
            fill:"#fff9ca"
        });
        this.hideSuspendPort();
    }
});