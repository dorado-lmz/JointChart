define(["backbone", './core'], function (Backbone, dedu,) {
  /**
   * `dedu.CellView` 是{@link dedu.Cell}的view
   * @class
   * @augments  Backbone.View
   */
  dedu.CellView = Backbone.View.extend({
    /**
     * @member {String}
     * @default
     * @const
     * @instance
     * @memberof dedu.CellView
     */
    tagName: 'g',

    /**
     * set the attribute of dom node Dom节点的attribute
     * @returns {{model-id: *}}
     * @instance
     * @memberof dedu.CellView
     */
    attributes: function () {
      return { 'model-id': this.model.id }
    },

    constructor: function (options) {
      this._configure(options);
      Backbone.View.apply(this, arguments);
    },

    _configure: function (options) {
      if (this.options) options = _.extend({}, _.result(this, "options"), options);

      this.options = options;
      // Make sure a global unique id is assigned to this view. Store this id also to the properties object.
      // The global unique id makes sure that the same view can be rendered on e.g. different machines and
      // still be associated to the same object among all those clients. This is necessary for real-time
      // collaboration mechanism.
      this.options.id = this.options.id || dedu.util.guid(this);

    },

    initialize: function (options) {

    },

    // // Override the Backbone `_ensureElement()` method in order to create a `<g>` node that wraps
    // // all the nodes of the Cell view.
    // _ensureElement: function () {
    //     var el;

    //     if (!this.el) {
    //         var attrs = _.extend({
    //             id: this.id
    //         }, _.result(this, 'attributes'));
    //         if (this.className) attrs['class'] = _.result(this, 'className');
    //          this.setElement(this._createElement(_.result(this, 'tagName')));
    //         this._setAttributes(attrs);
    //         el = this._createElement(_.result(this, 'tagName'), attrs).node;
    //     } else {
    //         el = _.result(this, 'el');
    //     }
    //     this.setElement(el, false);
    // },

    // Utilize an alternative DOM manipulation API by
    // adding an element reference wrapped in Vectorizer.
    _setElement: function (el) {
      this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
      this.el = this.$el[0];
      this.vel = Snap(this.el);
    },

    _createElement: function (tagName) {
      var xmlns = 'http://www.w3.org/2000/svg';
      return document.createElementNS(xmlns, tagName);
    },

    /**
     * Construct a unique selector for the `el` element within this view.得到`el`的css选择器
     * @param {DOMObject} el
     * @param [prevSelector] - 使用该方法时,不需要传递实参,它仅被用作递归
     * @returns {*}
     * @instance
     * @memberof dedu.CellView
     */
    getSelector: function (el, prevSelector) {

      if (el === this.el) {
        return prevSelector;
      }
      var nthChild = V(el).index() + 1;
      //if(el.tagName == 'circle'){
      //    nthChild += 1;
      //}else{
      //    nthChild += 1;
      //}

      var classnames = '';
      el.classList.forEach(function (classname) {
        classnames += '.' + classname;
      });
      var selector = el.tagName + classnames + ':nth-child(' + nthChild + ')';

      if (prevSelector) {
        selector += ' > ' + prevSelector;
      }

      return this.getSelector(el.parentNode, selector);
    },


    getStrokeBBox: function (el) {
      // Return a bounding box rectangle that takes into account stroke.
      // Note that this is a naive and ad-hoc implementation that does not
      // works only in certain cases and should be replaced as soon as browsers will
      // start supporting the getStrokeBBox() SVG method.
      // @TODO any better solution is very welcome!

      var isMagnet = !!el;

      el = el || this.el;
      var bbox = V(el).bbox(false, this.paper.viewport);

      var strokeWidth;
      if (isMagnet) {
        strokeWidth = V(el).attr('stroke-width');
      } else {
        strokeWidth = this.model.attr('rect/stroke-width') || this.model.attr('circle/stroke-width') || this.model.attr('ellipse/stroke-width') || this.model.attr('path/stroke-width');
      }

      strokeWidth = parseFloat(strokeWidth) || 0;

      return g.rect(bbox).moveAndExpand({
        x: -strokeWidth / 2,
        y: -strokeWidth / 2,
        width: strokeWidth,
        height: strokeWidth
      });
    },

    /**
     * 返回元素的最大外接矩形,用于判断两个图形是否相交
     * @method
     * @returns {*}
     * @instance
     * @memberof dedu.CellView
     */
    getBBox: function () {
      return g.rect(this.vel.getBBox());
    },

    highlight: function (el, opt) {
      el = !el ? this.el : $(el, $(this.el))[0] || this.el;

      // set partial flag if the highlighted element is not the entire view.
      opt = opt || {};
      opt.partial = el != this.el;

      this.notify('cell:highlight', el, opt);
      return this;
    },

    unhighlight: function (el, opt) {
      el = !el ? this.el : this.$(el)[0] || this.el;

      opt = opt || {};
      opt.partial = el != this.el;

      this.notify('cell:unhighlight', el, opt);
      return this;
    },

    /**
     * 找到最近的元素,并且改元素的 `magnet` 属性为true.如果没有这样的元素,则返回根元素
     * @param {DOMObject} el
     * @returns {*}
     * @instance
     * @memberof dedu.CellView
     */
    findMagnet: function (el) {
      var $el = this.$(el);

      if ($el.length === 0 || $el[0] === this.el) {

        // If the overall cell has set `magnet === false`, then return `undefined` to
        // announce there is no magnet found for this cell.
        // This is especially useful to set on cells that have 'ports'. In this case,
        // only the ports have set `magnet === true` and the overall element has `magnet === false`.
        var attrs = this.model.get('attrs') || {};
        if (attrs['.'] && attrs['.']['magnet'] === false) {
          return undefined;
        }
        return this.el;
      }

      if ($el.attr('magnet')) {
        return $el[0];
      }

      return this.findMagnet($el.parent());
    },
    /**
     * 根据`selector`,查找在本view中的JQueryObject
     * @param {JQueryObject} selector
     * @returns {Backbone.$|*}
     * @instance
     * @memberof dedu.CellView
     */
    findBySelector: function (selector) {
      // These are either descendants of `this.$el` of `this.$el` itself.
      // `.` is a special selector used to select the wrapping `<g>` element.
      var $selected = selector === '.' ? this.$el : this.$el.find(selector);
      return $selected;
    },

    notify: function (evt) {
      if (this.paper) {
        var args = Array.prototype.slice.call(arguments, 1);
        // Trigger the event on both the element itself and also on the paper.
        this.trigger.apply(this, [evt].concat(args));
        // Paper event handlers receive the view object as the first argument.
        // this.paper.trigger.apply(this.paper, [evt, this].concat(args));
        this.paper.notify(evt, this, args);
      }
    },

    pointerdblclick: function (evt, x, y) {

      this.notify('cell:pointerdblclick', evt, x, y);
    },

    pointerclick: function (evt, x, y) {
      this.notify('cell:pointerclick', evt, x, y);
    },


    mouseover: function (evt) {

      this.notify('cell:mouseover', evt);
    },

    pointermove: function (evt, x, y) {

      this.notify('cell:pointermove', evt, x, y);
    },

    pointerdown: function (evt, x, y) {
      this.notify('cell:pointerdown', evt, x, y);
    },

    pointerup: function (evt, x, y) {
      this.notify('cell:pointerup', evt, x, y);
    },

  });

});