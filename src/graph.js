/**
 * `dedu.GraphCells` stores all the cell models
 * @class
 * @augments  Backbone.Collection
 */
dedu.GraphCells = Backbone.Collection.extend({
    /**
     * graph处理cell的namespace
     * @member {Object}
     * @memberof dedu.GraphCells`
     */
    cellNamespace: dedu.shape,
    initialize: function(models, opt) {
        if (opt.cellNamespace) {
            this.cellNamespace = opt.cellNamespace;
        }
    },
    /**
     * @method model
     * @param attrs
     * @param options
     */
    model: function(attrs, options) {
        console.log(options);
        var namespace = options.collection.cellNamespace;

        // Find the model class in the namespace or use the default one.
        var ModelClass = (attrs.type === 'link') ? dedu.Link : dedu.util.getByPath(namespace, attrs.type, '.') || dedu.Element;

        return new ModelClass(attrs, options);
    }
});


/*
  id: unique identify for graph
  type: graph | subgraph
  root: cells | cell
*/
dedu.GraphCollection = Backbone.Collection.extend({
    model: function(attrs, options) {
        attrs = _.defaults({}, attrs, {
            id: dedu.util.uuid(),
            type: 'graph',
            // Passing `cellModel` function in the options object to graph allows for
            // setting models based on attribute objects. This is especially handy
            // when processing JSON graphs that are in a different than JointJS format.
            root: new dedu.GraphCells(options.models || [], {
                // model: opt.cellModel,
                // cellNamespace: opt.cellNamespace,
                graph: this
            })
        });
        return new Backbone.Model(attrs);
    }
});


/**
 * `dedu.Graph` A model holding all the cells (elements and links) of the diagram
 * * property `cells` stores all the cells
 * @class
 * @augments Backbone.Model
 */
