define(["backbone",'./core'],function(Backbone, dedu){
  /**
 * `dedu.Cell` 是`joint_chart`所有图形的父类
 * @class
 * @augments Backbone.Model
 */
dedu.Cell = Backbone.Model.extend({

    constructor: function (attributes, options) {
        var defaults;
        var attrs = attributes || {};
        this.cid = _.uniqueId('d');
        this.attributes = {};
        if (defaults = _.result(this, 'defaults')) {
            attrs = _.extendOwn({}, defaults, attrs);
        }
        attrs.redID = attrs.redID || (1 + Math.random() * 4294967295).toString(16);  //be used by user program
        this.set(attrs, options);
        this.initialize.apply(this, arguments);
    },

    /**
     * initialize:
     * * set id
     * * process all attrs of port {@link dedu.Cell#processPorts|processPorts}
     * @method
     * @instance
     * @param {Object} options
     * @memberof dedu.Cell
     */
    initialize: function (attributes,options) {
        if (!attributes || !attributes.id) {
            this.set('id', dedu.util.uuid(), {silent: true});
        }
        // Collect ports defined in `attrs` and keep collecting whenever `attrs` object changes.
        this.processPorts();
        this.initalHook && this.initalHook(attributes);
    },

    /**
     * whether is link
     * @method isLink
     * @instance
     * @returns {boolean}
     * @memberof dedu.Cell
     */
    isLink: function () {
        return false;
    },

    /**
     * @method toFront
     * @instance
     * @param opt
     * @returns {dedu.Cell}
     * @memberof dedu.Cell
     */
    toFront: function (opt) {
        if (this.collection) {
            opt = opt || {};
            var z = (this.collection.last().get('z') || 0) + 1;

            if (opt.deep) {

                var cells = this.getEmbeddedCells({deep: true, breadthFirst: true});
                _.each(cells, function (cell) {
                    cell.set('z', ++z, opt);
                });

            }
        }
        return this;
    },

    transition: function (path, value, opt, delim) {

    },

    /**
     * process all attrs of port and called by {@link dedu.Cell#initialize|initialize}
     * @method processPorts
     * @instance
     * @memberof dedu.Cell
     *
     */
    processPorts: function () {
        // Whenever `attrs` changes, we extract ports from the `attrs` object and store it
        // in a more accessible way. Also, if any port got removed and there were links that had `target`/`source`
        // set to that port, we remove those links as well (to follow the same behaviour as
        // with a removed element).
        var previousPorts = this.ports;

        // Collect ports from the `attrs` object.
        var ports = {};
        _.each(this.get('attrs'), function (attrs, selector) {
            if (attrs && attrs.port) {
                // `port` can either be directly an `id` or an object containing an `id` (and potentially other data).
                if (!_.isUndefined(attrs.port.id)) {
                    ports[attrs.port.id] = attrs.port;
                } else {
                    ports[attrs.port] = {id: attrs.port};
                }

            }
        });

        // Update the `ports` object.
        this.ports = ports;
    },

    // A convenient way to set nested attributes.
    attr: function (attrs, value, opt) {

        var args = Array.prototype.slice.call(arguments);
        if (_.isString(attrs)) {
            // Get/set an attribute by a special path syntax that delimits
            // nested objects by the colon character.
            args[0] = 'attrs/' + attrs;
        } else {
            args[0] = {'attrs': attrs};
        }
        return this.prop.apply(this, args);
    },

    /**
     *  A convenient way to set nested properties.
     *  * This method merges the properties you'd like to set with the ones stored in the cell and makes sure change events are properly triggered.
     *  * You can either set a nested property with one object or use a property path.
     *
     * @instance
     * @method prop
     * @param {String} props
     * @param {*} value
     * @param {Object} opt
     * @returns {*}
     * @memberof dedu.Cell
     * @example
     * cell.prop('name/first', 'John')
     * cell.prop({ name: { first: 'John' } })
     * cell.prop('series/0/data/0/degree', 50)
     * cell.prop({ series: [ { data: [ { degree: 50 } ] } ] })
     */
    prop: function (props, value, opt) {
        var delim = '/';
        if (_.isString(props)) {
            // Get/set an attribute by a special path syntax that delimits
            // nested objects by the colon character.
            if (arguments.length > 1) {
                var path = props;
                var pathArray = path.split('/');
                var property = pathArray[0];

                // Remove the top-level property from the array of properties.
                pathArray.shift();

                opt = opt || {};
                opt.propertyPath = path;
                opt.propertyValue = value;

                if (pathArray.length === 0) {
                    // Property is not nested. We can simply use `set()`.
                    return this.set(property, value, opt);
                }

                var update = {};
                // Initialize the nested object. Subobjects are either arrays or objects.
                // An empty array is created if the sub-key is an integer. Otherwise, an empty object is created.
                // Note that this imposes a limitation on object keys one can use with Inspector.
                // Pure integer keys will cause issues and are therefore not allowed.
                var initializer = update;
                var prevProperty = property;
                _.each(pathArray, function (key) {
                    initializer = initializer[prevProperty] = (_.isFinite(Number(key)) ? [] : {});
                    prevProperty = key;
                });
                // Fill update with the `value` on `path`.
                update = dedu.util.setByPath(update, path, value, '/');

                var baseAttributes = _.merge({}, this.attributes);
                // if rewrite mode enabled, we replace value referenced by path with
                // the new one (we don't merge).
                opt.rewrite && dedu.util.unsetByPath(baseAttributes, path, '/');

                // Merge update with the model attributes.
                var attributes = _.merge(baseAttributes, update);
                // Finally, set the property to the updated attributes.
                return this.set(property, attributes[property], opt);
            } else {
                return dedu.util.getByPath(this.attributes, props, delim);
            }

        }
        return this.set(_.extendOwn({}, this.attributes, props), value);
    },

    isEmbeddedIn: function (cell, opt) {

        var cellId = _.isString(cell) ? cell : cell.id;
        var parentId = this.get('parent');

        opt = _.defaults({deep: true}, opt);

        // See getEmbeddedCells().
        if (this.collection && opt.deep) {

            while (parentId) {
                if (parentId === cellId) {
                    return true;
                }
                parentId = this.collection.get(parentId).get('parent');
            }
            return false;
        } else {
            // When this cell is not part of a collection check
            // at least whether it's a direct child of given cell.
            return parentId === cellId;
        }

    },

    remove: function (opt) {
        opt = opt || {};

        var collection = this.collection;

        if (collection) {

        }

        // First, unembed this cell from its parent cell if there is one.
        var parentCellId = this.get('parent');
        if (parentCellId) {

            var parentCell = this.collection && this.collection.get(parentCellId);
            parentCell.unembed(this);
        }

        _.invoke(this.getEmbeddedCells(), 'remove', opt);

        this.trigger('remove', this, this.collection, opt);

        return this;
    },

    getEmbeddedCells: function (opt) {

        opt = opt || {};

        // Cell models can only be retrieved when this element is part of a collection.
        // There is no way this element knows about other cells otherwise.
        // This also means that calling e.g. `translate()` on an element with embeds before
        // adding it to a graph does not translate its embeds.
        if (this.collection) {

            var cells;

            if (opt.deep) {

                if (opt.breadthFirst) {

                    // breadthFirst algorithm
                    cells = [];
                    var queue = this.getEmbeddedCells();

                    while (queue.length > 0) {

                        var parent = queue.shift();
                        cells.push(parent);
                        queue.push.apply(queue, parent.getEmbeddedCells());
                    }

                } else {

                    // depthFirst algorithm
                    cells = this.getEmbeddedCells();
                    _.each(cells, function (cell) {
                        cells.push.apply(cells, cell.getEmbeddedCells(opt));
                    });
                }

            } else {

                cells = _.map(this.get('embeds'), this.collection.get, this.collection);
            }

            return cells;
        }
        return [];
    },

    unembed: function (cell, opt) {

        //    this.trigger('batch:start', { batchName: 'unembed' });

        cell.unset('parent', opt);
        this.set('embeds', _.without(this.get('embeds'), cell.id), opt);

        //     this.trigger('batch:stop', { batchName: 'unembed' });

        return this;
    },

    focus: function () {
        this.set('selected', true);
    },

    unfocus: function () {
        this.set('selected', false);
    },

    // Isolated cloning. Isolated cloning has two versions: shallow and deep (pass `{ deep: true }` in `opt`).
    // Shallow cloning simply clones the cell and returns a new cell with different ID.
    // Deep cloning clones the cell and all its embedded cells recursively.
    clone: function (opt) {

        opt = opt || {};

        if (!opt.deep) {
            // Shallow cloning.

            var clone = Backbone.Model.prototype.clone.apply(this, arguments);
            // We don't want the clone to have the same ID as the original.
            clone.set('id', dedu.util.uuid());
            // A shallow cloned element does not carry over the original embeds.
            clone.set('embeds', '');
            return clone;

        } else {
            // Deep cloning.

            // For a deep clone, simply call `graph.cloneCells()` with the cell and all its embedded cells.
            return _.values(dedu.Graph.prototype.cloneCells.call(null, [this].concat(this.getEmbeddedCells({deep: true}))));
        }
    },


});

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
        return {'model-id': this.model.id}
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

    _createElement: function(tagName) {
      var xmlns='http://www.w3.org/2000/svg';
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
            this.paper.notify(evt, this,args);
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

  return dedu;
})
