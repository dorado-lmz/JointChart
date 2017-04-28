define(["backbone", '../core'], function (Backbone, core) {
   var util = core.util;
  /**
  * `Cell` 是`joint_chart`所有图形的父类
  * @class
  * @augments Backbone.Model
  */
  Cell = Backbone.Model.extend({

    constructor: function (attributes, options) {
      var defaults;
      var attrs = attributes || {};
      this.cid = _.uniqueId('d');
      this.attributes = {};
      if (defaults = _.result(this, 'defaults')) {
        attrs = _.extend({}, defaults, attrs);
      }
      attrs.redID = attrs.redID || (1 + Math.random() * 4294967295).toString(16);  //be used by user program
      this.set(attrs, options);
      this.initialize.apply(this, arguments);
    },

    /**
     * initialize:
     * * set id
     * * process all attrs of port {@link Cell#processPorts|processPorts}
     * @method
     * @instance
     * @param {Object} options
     * @memberof Cell
     */
    initialize: function (attributes, options) {
      if (!attributes || !attributes.id) {
        this.set('id', util.uuid(), { silent: true });
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
     * @memberof Cell
     */
    isLink: function () {
      return false;
    },

    /**
     * @method toFront
     * @instance
     * @param opt
     * @returns {Cell}
     * @memberof Cell
     */
    toFront: function (opt) {
      if (this.collection) {
        opt = opt || {};
        var z = (this.collection.last().get('z') || 0) + 1;

        if (opt.deep) {

          var cells = this.getEmbeddedCells({ deep: true, breadthFirst: true });
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
     * process all attrs of port and called by {@link Cell#initialize|initialize}
     * @method processPorts
     * @instance
     * @memberof Cell
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
            ports[attrs.port] = { id: attrs.port };
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
        args[0] = { 'attrs': attrs };
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
     * @memberof Cell
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
          update = util.setByPath(update, path, value, '/');

          var baseAttributes = _.extend({}, this.attributes);
          // if rewrite mode enabled, we replace value referenced by path with
          // the new one (we don't merge).
          opt.rewrite && util.unsetByPath(baseAttributes, path, '/');

          // Merge update with the model attributes.
          var attributes = _.extend(baseAttributes, update);
          // Finally, set the property to the updated attributes.
          return this.set(property, attributes[property], opt);
        } else {
          return util.getByPath(this.attributes, props, delim);
        }

      }
      props.attrs = _.extend({}, this.get('attrs'), props.attrs);
      return this.set(_.extend({}, this.attributes, props, value));
    },

    isEmbeddedIn: function (cell, opt) {

      var cellId = _.isString(cell) ? cell : cell.id;
      var parentId = this.get('parent');

      opt = _.defaults({ deep: true }, opt);

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

    // Return an array of ancestor cells.
    // The array is ordered from the parent of the cell
    // to the most distant ancestor.
    getAncestors: function() {

        var ancestors = [];
        var parentId = this.get('parent');

        if (!this.graph) {
            return ancestors;
        }

        while (parentId !== undefined) {
            var parent = this.graph.getCell(parentId);
            if (parent !== undefined) {
                ancestors.push(parent);
                parentId = parent.get('parent');
            } else {
                break;
            }
        }

        return ancestors;
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
        clone.set('id', util.uuid());
        // A shallow cloned element does not carry over the original embeds.
        clone.set('embeds', '');
        return clone;

      } else {
        // Deep cloning.

        // For a deep clone, simply call `graph.cloneCells()` with the cell and all its embedded cells.
        return _.values(Graph.prototype.cloneCells.call(null, [this].concat(this.getEmbeddedCells({ deep: true }))));
      }
    },


  });

  return Cell;
});