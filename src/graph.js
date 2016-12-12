/**
 * `org.dedu.draw.GraphCells` stores all the cell models
 * @class
 * @augments  Backbone.Collection
 */
org.dedu.draw.GraphCells = Backbone.Collection.extend({
    /**
     * graph处理cell的namespace
     * @member {Object}
     * @memberof org.dedu.draw.GraphCells`
     */
    cellNamespace: org.dedu.draw.shape,
    initialize:function(models,opt){
        if(opt.cellNamespace){
            this.cellNamespace = opt.cellNamespace;
        }
    },
    /**
     * @method model
     * @param attrs
     * @param options
     */
    model:function(attrs,options){
        var namespace = options.collection.cellNamespace;

        // Find the model class in the namespace or use the default one.
        var ModelClass = (attrs.type === 'link')
            ? org.dedu.draw.Link
            : org.dedu.draw.util.getByPath(namespace, attrs.type, '.') || org.dedu.draw.Element;

        return new ModelClass(attrs, options);
    }
});

/**
 * `org.dedu.draw.Graph` A model holding all the cells (elements and links) of the diagram
 * * property `cells` stores all the cells
 * @class
 * @augments Backbone.Model
 */
org.dedu.draw.Graph = Backbone.Model.extend({

    initialize:function(attrs,opt){

        opt = opt || {};

        // Passing `cellModel` function in the options object to graph allows for
        // setting models based on attribute objects. This is especially handy
        // when processing JSON graphs that are in a different than JointJS format.
        var cells = new org.dedu.draw.GraphCells([], {
            model: opt.cellModel,
            cellNamespace: opt.cellNamespace,
            graph: this
        });
        Backbone.Model.prototype.set.call(this, 'cells', cells);

        // Make all the events fired in the `cells` collection available.
        // to the outside world.
        this.get("cells").on("all",this.trigger,this);
        this.get('cells').on('remove', this._removeCell, this);


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

        this.selectionSet = [];//user select much elements

        cells.on('add', this._restructureOnAdd, this);
        cells.on('remove', this._restructureOnRemove, this);
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
    isExist:function(id){
        var models = this.get('cells').models;
        for(var i=0;i<models.length;i++){
            if(models[i].get('redID')==id){
                return true;
            }
        }
        return false;
    },

    /**
     * get cell by redID
     * @param {String} redID
     * @returns {org.dedu.draw.Cell}
     */
    getCellByRedID:function(redID) {
        var models = this.get('cells').models;
        for(var i in models){
            if(models[i].get('redID') == redID){
                return models[i];
            }
        }
    },
    /**
     * get a cell from the graph by its `id`
     * @param {String} id
     * @returns {org.dedu.draw.Cell}
     */
    getCell: function(id) {
        return this.get('cells').get(id);
    },

    /**
     * like {@link org.dedu.draw.Graph~getCell},Get all the elemnet and links in the graph.
     * @returns {Array<org.dedu.draw.Cell>}
     */
    getCells: function() {
        return this.get('cells').toArray();
    },

    /**
     * Get all the elements in the graph (i.e. omit links).
     * @returns {Array<org.dedu.draw.Element>}
     */
    getElements: function() {

        return this.get('cells').filter(function(cell) {

            return cell instanceof org.dedu.draw.Element;
        });
    },

    /**
     * Get all the links in the graph (i.e. omit elements).
     * @returns {Array<org.dedu.draw.Link>}
     */
    getLinks: function() {
        return this.get('cells').filter(function(cell) {

            return cell instanceof joint.dia.Link;
        });
    },

    selectAll:function(){

        this.get('cells').models.forEach(function(model){
            model.focus();
        });
        this.selectionSet = this.get('cells').models;
    },

    getAllPosition: function () {
        var nodes = {};
        this.get('cells').models.forEach(function(model){
            if(model instanceof org.dedu.draw.Element){

                if(model instanceof org.dedu.draw.shape.node_red.subflowportModel){
                    nodes[model.get('index')-1] = {position:model.get('position'),type:'subflowport'};
                }else{
                    nodes[model.get('redID')] = {position:model.get('position')};
                }
            }
        });
        return nodes;
    },

    updateSelection: function (selection_models_new) {
        var selection_models = _.difference(this.selectionSet,selection_models_new);
        selection_models.forEach(function(model){
            model.focus();
        });
        this.selectionSet = selection_models_new;
    },

    cancelSelection: function (model_array) {
        var selection_models = _.difference(this.selectionSet,model_array);
        selection_models.forEach(function(model){
            model.unfocus();
        });
        this.selectionSet = [];
    },

    focus:function(model){
        if(this.selectionSet.indexOf(model)==-1){
            this.cancelSelection([model]);
            model.focus();
            this.selectionSet.push(model);
        }
    },

    /**
     * Add a new cell to the graph. If cell is an array, all the cells in the array will be added to the graph.
     * @param {org.dedu.draw.Cell} cell
     * @param options
     * @returns {org.dedu.draw.Graph}
     * @example
     *
     *  var rect = new org.dedu.draw.shape.basic.Rect({
     *   position: { x: 100, y: 100 },
     *   size: { width: 70, height: 30 },
     *   attrs: { text: { text: 'my rectangle' } }
     *   });
     *   var rect2 = rect.clone();
     *   var graph = new org.dedu.draw.Graph();
     *   graph.addCell(rect).addCell(rect2);
     *
     */
    addCell:function(cell,options){
        this.get('cells').add(this._prepareCell(cell), options || {});
        var args ;
        var self = this;
        if(cell instanceof org.dedu.draw.Link){
            cell.on('link:complete',function(){
                args = {
                    source: this.get('source'),
                    target: this.get('target'),
                    redID: this.get('redID'),
                    type: 'link'
                };
                self.notify.apply(this,['node-red:node-link-added'].concat(args));
            },cell);
        }else if(cell instanceof org.dedu.draw.Element){
            args = {
                redID: cell.get('redID'),
                type:'node'
            };
            this.notify.apply(this,['node-red:node-link-added'].concat(args));
        }
        
        return this;
    },

    /**
     * Add new cells to the graph. This is just a syntactic sugar to the addCell method. Calling addCell with an array of cells is an equivalent to calling addCells.
     * @param {Array<org.dedu.draw.Cell>} cells
     * @param options
     * @returns {org.dedu.draw.Graph}
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
     * like {@link org.dedu.draw.Graph~addCells},用于加载很多cell时
     * @param cells
     * @param opt
     * @returns {org.dedu.draw.Graph}
     */
    resetCells: function(cells, opt) {

        this.get('cells').reset(_.map(cells, this._prepareCell, this), opt);

        return this;
    },

    _prepareCell:function(cell){
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

        var lastCell = this.get('cells').last();
        return lastCell ? (lastCell.get('z') || 0) : 0;
    },

    clear: function(opt) {

        opt = _.extend({}, opt, { clear: true });

        var cells = this.get('cells').models;

        if (cells.length === 0) return this;

        this.trigger('batch:start', { batchName: 'clear' });

        // The elements come after the links.
        _.sortBy(cells,function(cell) {
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

    removeSection: function () {
        this.get('cells').remove(this.selectionSet);
        var selectionIDs = {};
        for(var i=0;i<this.selectionSet.length;i++){
            selectionIDs[this.selectionSet[i].get('redID')] = this.selectionSet[i] instanceof org.dedu.draw.Link?'link':'node';
        }
        this.notify.apply(this,['node-red:node-link-removed'].concat(selectionIDs));
        this.selectionSet = [];
    },

    notify:function(evt){
        var args = Array.prototype.slice.call(arguments, 1);
        this.trigger.apply(this, [evt].concat(args));
    },
});

