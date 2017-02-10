/**
 * Created by lmz on 16/3/20.
 */

dedu.shape.uml = {
};

/**
 * `StartState`
 * @class
 * @augments dedu.shape.simple.Generic
 */
dedu.shape.uml.StartState = dedu.shape.simple.Generic.extend({
    markup:[
        '<g class="rotatable">',
        '<g class="scalable">',
        '<circle class="uml-start-state-body uml-state-body"/>',
        '</g>',
        '</g>'
    ].join(''),

    defaults: dedu.util.deepSupplement({
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
    }, dedu.shape.simple.Generic.prototype.defaults)
});

/**
 * @class
 * @augments dedu.shape.simple.Generic
 */
dedu.shape.uml.EndState = dedu.shape.simple.Generic.extend({
        markup: [
            '<g class="rotatable">',
            '<g class="scalable">',
            '<circle class="uml-end-state-body uml-state-body" />',
            '<circle class="uml-end-state-inner"/>',
            '</g>',
            '</g>'
        ].join(''),
        defaults: dedu.util.deepSupplement({
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
       }, dedu.shape.simple.Generic.prototype.defaults)
});

dedu.shape.uml.Choise = dedu.shape.simple.Generic.extend({
  markup: [
        '<g class="rotatable">',
        '<g class="scalable">',
        '<polyline points="50,0,0,50,50,100,100,50,50,0"></polyline>',
        '</g>',
        '</g>'
  ].join(''),

  defaults: dedu.util.deepSupplement({

    type: 'uml.Choise',
    size: {width: 40, height:40},
    attrs: {
      'polyline': {
        'stroke': '#333',
        'stroke-width': 2
      }
    }
  }, dedu.shape.simple.Generic.prototype.defaults)
});

dedu.shape.uml.DeepHistory =  dedu.shape.simple.Generic.extend({
  markup: [
    '<g class="rotatable">',
    '<g class="scalable">',
    '<circle class="uml-deep-history-body uml-history-body"/>',
    '<path class="h" d="M-10,-15l0,30l0,-15l20,0l0,-15l0,30" stroke="#000000" fill="none"></path>',
    '</g>',
    '</g>'
  ].join(''),

  defaults: dedu.util.deepSupplement({
    type: 'uml.DeepHistory',
    size: {width: 40, height: 40},
    attrs: {
      ".uml-deep-history-body": {
          'r': 40,
          'stroke': '#333'
      }
    }
  }, dedu.shape.simple.Generic.prototype.defaults)
  });

dedu.shape.uml.ShadowHistory = dedu.shape.simple.Generic.extend({
  markup: [
    '<g class="rotatable">',
    '<g class="scalable">',
    '<circle class="uml-deep-history-body uml-history-body"/>',
    '<path class="h" d="M-10,-15l0,30l0,-15l20,0l0,-15l0,30" stroke="#000000" fill="none"></path>',
    '<text id="star">*</text>',
    '</g>',
    '</g>'
  ].join(''),
  defaults: dedu.util.deepSupplement({
    type: 'uml.ShadowHistory',
    attrs: {
      "#star": {
        "x": 13,
        "y": 25,
        "fill": '#333',
        "font-size": '48'
      }
    }
  }, dedu.shape.uml.DeepHistory.prototype.defaults)
})

/**
 * @class
 * @augments dedu.shape.simple.Generic.
 */
dedu.shape.uml.State = dedu.shape.simple.Generic.extend({
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

    defaults: dedu.util.deepSupplement({

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
    }, dedu.shape.simple.Generic.prototype.defaults)

});

dedu.shape.uml.StateView = dedu.shape.simple.GenericView.extend({

    initialize: function (options) {
        if(options.skip_render){
            return;
        }
        dedu.shape.simple.GenericView.prototype.initialize.apply(this,arguments);
        this.model.on('change:name', this.updateName,this);
        this.model.on('change:events', this.updateEvents,this);
        this.model.on('change:size', this.updatePath,this);
    },

    render:function(){
        dedu.shape.simple.GenericView.prototype.render.apply(this,arguments);
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

dedu.shape.uml.StartStateView  = dedu.shape.simple.GenericView.extend({

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

dedu.shape.uml.EndStateView  = dedu.shape.simple.GenericView.extend({
    initialize: function (options) {
        this.circle_index  = 2;
        dedu.shape.simple.GenericView.prototype.initialize.apply(this,arguments);
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
