define(['underscore', './shape.basic', '../core', '../view/ElementView'], function (_,shape,core, ElementView) {
  var util = core.util;
  shape.simple = {};
  /**
   * SuspendPort model interface
   * @class
   */
  shape.simple.SuspendPortModelInterface = {};

  /**
   * SuspendPort view interface
   * @class
   */
  shape.simple.SuspendPortViewInterface = {
    initialize: function (options) {
      if (options.skip_render) {
        return;
      }
      ElementView.prototype.initialize.apply(this, arguments);
      //this.listenTo(this, 'add:ports', this.update);
      //this.listenTo(this,'remove:ports',this.update);
      _.bindAll(this, "showSuspendPort", "hideSuspendPort");
      this.$el.on('mouseenter', this.showSuspendPort);
      this.$el.on('mouseleave', this.hideSuspendPort);

      _.bindAll(this, "addTipMagnet", "removeTipMagnet");

      this.on('cell:highlight', this.addTipMagnet);
      this.on('cell:unhighlight', this.removeTipMagnet);
      this.model.on('change:selected', function () {
        if (this.model.get("selected")) {
          this.focus();
        } else {
          this.unfocus();
        }

      }, this);
    },
    renderView: function () {
      //ElementView.prototype.render.apply(this, arguments);
      this.renderSuspendPort();
      //this.update();
    },
    /**
     * 渲染suspend port
     * @method renderSuspendPort
     * @memberof shape.simple.SuspendPortViewInterface
     */
    renderSuspendPort: function () {

      var suspendTemplate = _.template(this.model.suspendPortMarkup);

      var up = Snap.fragment(suspendTemplate({
        dir: 'up'
      }));
      var right = Snap.fragment(suspendTemplate({
        dir: 'right'
      }));
      var down = Snap.fragment(suspendTemplate({
        dir: 'down'
      }));
      var left = Snap.fragment(suspendTemplate({
        dir: 'left'
      }));
      this.rotatableNode.append(up);
      this.rotatableNode.append(right);
      this.rotatableNode.append(down);
      this.rotatableNode.append(left);
      this.up = this.rotatableNode.select('.portup');
      this.right = this.rotatableNode.select('.portright');
      this.down = this.rotatableNode.select('.portdown');
      this.left = this.rotatableNode.select('.portleft');

      var port_ref_position = this.model.get('port_ref_position');
      if (port_ref_position) {
        this.model.attr({
          '.suspend': {
            ref: '.body',
            r: 3,
            display: 'none'
          },
          '.portup': {
            'ref-x': port_ref_position.portup['ref-x'],
            'ref-y': port_ref_position.portup['ref-y']
          },
          '.portright': {
            'ref-x': port_ref_position.portright['ref-x'],
            'ref-y': port_ref_position.portright['ref-y']
          },
          '.portdown': {
            'ref-x': port_ref_position.portdown['ref-x'],
            'ref-y': port_ref_position.portdown['ref-y']
          },
          '.portleft': {
            'ref-x': port_ref_position.portleft['ref-x'],
            'ref-y': port_ref_position.portleft['ref-y']
          }
        });
      } else {
        this.model.attr({
          '.suspend': {
            ref: '.body',
            r: 3,
            display: 'none'
          },
          '.portup': {
            'ref-x': .5,
            'ref-y': 0
          },
          '.portright': {
            'ref-x': '100%',
            'ref-y': .5
          },
          '.portdown': {
            'ref-x': .5,
            'ref-y': '100%'
          },
          '.portleft': {
            'ref-y': .5,
            'ref-x': 0
          }
        });
      }
      this.trigger('add:ports');
    },
    /**
     * show suspend port
     * method showSuspendPort
     * @memberof shape.simple.SuspendPortViewInterface
     */
    showSuspendPort: function () {
      this.up.attr('display', 'block');
      this.right.attr('display', 'block');
      this.down.attr('display', 'block');
      this.left.attr('display', 'block');
    },
    /**
     * hide suspend port
     * method hideSuspendPort
     * @memberof shape.simple.SuspendPortViewInterface
     */
    hideSuspendPort: function () {
      this.up.attr('display', 'none');
      this.right.attr('display', 'none');
      this.down.attr('display', 'none');
      this.left.attr('display', 'none');
    }
  };

  /**
   * A model class implements suspend port
   * @class
   * @augments shape.basic.Generic
   */
  shape.simple.Generic = shape.basic.Generic.extend(
    _.extend({}, {
        markup: '<g class="rotatable"><g class="scalable"><rect class="body"/></g><text class="label"/></g>',
        suspendPortMarkup: '<circle class="suspend port<%= dir %>" port="<%= dir %>" magnet/>',
        defaults: util.deepSupplement({
          type: 'simple.Generic',
          size: {
            width: 1,
            height: 1
          },

          attrs: {
            '.body': {
              width: 150,
              height: 250,
              stroke: '#000000'
            },
            '.suspend': {
              magnet: true
            },

          }
        }, shape.basic.Generic.prototype.defaults),
        /**
         * get relative position for port
         * @param portName
         * @param index
         * @param total
         * @param selector
         * @param type
         * @returns {{}}
         * @memberof shape.simple.Generic
         */
        getPortAttrs: function (portName, index, total, selector, type) {
          var attrs = {};

          var portClass = 'port' + index;
          var portSelector = selector + '>.' + portClass;
          var portLabelSelector = portSelector + '>.port-label';
          var portBodySelector = portSelector + '>.port-body';

          attrs[portBodySelector] = {
            port: {
              id: portName || _.uniqueId(type),
              type: type
            }
          };
          attrs[portSelector] = {
            ref: '.body',
            'ref-y': (index + 0.5) * (1 / total)
          };

          if (selector === '.outPorts') {
            attrs[portSelector]['ref-dx'] = 0;
          }
          return attrs;
        },
        compoundUI: function () {
        }
      })
  );

  /**
   * A view class implements suspend port
   * @class
   * @augments ElementView
   */
  shape.simple.GenericView = ElementView.extend(
    _.extend({}, shape.simple.SuspendPortViewInterface, {
      /**
       * 显示连接到port的提示
       * @param {DOMObject} el - port对应的domObject
       * @param {Object} [opt]
       */
      addTipMagnet: function (el, opt) {
        var template = _.template('<circle class="tip tip-${ port }" transform="${ transform }"  r="15" fill="black" opacity="0.3"></circle>');

        var port = Snap(el);
        if (port.attr('port') && !$(".tip-" + port.attr('port'), this.$el)[0]) {
          var tip = Snap.fragment(template({
            port: port.attr('port'),
            transform: port.attr('transform')
          }))
          this.rotatableNode.append(tip);
        }
        this.showSuspendPort(); // show four ports
      },

      getPositionBySelector: function (el) {
        el = !el ? this.el : $(el, $(this.el))[0] || this.el;
        var port = Snap(el),
          box = port.bbox();
        var x = box.x + box.width / 2,
          y = box.y + box.height / 2;
        return {
          x: x,
          y: y
        }
      },
      /**
       * 移除提示
       * @param el
       * @param opt
       */
      removeTipMagnet: function (el, opt) {
        var port = Snap(el);
        if ($(".tip-" + port.attr('port'), this.$el)[0]) {
          $(".tip.tip-" + port.attr('port'), this.$el).remove();
        }
        this.hideSuspendPort(); // hide four ports
      },
      focus: function () {
        this.vel.select('.body').addClass('selected');
      },
      unfocus: function () {
        this.vel.select('.body').removeClass('selected');

      }
    })
  );
  return shape;
})
