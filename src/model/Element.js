define(["./Cell",'../geometry'], function (Cell,g) {
  /**
 * `Element`是所有节点的父类
 * @class
 * @augments Cell
 */
  Element = Cell.extend({
    /**
     * @member {Object} defaults - 默认属性
     * @property {Object} defaults.position
     * @property {number} defaults.position.x=0
     * @property {number} defaults.position.y=0
     * @property {Object} defaults.size
     * @property {number} defaults.size.width=0
     * @property {number} defaults.size.height=0
     * @property {number} defaults.angle=0
     * @property {number} defaults.selected=false
     * @memberof Element
     */
    defaults: {
      position: {
        x: 0,
        y: 0
      },
      size: {
        width: 1,
        height: 1
      },
      angle: 0,
      selected: false
    },

    position: function (x, y, opt) {

    },
    /**
     * @method translate - 更改position
     * @param {Number} tx - x轴偏移量
     * @param {Number} ty - y轴偏移量
     * @param {Object} opt
     * @returns {Element}
     * @memberof Element
     */
    translate: function (tx, ty, opt) {
      tx = tx || 0;
      ty = ty || 0;
      if (tx === 0 && ty === 0) {
        // Like nothing has happened.
        return this;
      }

      opt = opt || {};
      // Pass the initiator of the translation.
      opt.translateBy = opt.translateBy || this.id;
      var position = this.get('position') || {
        x: 0,
        y: 0
      };

      if (opt.restrictedArea && opt.translateBy === this.id) {

      }

      var translatedPosition = {
        x: position.x + tx,
        y: position.y + ty
      };

      // To find out by how much an element was translated in event 'change:position' handlers.
      opt.tx = tx;
      opt.ty = ty;


      if (!_.isObject(opt.transition)) opt.transition = {};

      this.set('position', translatedPosition, opt);

    },

    /**
     * @method resize - 更改resize
     * @param {Number} width - 宽度
     * @param {Number} height - 高度
     * @param {Object} opt
     * @returns {Element}
     * @memberof Element
     */
    resize: function (width, height, opt) {
      this.set('size', {
        width: width,
        height: height
      }, opt);
      return this;
    },
    getBBox: function(opt) {
        opt = opt || {};
        if (opt.deep && this.graph) {
            // Get all the embedded elements using breadth first algorithm,
            // that doesn't use recursion.
            var elements = this.getEmbeddedCells({ deep: true, breadthFirst: true });
            // Add the model itself.
            elements.push(this);

            return this.graph.getCellsBBox(elements);
        }
        var position = this.get('position');
        var size = this.get('size');
        return g.rect(position.x, position.y, size.width, size.height);
    }

  });
  return Element;
});