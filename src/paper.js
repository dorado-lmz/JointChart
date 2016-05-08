org.dedu.draw.Paper = Backbone.View.extend({
    className: 'paper',
    options: {

        width: 800,
        height: 600,
        origin: { x: 0, y: 0 }, // x,y coordinates in top-left corner

        gridSize:1,
        perpendicularLinks: false,
        elementView: org.dedu.draw.ElementView,
        linkView: org.dedu.draw.LinkView,
        interactive: {
            labelMove: false
        },

        snapLinks: { radius: 30 }, // false, true, { radius: value }
        // Marks all available magnets with 'available-magnet' class name and all available cells with
        // 'available-cell' class name. Marks them when dragging a link is started and unmark
        // when the dragging is stopped.
        markAvailable: false,


        // Defines what link model is added to the graph after an user clicks on an active magnet.
        // Value could be the Backbone.model or a function returning the Backbone.model
        // defaultLink: function(elementView, magnet) { return condition ? new customLink1() : new customLink2() }
        defaultLink: new org.dedu.draw.Link,

        // A connector that is used by links with no connector defined on the model.
        // e.g. { name: 'rounded', args: { radius: 5 }} or a function
        defaultConnector: { name: 'normal' },

        // A router that is used by links with no router defined on the model.
        // e.g. { name: 'oneSide', args: { padding: 10 }} or a function
        defaultRouter: null,

        /* CONNECTING */

        // Check whether to add a new link to the graph when user clicks on an a magnet.
        validateMagnet: function(cellView, magnet) {
            return magnet.getAttribute('magnet') !== 'passive';
        },

        // Check whether to allow or disallow the link connection while an arrowhead end (source/target)
        // being changed.
        validateConnection: function(cellViewS, magnetS, cellViewT, magnetT, end, linkView) {
            return (end === 'target' ? cellViewT : cellViewS) instanceof org.dedu.draw.ElementView;
        },

        // Restrict the translation of elements by given bounding box.
        // Option accepts a boolean:
        //  true - the translation is restricted to the paper area
        //  false - no restrictions
        // A method:
        // restrictTranslate: function(elementView) {
        //     var parentId = elementView.model.get('parent');
        //     return parentId && this.model.getCell(parentId).getBBox();
        // },
        // Or a bounding box:
        // restrictTranslate: { x: 10, y: 10, width: 790, height: 590 }
        restrictTranslate: false,

        // When set to true the links can be pinned to the paper.
        // i.e. link source/target can be a point e.g. link.get('source') ==> { x: 100, y: 100 };
        linkPinning: false,

        cellViewNamespace: org.dedu.draw.shape
    },

    constructor:function(options){

        this._configure(options);

        Backbone.View.apply(this, arguments);
    },

    _configure: function (options) {
        if (this.options) options = _.merge({}, _.result(this, 'options'), options);
        this.options = options;
    },

    initialize:function() {

        this.lasso = null;
        this.mouse_mode = 0;

        this.svg = V('svg').node;
        this.viewport = V('g').addClass('viewport').node;
        this.vis = V('g').addClass("vis").node;
        this.outer_background = V('rect').node;

        this.defs = V('defs').node;

        V(this.svg).append([this.viewport,this.defs]);
        V(this.viewport).append(this.vis);
        V(this.vis).append(this.outer_background);
        this.$el.append(this.svg);

        this.listenTo(this.model, 'add', this.onCellAdded);
        this.listenTo(this.model, 'remove', this.removeView);
        this.listenTo(this.model, 'reset', this.resetViews);
        this.listenTo(this.model, 'sort', this.sortViews);




        this.setOrigin();
        this.setDimensions();


        // Hash of all cell views.
        this._views = {};

        this.on({'blank:pointerdown':this.blank_pointDown,'blank:pointermove':this.blank_pointMove,'blank:pointerup':this.blank_pointUp});
        // default cell highlighting
        this.on({ 'cell:highlight': this.onCellHighlight, 'cell:unhighlight': this.onCellUnhighlight });

    },

    events:{
      "mousedown .vis":"canvasMouseDown",
      "mousemove .vis":"canvasMouseMove",
      "mouseup .vis":"canvasMouseUp",
      "mouseover .element":"cellMouseover",
        'dblclick': 'mousedblclick',
        'click': 'mouseclick',

    },

    onCellAdded:function(cell,graph,opt){
        this.renderView(cell);

    },
    
    removeView: function (cell) {
        var view = this._views[cell.id];

        if (view) {
            view.remove();
            delete this._views[cell.id];
        }

        return view;

    },

    resetViews: function () {
        console.log("rest");

    },

    sortViews: function () {
        console.log("sort");

    },


    // Find a view for a model `cell`. `cell` can also be a string representing a model `id`.
    findViewByModel: function(cell) {

        var id = _.isString(cell) ? cell : cell.id;

        return this._views[id];
    },

    // Find all views in given area
    findViewsInArea: function(rect, opt) {

        opt = _.defaults(opt || {}, { strict: false });
        rect = g.rect(rect);

        var views = _.map(this.model.getElements(), this.findViewByModel, this);
        var method = opt.strict ? 'containsRect' : 'intersect';

        return _.filter(views, function(view) {
            return view && rect[method](g.rect(view.vel.bbox(false, this.viewport)));
        }, this);
    },

    getModelById:function(id){

        return this.model.getCell(id);
    },

    renderView:function(cell){
        var view = this._views[cell.id] = this.createViewForModel(cell);
        V(this.vis).append(view.el);
        view.paper = this;
        view.render();

        return view;
    },
    //Find the first view clibing up the DOM tree starting at element 'el'.Note that `el` can also
    // be a selector or a jQuery object.
    findView:function($el){
        var el = _.isString($el)
        ?this.viewport.querySelector($el)
        :$el instanceof $ ? $el[0]:$el;

        while(el && el !== this.el && el !== document){
            var id = el.getAttribute('model-id');
            if(id) return this._views[id];

            el = el.parentNode;

        }
        return undefined;
    },
    // Returns a geometry rectangle represeting the entire
    // paper area (coordinates from the left paper border to the right one
    // and the top border to the bottom one).
    getArea:function(){
         var transformationMatrix = this.viewport.getCTM().inverse();
    },

    getRestrictedArea:function(){
        var restrictedArea;
        if (_.isFunction(this.options.restrictTranslate)) {
        }else if(this.options.restrictedTranslate === true){
            restrictedArea = this.getArea();
        }else{
            restrictedArea = this.options.restrictTranslate || null;
        }

        return restrictedArea;

    },

    snapToGrid:function(p){
        // Convert global coordinates to the local ones of the `viewport`. Otherwise,
        // improper transformation would be applied when the viewport gets transformed (scaled/rotated).

        var localPoint = V(this.viewport).toLocalPoint(p.x, p.y);

        return {
            x:g.snapToGrid(localPoint.x,this.options.gridSize),
            y:g.snapToGrid(localPoint.y,this.options.gridSize)
        };
    },

    createViewForModel:function(cell){
        // Model to View
                // A class taken from the paper options.
        var optionalViewClass;

        // A default basic class (either dia.ElementView or dia.LinkView)
        var defaultViewClass;

        var namespace = this.options.cellViewNamespace;
        var type = cell.get('type') + "View";

        var namespaceViewClass = org.dedu.draw.util.getByPath(namespace,type,".");

        if (cell.isLink()) {
            optionalViewClass = this.options.linkView;
            defaultViewClass = org.dedu.draw.LinkView;
        } else {
            optionalViewClass = this.options.elementView;
            defaultViewClass = org.dedu.draw.ElementView;
        }

        var ViewClass = (optionalViewClass.prototype instanceof Backbone.View)
        ? namespaceViewClass || optionalViewClass
        : optionalViewClass.call(this,cell) || namespaceViewClass || defaultViewClass;

        return new ViewClass({
            model:cell,
            interactive: this.options.interactive,
            paper:this
        });

    },

    // Cell highlighting
    // -----------------
    onCellHighlight: function (cellView, el) {
        V(el).addClass('highlighted');
    },

    onCellUnhighlight: function (cellView, el) {
        V(el).removeClass('highlighted');
    },


    blank_pointDown:function(evt,x,y){
        this.model.cancelSelection();

        var lasso = this.lasso;
        var mouse_mode = this.mouse_mode;

        if (mouse_mode === 0) {
            if (lasso) {
                lasso.remove();
                lasso = null;
            }

            var point = [x, y];
            var rect = V('rect')
                .attr("ox", point[0])
                .attr("oy", point[1])
                .attr("rx", 1)
                .attr("ry", 1)
                .attr("x", point[0])
                .attr("y", point[1])
                .attr("width", 0)
                .attr("height", 0)
                .attr("class", "lasso");
            this.lasso = rect;
            V(this.vis).append(rect);
        }
        this.trigger("blank_pointDown");
    },

    blank_pointMove:function(evt,x,y){
        var mouse_position = [evt.offsetX, evt.offsetY];
        var lasso = this.lasso;
        var mouse_mode = this.mouse_mode;
        if (lasso) {
            var ox = parseInt(lasso.attr("ox"));
            var oy = parseInt(lasso.attr("oy"));
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var w;
            var h;
            if (mouse_position[0] < ox) {
                x = mouse_position[0];
                w = ox - x;
            } else {
                w = mouse_position[0] - x;
            }
            if (mouse_position[1] < oy) {
                y = mouse_position[1];
                h = oy - y;
            } else {
                h = mouse_position[1] - y;
            }
            lasso
                .attr("x", x)
                .attr("y", y)
                .attr("width", w)
                .attr("height", h);
            return;
        }
    },

    blank_pointUp:function(evt,x,y){
        var lasso = this.lasso;
        var mouse_mode = this.mouse_mode;
        if (lasso) {
            this.model.selectionSet = [];

            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var x2 = x + parseInt(lasso.attr("width"));
            var y2 = y + parseInt(lasso.attr("height"));


            var selection_models = [];
            _.each(this._views, function (cellView) {
                if(cellView instanceof org.dedu.draw.LinkView){
                    return;
                }
                var model = cellView.model;
                var position = model.get('position');

                model.set('selected',position.x>x && position.x<x2 && position.y>y && position.y<y2);
                if(model.get('selected')){
                    selection_models.push(cellView.model);
                }

            },this);

            this.model.updateSelection(selection_models);

            lasso.remove();
            lasso = null;
        }
        this.trigger('paper:selection_create', evt);
    },

    canvasMouseDown:function(evt){

        evt.preventDefault();

        var evt = org.dedu.draw.util.normalizeEvent(evt);
        var view = this.findView(evt.target);

        if (this.guard(evt, view)) return;

        var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });
        if(view){
            if(this.guard(evt,view)) return;

            this.model.focus(view.model);
            this.sourceView = view;
            this.sourceView.pointerdown(evt, localPoint.x, localPoint.y);


        }else{
            this.trigger('blank:pointerdown', evt, localPoint.x, localPoint.y);
        }

        this.trigger('paper:selection_create', evt);
    },

    canvasMouseMove:function(evt){

        evt.preventDefault();
        evt = org.dedu.draw.util.normalizeEvent(evt);
        var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });
        if(this.sourceView){
            if(this.sourceView instanceof org.dedu.draw.LinkView){
                this.sourceView.pointermove(evt,localPoint.x,localPoint.y);
                return;
            }
            //Mouse moved counter.
            // this._mousemoved++;
            var grid = this.options.gridSize;
            var position = this.sourceView.model.get('position');
            var tx = g.snapToGrid(position.x, grid) - position.x + g.snapToGrid(localPoint.x - this.sourceView._dx, grid);
            var ty = g.snapToGrid(position.y, grid) - position.y + g.snapToGrid(localPoint.y - this.sourceView._dy, grid);
            this.sourceView._dx = g.snapToGrid(localPoint.x, grid);
            this.sourceView._dy = g.snapToGrid(localPoint.y, grid);

            _.each(this.model.selectionSet, function (model) {
                this.findViewByModel(model).pointermove(evt,tx,ty,localPoint);
            },this);

        }else{
            this.trigger('blank:pointermove', evt, localPoint.x, localPoint.y);
        }

    },

    canvasMouseUp:function(evt){
        evt = org.dedu.draw.util.normalizeEvent(evt);

        var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });

        if (this.sourceView) {

            this.sourceView.pointerup(evt, localPoint.x, localPoint.y);

            //"delete sourceView" occasionally throws an error in chrome (illegal access exception)
            this.sourceView = null;

        } else {

            this.trigger('blank:pointerup', evt, localPoint.x, localPoint.y);
        }
    },


    setOrigin:function(ox,oy) {
        this.options.origin.x = ox || 0;
        this.options.origin.y = oy || 0;

        V(this.viewport).translate(ox,oy,{absolut:true});

        this.trigger('translate',ox,oy);  //trigger event translate
    },

    setDimensions:function(width,height) {
           width = this.options.width = width || this.options.width;
           height = this.options.height = height || this.options.height;

           V(this.svg).attr({width:width,height:height});
           V(this.outer_background).attr({width:width,height:height,fill:'#fff'});

           this.trigger('resize',width,height);
    },

    // Interaction.
    // ------------

    mousedblclick: function(evt) {

        evt.preventDefault();
        evt = org.dedu.draw.util.normalizeEvent(evt);

        var view = this.findView(evt.target);
        if (this.guard(evt, view)) return;

        var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });

        if (view) {

            view.pointerdblclick(evt, localPoint.x, localPoint.y);

        } else {

            this.trigger('blank:pointerdblclick', evt, localPoint.x, localPoint.y);
        }
    },

    mouseclick: function(evt) {

        // Trigger event when mouse not moved.
        if (this._mousemoved <= this.options.clickThreshold) {

            evt = org.dedu.draw.util.normalizeEvent(evt);

            var view = this.findView(evt.target);
            if (this.guard(evt, view)) return;

            var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });

            if (view) {

                view.pointerclick(evt, localPoint.x, localPoint.y);

            } else {

                this.trigger('blank:pointerclick', evt, localPoint.x, localPoint.y);
            }
        }

        this._mousemoved = 0;
    },

    pointermove:function(){
        console.log("move~");
    },

    touchstart:function(){
        console.log("touch");

    },

    touchmove:function(){
        console.log("touchmove");

    },

    cellMouseover:function(evt){

        evt = org.dedu.draw.util.normalizeEvent(evt);
        var view = this.findView(evt.target);
        if(view){
            if(this.guard(evt,view)) return;
            view.mouseover(evt);
        }
    },

    // Guard guards the event received. If the event is not interesting, guard returns `true`.
    // Otherwise, it return `false`.
    guard: function(evt, view) {
        if(view && view.model && (view.model instanceof org.dedu.draw.Cell)){
            return false;
        }else if (this.svg === evt.target || this.el === evt.target || $.contains(this.svg, evt.target)) {
            return false;
        }
        return true; //Event guarded. Paper should not react on it in any way.
    },

    getDefaultLink: function (cellView, magnet) {

        return _.isFunction(this.options.defaultLink)
            // default link is a function producing link model
            ? this.options.defaultLink.call(this, cellView, magnet)
            // default link is the Backbone model
            : this.options.defaultLink.clone();
    }

});
