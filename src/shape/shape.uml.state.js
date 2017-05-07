define(['./shape.simple', '../core'], function (shape, core) {
  var util = core.util;
  /**
   * Created by lmz on 16/3/20.
   */

  shape.uml = {};

  /**
   * `StartState`
   * @class
   * @augments shape.simple.Generic
   */
  shape.uml.StartState = shape.simple.Generic.extend({
    markup: [
      '<g class="rotatable">',
      '<g class="scalable">',
      '<circle class="uml-start-state-body uml-state-body"/>',
      '</g>',
      '</g>'
    ].join(''),

    defaults: util.deepSupplement({
      type: 'uml.StartState',
      size: {
        width: 25,
        height: 25
      },
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
        '.uml-start-state-body': {
          'r': 20,
          'stroke': 'blue',
          'fill': 'blue'
        }
      },
      name: 'Initial' + util.randomString(6)
    }, shape.simple.Generic.prototype.defaults)
  });

  /**
   * @class
   * @augments shape.simple.Generic
   */
  shape.uml.EndState = shape.simple.Generic.extend({
    markup: [
      '<g class="rotatable">',
      '<g class="scalable">',
      '<circle class="uml-end-state-body uml-state-body" />',
      '<circle class="uml-end-state-inner"/>',
      '</g>',
      '</g>'
    ].join(''),
    defaults: util.deepSupplement({
      type: 'uml.EndState',
      size: {
        width: 25,
        height: 25
      },
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
      name: 'End' + util.randomString(6)
    }, shape.simple.Generic.prototype.defaults)
  });

  shape.uml.Choice = shape.simple.Generic.extend({
    markup: [
      '<g class="rotatable">',
      '<g class="scalable">',
      '<polyline class="uml-choice-body" points="50,0,0,50,50,100,100,50,50,0"></polyline>',
      '</g>',
      '</g>'
    ].join(''),

    defaults: util.deepSupplement({

      type: 'uml.Choice',
      size: {
        width: 40,
        height: 40
      },
      attrs: {
        '.uml-choice-body': {
          'stroke': 'blue',
          'stroke-width': 2
        }
      }
    }, shape.simple.Generic.prototype.defaults)
  });

  shape.uml.DeepHistory = shape.simple.Generic.extend({
    markup: [
      '<g class="rotatable">',
      '<g class="scalable">',
      '<circle class="uml-deep-history-body uml-history-body"/>',
      '<path class="h" d="M-10,-15l0,30l0,-15l20,0l0,-15l0,30" stroke="#000000" fill="none"></path>',
      '</g>',
      '</g>'
    ].join(''),

    defaults: util.deepSupplement({
      type: 'uml.DeepHistory',
      size: {
        width: 25,
        height: 25
      },
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
    }, shape.simple.Generic.prototype.defaults)
  });

  shape.uml.ShadowHistory = shape.simple.Generic.extend({
    markup: [
      '<g class="rotatable">',
      '<g class="scalable">',
      '<circle class="uml-deep-history-body uml-history-body"/>',
      '<path class="h" d="M-10,-15l0,30l0,-15l20,0l0,-15l0,30" stroke="#000000" fill="none"></path>',
      '<text id="star">*</text>',
      '</g>',
      '</g>'
    ].join(''),
    defaults: util.deepSupplement({
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
        '.h': {
          'stroke': 'blue',
          'stroke-width': 2,
        }
      }
    }, shape.uml.DeepHistory.prototype.defaults)
  })

  Region = Backbone.Model.extend({
    initialize: function(name) {

    },

  });

  /**
   * @class
   * @augments shape.simple.Generic.
   */
  shape.uml.State = shape.simple.Generic.extend({
    markup: [
      '<g class="rotatable">',
      '<g class="scalable">',
      '<rect class="uml-state-body" width="76" height="31" fill="#fff"/>',
      '</g>',
      '<text class="uml-state-name"/>',
      '</g>'
    ].join(''),

    initalHook: function (attrs) {
      //验证规则
      if (attrs.name) {
        this.set('text', attrs.name)
      }
    },

    compoundUI: function (isCompound, opt) {
      var attrs = this.get('attrs'),
        separator = attrs['.uml-state-separator'],
        body = attrs['.uml-state-body'],
        name = attrs['.uml-state-name'];
      if (isCompound) {
        if (opt.body) {
          body.rx = opt.body.rx;
          body.ry = opt.body.ry
        } else {
          body.rx = '4';
          body.ry = '4';
        }
        if (opt.name) {
          name['ref-y'] = opt.name.dy;
        }
      } else {
        body.rx = '15.5';
        body.ry = '15.5';
        name['ref-y'] = '.4';
      }
    },

    defaults: util.deepSupplement({

      type: 'uml.State',
      size: {
        width: 60,
        height: 30
      },
      update: 0,
      regions: {},

      attrs: {
        '.uml-state-body': {
          'rx': 10,
          'ry': 10,
          'stroke': 'blue',
          'stroke-width': 2
        },
        '.uml-state-name': {
          'ref-x': .5,
          'ref-y': .4,
          'text-anchor': 'middle',
          'fill': '#000000',
          'font-family': 'Courier New',
          'font-size': 12,
          'font-weight': 'bold'
        },
        // '.uml-state-separator': {
        //     'stroke': 'blue', 'stroke-width': 3
        // },
        '.compound-name': {
          'ref': '.uml-state-body',
          'ref-x': 3,
          'ref-y': 3,
          'text-anchor': 'start',
          stroke: 'black',
          fill: 'none',
          'font-size': 12,
        }
        // '.uml-state-events': {
        //     'ref': '.uml-state-separator', 'ref-x': 5, 'ref-y': 5,
        //     'fill': '#000000', 'font-family': 'Courier New', 'font-size': 10,
        //     'display':'block',hidden:true
        // }
      },

      events: [],
      name: 'State' + util.randomString(6)
    }, shape.simple.Generic.prototype.defaults),

    isSimple: function() {
      return Object.keys(this.regions).length === 0;
    },

    isOrthogonal: function() {
      return Object.keys(this.regions).length > 1;
    },

    enableSubflow: function() {
      return true;
    }

  });

  shape.uml.StateView = shape.simple.GenericView.extend({

    initialize: function (options) {
      if (options.skip_render) {
        return;
      }
      shape.simple.GenericView.prototype.initialize.apply(this, arguments);
      this.model.on('change:name', this.updateName, this);
      this.model.on('change:events', this.updateEvents, this);
      this.model.on('change:size', this.updatePath, this);
      this.listenTo(this.model, 'change:update', this.update);
    },

    renderCompartment: function (compartment, debugContainer, yDivider) {
      var that = this;
      _.each(compartment.lines, function (text, i) {
        debugContainer.append(Snap.fragment('<text class="compound-name"></text>'));
      });

      var regionContainer = Snap.fragment('<g class="regions"></g>');
      regionContainer.select('g').attr({
          transform: 'translate(0,' + yDivider + ')'
        }),
        hasCells = false;

      _.each(compartment.cells, function (cell, i) {
        cell.debug = true;
        hasCells = true;


        var view = that.paper.renderViewSilence(cell);
        regionContainer.select('g').append(view.el);
      });
      hasCells && debugContainer.append(regionContainer);
    },

    render: function () {
      shape.simple.GenericView.prototype.render.apply(this, arguments);
      this.originSize = this.model.get('size');
      this.updateName();
      if (this.model.debug) {
        this.update1();
      }

    },

    update1: function () {
      var model = this.model,
        compartments = model.compartments,
        that = this,
        regions = this.model.regions,
        regionContainer;

      var x = model.x,
        y = model.y,
        width = model.width,
        height = model.height,
        yDivider = 0;
      // ElementView.prototype.update.apply(this,arguments);

      var debugContainer = Snap(this.rotatableNode.node).select('.debug'),
        originExists = true;
      if (!debugContainer) {
        debugContainer = Snap.fragment('<g></g>').select('g').attr('class', 'debug');
        originExists = false;
      }
      $(debugContainer.node).empty();
      originExists || Snap(this.rotatableNode.node).append(debugContainer);
      if (compartments) {

        _.each(compartments, function (part, i) {
          that.renderCompartment(part, debugContainer, yDivider);
          if (i + 1 === compartments.length) return;
          yDivider += part.height;
          var divider = Snap.fragment('<path></path>'),
            style = {
              d: ['M', 0, yDivider, , 'L', width, yDivider].join(' '),
              'stroke': 'blue',
              'stroke-width': 2,
              class: 'uml-state-separator'
            };
          if (i > 0) {
            style['stroke-dasharray'] = '9,5';
          }
          divider.select('path').attr(style);
          debugContainer.append(divider);
        });
      }
    },

    updateEvents: function () {
      this.vel.select('.uml-state-events').text(this.model.get('events').join('\n'));
      var $text = $(".uml-state-events", this.$el);
      var textBbox = Snap($text[0]).bbox(true, this.$el);
      var size = this.originSize;
      this.model.set('size', {
        width: size.width,
        height: size.height + textBbox.height
      });
    },

    updateName: function () {
      this.vel.select('.uml-state-name').node.textContent = this.model.get('name');
    },

    updatePath: function () {

      var $text = $(".uml-state-name", this.$el);
      var textBbox = Snap($text[0]).bbox(true, this.$el);

      var d = 'M 0 ' + textBbox.height + ' L ' + this.model.get('size').width + " " + textBbox.height;

      // We are using `silent: true` here because updatePath() is meant to be called
      // on resize and there's no need to to update the element twice (`change:size`
      // triggers also an update).
      // this.vel.select('.uml-state-separator').attr('d', d);
    },

    focus: function () {
      this.vel.select('.uml-state-body').attr({
        fill: "#ffc21d"
      });
    },

    unfocus: function () {
      this.vel.select('.uml-state-body').attr({
        fill: "#fff"
      });
      this.hideSuspendPort();
    }
  });

  shape.uml.StartStateView = shape.simple.GenericView.extend({

    focus: function () {
      this.vel.select('.uml-state-body').attr({
        fill: "#ffc21d"
      });
    },
    unfocus: function () {
      this.vel.select('.uml-state-body').attr({
        fill: "blue"
      });
      this.hideSuspendPort();
    },
    translate: function () {
      var position = this.model.get('position') || {
        x: 0,
        y: 0
      };
      var size = this.model.get('size');
      this.vel.attr('transform', 'translate(' + Math.round(position.x + size.width / 2) + ',' + Math.round(position.y + size.height / 2) + ')');
    },

  });

  shape.uml.EndStateView = shape.simple.GenericView.extend({
    initialize: function (options) {
      this.circle_index = 2;
      shape.simple.GenericView.prototype.initialize.apply(this, arguments);
    },
    focus: function () {
      this.vel.select('.uml-state-body').attr({
        fill: "#ffc21d"
      });
    },
    unfocus: function () {
      this.vel.select('.uml-state-body').attr({
        fill: "blue"
      });
      this.hideSuspendPort();
    },
    translate: function () {
      var position = this.model.get('position') || {
        x: 0,
        y: 0
      };
      var size = this.model.get('size');
      this.vel.attr('transform', 'translate(' + Math.round(position.x + size.width / 2) + ',' + Math.round(position.y + size.height / 2) + ')');
    },
  });

  shape.uml.ChoiceView = shape.simple.GenericView.extend({

    focus: function () {
      this.vel.select('.uml-choice-body').attr({
        fill: "#ffc21d"
      });
    },
    unfocus: function () {
      this.vel.select('.uml-choice-body').attr({
        fill: "#fff"
      });
      this.hideSuspendPort();
    },

  });

  shape.uml.DeepHistoryView = shape.simple.GenericView.extend({
    focus: function () {
      this.vel.select('.uml-history-body').attr({
        fill: "#ffc21d"
      });
    },
    unfocus: function () {
      this.vel.select('.uml-history-body').attr({
        fill: "#fff"
      });
      this.hideSuspendPort();
    },
    translate: function () {
      var position = this.model.get('position') || {
        x: 0,
        y: 0
      };
      var size = this.model.get('size');
      this.vel.attr('transform', 'translate(' + Math.round(position.x + size.width / 2) + ',' + Math.round(position.y + size.height / 2) + ')');
    },

  });
  shape.uml.ShadowHistoryView = shape.simple.GenericView.extend({
    focus: function () {
      this.vel.select('.uml-history-body').attr({
        fill: "#ffc21d"
      });
    },
    unfocus: function () {
      this.vel.select('.uml-history-body').attr({
        fill: "#fff"
      });
      this.hideSuspendPort();
    },
    translate: function () {
      var position = this.model.get('position') || {
        x: 0,
        y: 0
      };
      var size = this.model.get('size');
      this.vel.attr('transform', 'translate(' + Math.round(position.x + size.width / 2) + ',' + Math.round(position.y + size.height / 2) + ')');
    },
  });
  return shape;
})
