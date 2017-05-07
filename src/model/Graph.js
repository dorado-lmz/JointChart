define(["backbone"], function(Backbone) {
    Graph = Backbone.Model.extend({
        initialize: function(cell, opt) {
          opt = opt || {};

            var cells = cells || new GraphCells(options.models || [], {
                // model: opt.cellModel,
                // cellNamespace: opt.cellNamespace,
                graph: this
            });
            this.set('cells', cells);
            this.set('id', util.uuid());
            this.set('type', 'graph');
            cells.on('add', this._restructureOnAdd, this);
            cells.on('remove', this._restructureOnRemove, this);
            // `_nodes` is useful for quick lookup of all the elements in the graph, without
            // having to go through the whole cells array.
            // [node ID] -> true
            this._nodes = {};
            // `_edges` is useful for quick lookup of all the links in the graph, without
            // having to go through the whole cells array.
            // [edge ID] -> true
            this._edges = {};
            // Outgoing edges per node. Note that we use a hash-table for the list
            // of outgoing edges for a faster lookup.
            // [node ID] -> Object [edge] -> true
            this._out = {};
            // Ingoing edges per node.
            // [node ID] -> Object [edge] -> true
            this._in = {};
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
        active: function(model) {
            this.get("cells").on("all", model.trigger, model);
        },
        deactive: function(model) {
            this.get("cells").off("all", model.trigger, model);
        }
    });
    return Graph;
});
