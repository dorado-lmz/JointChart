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
               'stroke': 'blue',
               'fill': 'blue'
           }
       },
       name: 'Initial'+dedu.util.randomString(6)
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
            },
            name: 'End'+dedu.util.randomString(6)
       }, dedu.shape.simple.Generic.prototype.defaults)
});

dedu.shape.uml.Choice = dedu.shape.simple.Generic.extend({
  markup: [
        '<g class="rotatable">',
        '<g class="scalable">',
        '<polyline class="uml-choice-body" points="50,0,0,50,50,100,100,50,50,0"></polyline>',
        '</g>',
        '</g>'
  ].join(''),

  defaults: dedu.util.deepSupplement({

    type: 'uml.Choice',
    size: {width: 40, height:40},
    attrs: {
      '.uml-choice-body': {
        'stroke': 'blue',
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
      ".uml-deep-history-body": {
          'r': 40,
          'stroke': 'blue',
          'stroke-width': 2
      },
      ".h": {
        'stroke-width': 2,
        'stroke': 'blue',
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
      "#star": {
        "x": 13,
        "y": 25,
        "fill": 'blue',
        "font-size": '48',
        'stroke-width': 2
      },
      '.h':{
        'stroke': 'blue',
        'stroke-width': 2,
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
        '<rect class="uml-state-body" width="76" height="31" fill="#fff"/>',
        '</g>',
        '<text class="uml-state-name"/>',
        '</g>'
    ].join(''),

    initalHook:function(attrs){
         //验证规则
        if(attrs.name){
            this.set('text',attrs.name)
        }
    },

    compoundUI: function(isCompound,opt){
      var attrs = this.get('attrs'),
          separator = attrs['.uml-state-separator'],
          body = attrs['.uml-state-body'],
          name = attrs['.uml-state-name'];
      if(isCompound){
        if(opt.body){
          body.rx=opt.body.rx;
          body.ry=opt.body.ry
        }else{
          body.rx='4';
          body.ry='4';
        }
        if(opt.name){
          name['ref-y'] = opt.name.dy;
        }
      }else{
        body.rx='15.5';
        body.ry='15.5';
        name['ref-y'] = '.4';
      }
    },

    defaults: dedu.util.deepSupplement({

        type: 'uml.State',
        size: { width: 60, height: 40 },
        update: 0,

        attrs: {
            '.uml-state-body': {
                 'rx': 15.5, 'ry': 15.5,
                'stroke': 'blue', 'stroke-width': 2
            },
            '.uml-state-name': {
                'ref-x': .5, 'ref-y':.4, 'text-anchor': 'middle',
                'fill': '#000000', 'font-family': 'Courier New', 'font-size': 12,
                'font-weight':'bold'
            },
            // '.uml-state-separator': {
            //     'stroke': 'blue', 'stroke-width': 3
            // },
            '.compound-name': {
                'ref': '.uml-state-body', 'ref-x': 3, 'ref-y':3, 'text-anchor': 'start',
                stroke: 'black',fill: 'none','font-size': 12,
            }
            // '.uml-state-events': {
            //     'ref': '.uml-state-separator', 'ref-x': 5, 'ref-y': 5,
            //     'fill': '#000000', 'font-family': 'Courier New', 'font-size': 10,
            //     'display':'block',hidden:true
            // }
        },

        events: [],
        name: 'State'+dedu.util.randomString(6)
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
        this.listenTo(this.model, 'change:update', this.update);
    },

    renderCompartment: function(compartment, debugContainer, yDivider){
      var that = this;
      _.each(compartment.lines,function(text, i){
         debugContainer.append(V('text').attr({
          class: 'compound-name'
         }));
      });

      var regionContainer = V('g').attr({
        class:'regions',
        transform: 'translate(0,'+yDivider+')'}),hasCells = false;

      _.each(compartment.cells,function(cell, i){
            cell.debug = true;
            hasCells = true;


            var view = that.paper.renderViewSilence(cell);
            regionContainer.append(view.el);
      });
      hasCells && debugContainer.append(regionContainer);
    },

    render:function(){
        dedu.shape.simple.GenericView.prototype.render.apply(this,arguments);
        this.originSize = this.model.get('size');
        this.updateName();
        if(this.model.debug){
          this.update1();
        }

    },

    update1: function(){
        var model = this.model,compartments = model.compartments,that = this,
            regions = this.model.regions,regionContainer;

        var x = model.x,y=model.y,width=model.width,height=model.height,yDivider = 0;
        // dedu.ElementView.prototype.update.apply(this,arguments);

        var debugContainer = V(this.rotatableNode.node).select('.debug'),originExists = true;
        if(!debugContainer){
          debugContainer = V('g').attr('class','debug');
          originExists = false;
        }
        $(debugContainer.node).empty();
        originExists || V(this.rotatableNode.node).append(debugContainer);
        if(compartments){

          _.each(compartments,function(part, i){
            that.renderCompartment(part,debugContainer,yDivider);
            if (i+1 === compartments.length) return;
            yDivider += part.height;
            var divider = V('path'),style={
              d:['M',0,yDivider,,'L',width,yDivider].join(' '),
              'stroke': 'blue', 'stroke-width': 2,
              class: 'uml-state-separator'};
            if(i>0){
              style['stroke-dasharray'] = '9,5';
            }
            divider.attr(style);
            debugContainer.append(divider);
          });
        }
    },

    updateEvents: function () {
        this.vel.select('.uml-state-events').text(this.model.get('events').join('\n'));
        var $text = $(".uml-state-events",this.$el);
        var textBbox = V($text[0]).bbox(true, this.$el);
        var size = this.originSize;
        this.model.set('size',{
            width:size.width,
            height:size.height+textBbox.height
        });
    },

    updateName: function () {
        this.vel.select('.uml-state-name').node.textContent = this.model.get('name');
    },

    updatePath: function () {

        var $text = $(".uml-state-name",this.$el);
        var textBbox = V($text[0]).bbox(true, this.$el);

        var d = 'M 0 '+textBbox.height+' L ' + this.model.get('size').width + " "+textBbox.height;

        // We are using `silent: true` here because updatePath() is meant to be called
        // on resize and there's no need to to update the element twice (`change:size`
        // triggers also an update).
        // this.vel.select('.uml-state-separator').attr('d', d);
    },

    focus: function () {
        this.vel.select('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },

    unfocus:function(){
        this.vel.select('.uml-state-body').attr({
            fill:"#fff"
        });
        this.hideSuspendPort();
    }
});

dedu.shape.uml.StartStateView  = dedu.shape.simple.GenericView.extend({

    focus: function () {
        this.vel.select('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus: function () {
        this.vel.select('.uml-state-body').attr({
            fill:"blue"
        });
        this.hideSuspendPort();
    },
    translate:function(){
        var position = this.model.get('position') || {x:0,y:0};
        var size = this.model.get('size');
        this.vel.attr('transform','translate('+Math.round(position.x+size.width/2)+','+Math.round(position.y+size.height/2)+')');
    },

});

dedu.shape.uml.EndStateView  = dedu.shape.simple.GenericView.extend({
    initialize: function (options) {
        this.circle_index  = 2;
        dedu.shape.simple.GenericView.prototype.initialize.apply(this,arguments);
    },
    focus: function () {
        this.vel.select('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus:function(){
        this.vel.select('.uml-state-body').attr({
            fill:"blue"
        });
        this.hideSuspendPort();
    },
    translate:function(){
        var position = this.model.get('position') || {x:0,y:0};
        var size = this.model.get('size');
        this.vel.attr('transform','translate('+Math.round(position.x+size.width/2)+','+Math.round(position.y+size.height/2)+')');
    },
});

dedu.shape.uml.ChoiceView  = dedu.shape.simple.GenericView.extend({

    focus: function () {
        this.vel.select('.uml-choice-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus: function () {
        this.vel.select('.uml-choice-body').attr({
            fill:"#fff"
        });
        this.hideSuspendPort();
    },

});

dedu.shape.uml.DeepHistoryView  = dedu.shape.simple.GenericView.extend({
    focus: function () {
        this.vel.select('.uml-history-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus: function () {
        this.vel.select('.uml-history-body').attr({
            fill:"#fff"
        });
        this.hideSuspendPort();
    },
    translate:function(){
        var position = this.model.get('position') || {x:0,y:0};
        var size = this.model.get('size');
        this.vel.attr('transform','translate('+Math.round(position.x+size.width/2)+','+Math.round(position.y+size.height/2)+')');
    },

});
dedu.shape.uml.ShadowHistoryView  = dedu.shape.simple.GenericView.extend({
    focus: function () {
        this.vel.select('.uml-history-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus: function () {
        this.vel.select('.uml-history-body').attr({
            fill:"#fff"
        });
        this.hideSuspendPort();
    },
    translate:function(){
        var position = this.model.get('position') || {x:0,y:0};
        var size = this.model.get('size');
        this.vel.attr('transform','translate('+Math.round(position.x+size.width/2)+','+Math.round(position.y+size.height/2)+')');
    },
});