dedu.Graph = Backbone.Model.extend({

    initialize: function(attrs, opt) {

        opt = opt || {};

        //has many graphs at a time
        var graphs = new dedu.GraphCollection;
        Backbone.Model.prototype.set.call(this, 'graphs', graphs);
        if (!opt.tabs) {
            this.createGraph();
        }


        // Make all the events fired in the `cells` collection available.
        // to the outside world.
        // this.get("cells").on("all",this.trigger,this);
        // this.active_cells().on('change', this.changeGraph, this);
        // this.on('change', this.changeGraph, this);
        // this.on("all", this.trigger, this);
        // this.active_cells().on('remove', this._removeCell, this);
        // this.on('remove', this._removeCell, this);

        // Outgoing edges per node. Note that we use a hash-table for the list
        // of outgoing edges for a faster lookup.
        // [node ID] -> Object [edge] -> true
        this._out = {};
        // Ingoing edges per node.
        // [node ID] -> Object [edge] -> true
        this._in = {};
        // `_nodes` is useful for quick lookup of all the elements in the graph, without
        // having to go through the whole cells array.
        // [node ID] -> true
        this._nodes = {};
        // `_edges` is useful for quick lookup of all the links in the graph, without
        // having to go through the whole cells array.
        // [edge ID] -> true
        this._edges = {};

        this.selectionSet = []; //user select much elements

        // cells.on('add', this._restructureOnAdd, this);
        // cells.on('remove', this._restructureOnRemove, this);
        this.on('addCell', this._restructureOnAdd, this);
        this.on('remove', this._restructureOnRemove, this);
        this.on('process_transition',function(attrs){
          console.log(attrs)
        })
    },

    /*
    * user can create many graph.
    * parent subflow id
    * opt{
      tabs: true,if you use tabs
    }
    * createGraph() create a new graph
    * createGraph(cell, region_name)
    * - region has shown: switch tab
    * - region has not exits: create a region graph
    */
    createGraph: function(cell, opt) {
        opt = opt || {};
        var graphs = this.get('graphs');
        var graph, id;


        if (cell) {
            cell.regions || (cell.regions = {});
            if (opt.region_name) {

                let region = cell.regions[opt.region_name];
                if (region.pending_id) {
                    //switch region

                    graph = graphs.get(region.pending_id);
                } else {
                    // restore subflow
                    graph = graphs.add({}, {
                        models: cell.regions[opt.region_name]
                    }, opt);
                    graph.parent = {
                        cell: cell,
                        region: opt.region_name
                    };

                }
            } else {
                //create region
                let regionName = 'region' + dedu.util.randomString(6);
                graph = graphs.add({}, opt);
                graph.parent = {
                    cell: cell,
                    region: regionName
                };
                let region = cell.regions[regionName] = [];
                region.pending_id = graph.id;
                region.graph = graph;
            }
        } else {
            graph = graphs.add({}, opt);
        }
        id = graph.id;
        this.switchGraph(id);
        return graph;
    },

    saveSubGraph: function(graph, parent) {
        var active_cells;
        var graphs = this.get('graphs');
        graph && graph.parent && (active_cells = graph.get('root'));
        if (active_cells) {
            var regionName = parent.region;
            var region = parent.cell.regions[regionName] = active_cells.models;
            region.graph = undefined;
            region.pending_id = undefined;

        }
    },

    save: function() {
        var cells = this.active_cells(),
            len = cells.length;
        for (var i = 0; i < len; i++) {
            var cell = cells.at(i);
            if (!cell.isLink()) {
                this.saveCell(cell);
            }

        }
    },

    saveCell: function(cell) {
        if (cell.regions) {
            _.each(cell.regions, (_region, name, regions) => {
                if (_region.graph) {
                    var cells = _region.graph.get('root').models;
                    cells.graph = _region.graph;
                    cells.pending_id = cells.pending_id;
                    regions[name] = cells;
                }
            })

        }
    },

    switchGraph: function(id) {
        var active_cells = this.get('graphs').get(id).get('root');
        active_cells.on("all",this.trigger,this);
        this.set('active_graph_id', id);
        this.resetCells();
    },

    removeGraph: function(id) {
        var graphs = this.get('graphs');
        var graph = graphs.get(id);
        if (graph.parent) {
            this.saveSubGraph(graph, graph.parent);
            // graphs.remove(graph.parent);
        }
        graphs.remove(graph);
        this.switchGraph(graphs.at(0).id);
        return graphs.at(0).id;
    },

    exportGraph: function(id) {
        var cells = this.active_cells();
        var states = {},
            transitions = {},
            state_machine = {},
            len = cells.length;
        for (var i = 0; i < len; i++) {
            var cell = cells.at(i);
            this.parseCell(cell, null, states, transitions, state_machine);
        }
        flow = {
            flat_states: states,
            state_machine: state_machine,
            transitions: transitions
        }
        return flow;
    },

    parseCell: function(cell, parent, states, transitions, state_machine) {
        if (cell.isLink()) {
            var link = {},eventName = cell.event,actionName = cell.action;
            link.id = cell.id;
            link.src = cell.get('source').id;
            link.target = cell.get('target').id;

            if(eventName){
              link.events = [eventName];
            }
            if(actionName){
              link.actions = [actionName];
            }
            transitions[link.id] = link;
        } else {
            var state = {};
            state.qualifiedName = state.name = cell.get('name');
            state.type = cell.get('type');
            state.id = cell.id;
            if (parent) {
                state.qualifiedName = parent.qualifiedName + "." + state.qualifiedName;
            }

            state.onEntry = cell.entry;
            state.onExit = cell.exit;
            state.onEnter = cell.enter;

            states[state.id] = state;
            state_machine[state.id] = _.clone(state);

            if (cell.regions) {
                var regions = state_machine[state.id].regions = {};
                _.each(cell.regions, (_region, name) => {
                    regions[name] = {};
                    _region.forEach((_cell, index) => {

                        this.parseCell(_cell, state, states, transitions, regions[name]);
                    })
                })

            }

        }
    },
    _restructureOnAdd: function(cell) {

        if (cell.isLink()) {
            this._edges[cell.id] = true;
            var source = cell.get('source');
            var target = cell.get('target');
            if (source.id) {
                (this._out[source.id] || (this._out[source.id] = {}))[cell.id] = true;
            }
            if (target.id) {
                (this._in[target.id] || (this._in[target.id] = {}))[cell.id] = true;
            }
        } else {
            this._nodes[cell.id] = true;
        }
    },

    _restructureOnRemove: function(cell) {
        if (cell.isLink()) {
            delete this._edges[cell.id];
            var source = cell.get('source');
            var target = cell.get('target');
            if (source.id && this._out[source.id] && this._out[source.id][cell.id]) {
                delete this._out[source.id][cell.id];
            }
            if (target.id && this._in[target.id] && this._in[target.id][cell.id]) {
                delete this._in[target.id][cell.id];
            }
        } else {
            delete this._nodes[cell.id];
        }
    },

    /**
     * graphCells是否存在`id`指定的cell
     * @param {Number} id
     * @returns {boolean}
     */
    isExist: function(id) {
        var models = this.active_cells().models;
        for (var i = 0; i < models.length; i++) {
            if (models[i].get('redID') == id) {
                return true;
            }
        }
        return false;
    },

    /**
     * get cell by redID
     * @param {String} redID
     * @returns {dedu.Cell}
     */
    getCellByRedID: function(redID) {
        var models = this.active_cells().models;
        for (var i in models) {
            if (models[i].get('redID') == redID) {
                return models[i];
            }
        }
    },
    /**
     * get a cell from the graph by its `id`
     * @param {String} id
     * @returns {dedu.Cell}
     */
    getCell: function(id) {
        return this.active_cells().get(id);
    },

    /**
     * like {@link dedu.Graph~getCell},Get all the elemnet and links in the graph.
     * @returns {Array<dedu.Cell>}
     */
    getCells: function() {
        return this.active_cells().toArray();
    },

    /**
     * Get all the elements in the graph (i.e. omit links).
     * @returns {Array<dedu.Element>}
     */
    getElements: function() {

        return this.active_cells().filter(function(cell) {

            return cell instanceof dedu.Element;
        });
    },

    /**
     * Get all the links in the graph (i.e. omit elements).
     * @returns {Array<dedu.Link>}
     */
    getLinks: function() {
        return this.active_cells().filter(function(cell) {

            return cell instanceof joint.dia.Link;
        });
    },

    selectAll: function() {

        this.active_cells().models.forEach(function(model) {
            model.focus();
        });
        this.selectionSet = this.active_cells().models;
    },

    getAllPosition: function() {
        var nodes = {};
        this.active_cells().models.forEach(function(model) {
            if (model instanceof dedu.Element) {

                if (model instanceof dedu.shape.node_red.subflowportModel) {
                    nodes[model.get('index') - 1] = { position: model.get('position'), type: 'subflowport' };
                } else {
                    nodes[model.get('redID')] = { position: model.get('position') };
                }
            }
        });
        return nodes;
    },

    updateSelection: function(selection_models_new) {
        var selection_models = _.difference(this.selectionSet, selection_models_new);
        selection_models.forEach(function(model) {
            model.focus();
        });
        this.selectionSet = selection_models_new;
    },

    cancelSelection: function(model_array) {
        var selection_models = _.difference(this.selectionSet, model_array);
        selection_models.forEach(function(model) {
            model.unfocus();
        });
        this.selectionSet = [];
    },

    focus: function(model) {
        if (this.selectionSet.indexOf(model) == -1) {
            this.cancelSelection([model]);
            model.focus();
            this.selectionSet.push(model);
        }
    },

    /**
     * Add a new cell to the graph. If cell is an array, all the cells in the array will be added to the graph.
     * @param {dedu.Cell} cell
     * @param options
     * @returns {dedu.Graph}
     * @example
     *
     *  var rect = new dedu.shape.basic.Rect({
     *   position: { x: 100, y: 100 },
     *   size: { width: 70, height: 30 },
     *   attrs: { text: { text: 'my rectangle' } }
     *   });
     *   var rect2 = rect.clone();
     *   var graph = new dedu.Graph();
     *   graph.addCell(rect).addCell(rect2);
     *
     */
    addCell: function(cell, options) {
        this.trigger('addCell', cell);
        var cells = this.active_cells();
        //current tab's paper
        cells.add(this._prepareCell(cell), options || {});
        var args;
        var self = this;
        if (cell instanceof dedu.Link) {
            cell.on('link:complete', function() {
                args = {
                    source: this.get('source'),
                    target: this.get('target'),
                    redID: this.get('redID'),
                    type: 'link'
                };
                self.notify.apply(this, ['node-red:node-link-added'].concat(args));
            }, cell);
        } else if (cell instanceof dedu.Element) {
            args = {
                redID: cell.get('redID'),
                type: 'node'
            };
            this.notify.apply(this, ['node-red:node-link-added'].concat(args));
        }

        return this;
    },



    layout: function(opt) {


        var opt = opt || {};

        var graphs = this.get('graphs');
        var graph = graphs.get(this.get('active_graph_id'));
        var collection = this.active_cells()
        var cells = collection.models;

        layoutCell(cells, opt);
        this.resetCells();
        console.log(cells);
    },

    /**
     * Add new cells to the graph. This is just a syntactic sugar to the addCell method. Calling addCell with an array of cells is an equivalent to calling addCells.
     * @param {Array<dedu.Cell>} cells
     * @param options
     * @returns {dedu.Graph}
     */
    addCells: function(cells, options) {

        options = options || {};
        options.position = cells.length;

        _.each(cells, function(cell) {
            options.position--;
            this.addCell(cell, options);
        }, this);

        return this;
    },

    /**
     * like {@link dedu.Graph~addCells},用于加载很多cell时
     * @param cells
     * @param opt
     * @returns {dedu.Graph}
     */
    resetCells: function(cells, opt) {
        // this.active_cells().reset(_.map(cells, this._prepareCell, this), opt);
        this.trigger('reset');
        return this;
    },

    active_cells: function() {
        var graphs = this.get('graphs');
        return graphs.get(this.get('active_graph_id')).get('root');
    },

    // check cell is legal
    _prepareCell: function(cell) {
        var attrs = (cell instanceof Backbone.Model) ? cell.attributes : cell;

        if (_.isUndefined(attrs.z)) {
            attrs.z = this.maxZIndex() + 1;
        }

        if (!_.isString(attrs.type)) {
            throw new TypeError('dia.Graph: cell type must be a string.');
        }
        return cell;
    },

    maxZIndex: function() {
        var lastCell = this.active_cells().last();
        return lastCell ? (lastCell.get('z') || 0) : 0;
    },

    //empty all data
    clear: function(active_cells, opt) {

        opt = _.extend({}, opt, { clear: true });

        var cells = active_cells && active_cells.models;

        if (!cells || cells.length === 0) return this;

        this.trigger('batch:start', { batchName: 'clear' });

        // The elements come after the links.
        _.sortBy(cells, function(cell) {
            return cell.isLink() ? 1 : 2;
        });

        do {
            // Remove all the cells one by one.
            // Note that all the links are removed first, so it's
            // safe to remove the elements without removing the connected
            // links first.
            cells.shift().remove(opt);
        } while (cells.length > 0);

        this.trigger('batch:stop', { batchName: 'clear' });
        return this;
    },

    removeSection: function() {
        this.active_cells().remove(this.selectionSet);
        var selectionIDs = {};
        for (var i = 0; i < this.selectionSet.length; i++) {
            selectionIDs[this.selectionSet[i].get('redID')] = this.selectionSet[i] instanceof dedu.Link ? 'link' : 'node';
        }
        this.notify.apply(this, ['node-red:node-link-removed'].concat(selectionIDs));
        this.selectionSet = [];
    },

    notify: function(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        this.trigger.apply(this, [evt].concat(args));
    },
});
