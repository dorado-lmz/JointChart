/**
 * Created by y50-70 on 2/27/2016.
 */
dedu.plugins = {};

dedu.plugins.Halo = Backbone.View.extend({
    id: "shape_controls",
    options:{
        useModelGeometry: !1,
        handles:[
            {
                name:'resize',
                events:{
                    "pointerdown":'startResizing',
                    "pointermove":'doResize',
                    "pointerup":'stopBatch'
                }
            }
        ]
    },
    events:{
        'mousedown':'onHandlePointerDown'
    },
    initialize:function(options){
        this.options = _.extend({}, _.result(this, "options"), options || {});
        _.defaults(this.options, {
            paper: this.options.cellView.paper,
            graph: this.options.cellView.paper.model
        });
        _.bindAll(this, "pointermove","pointerup");
        this.listenTo(this.options.graph, "all", this.update);
        this.listenTo(this.options.paper, "blank:pointerdown", this.remove);

        $(document.body).on("mousemove touchmove", this.pointermove);
        $(document).on("mouseup touchend", this.pointerup);
    },
    render:function(options){
        var options = this.options = _.extend({}, _.result(this, "options"), options || {});
        if(dedu.plugins.Halo.controls){
            //this.$el = dedu.plugins.Halo.controls;
            //this.$canvas = $('.controls_bounding',this.$el);
            //this.$controler_nw = $(".shape_controller.n.w",this.$el);
            //this.$controler_ne = $(".shape_controller.n.e",this.$el);
            //this.$controler_sw = $(".shape_controller.s.w",this.$el);
            //this.$controler_se = $(".shape_controller.s.e",this.$el);
            this.$el.show();
        }else{

            this.$el.empty();
            this.$canvas = $("<div>").addClass("controls_bounding").appendTo(this.el);
            _.map(this.options.handles,this.renderHandle,this);

            this.$el.appendTo(options.paper.el);
            dedu.plugins.Halo.controls = this.$el;
            _.each(this.options.handles, this.addHandle, this)
        }

        this.update();
        return this;
    },
    update:function(){
        var cellView = this.options.cellView;
        if (!(cellView.model instanceof dedu.Link)) {
            var bbox = cellView.getBBox({
                useModelGeometry: this.options.useModelGeometry
            });
        }
        this.$el.css({
            width:bbox.width,
            height:bbox.height,
            left:bbox.x,
            top:bbox.y
        });
        this.$canvas.css({
            width:bbox.width,
            height:bbox.height,
            border:'1px solid #f00'
        });

        this.$canvas.clearCanvas().drawRect({
            width:bbox.width*2,
            height:bbox.height*2,
            strokeStyle:'#f00'
        });
        this.$controler_ne.css({
            left:bbox.width-4,
            top:-4
        });
        this.$controler_sw.css({
            left:-4,
            top:bbox.height-4
        });
        this.$controler_se.css({
            left:bbox.width-4,
            top:bbox.height-4
        });
    },
    remove:function(){
        this.$el.hide();
        console.log('halo remove')
    },
    renderHandle: function (handle) {
        switch (handle.name){
            case "resize":
                this.$controler_nw = $("<div/>").addClass("shape_controller n w").attr('data-action',handle.name).appendTo(this.el);
                this.$controler_ne = $("<div/>").addClass("shape_controller n e").attr('data-action',handle.name).appendTo(this.el);
                this.$controler_sw = $("<div/>").addClass("shape_controller s w").attr('data-action',handle.name).appendTo(this.el);
                this.$controler_se = $("<div/>").addClass("shape_controller s e").attr('data-action',handle.name).appendTo(this.el);
                break;
            case "rotate":
                break;
        }
    },
    onHandlePointerDown: function (evt) {
        this._action = $(evt.target).closest(".shape_controller").attr("data-action");
        evt = dedu.util.normalizeEvent(evt);
        this._clientX = evt.clientX, this._clientY = evt.clientY, this._startClientX = this._clientX, this._startClientY = this._clientY;
        this.triggerAction(this._action, "pointerdown", evt);
    },
    triggerAction: function (_action,eventName,evt) {
        var args = Array.prototype.slice.call(arguments, 2);
        args.unshift("action:" + _action + ":" + eventName);
        this.trigger.apply(this, args);
    },
    addHandle: function (handle) {
        _.each(handle.events, function (value, key) {
            _.isString(value) ? this.on("action:" + handle.name + ":" + key, this[value], this) : this.on("action:" + handle.name + ":" + key, value)
        },this);
    },
    startResizing: function (evt) {
        this.options.graph.trigger("batch:start");
        this._flip = [1, 0, 0, 1, 1, 0, 0, 1][Math.floor(g.normalizeAngle(this.options.cellView.model.get("angle")) / 45)];
    },
    doResize: function (action,dx,dy) {
        var size = this.options.cellView.model.get('size');
        var width = Math.max(size.width + (this._flip ? dx : dy),1);
        var height = Math.max(size.height + (this._flip ? dy : dx),1);

        this.options.cellView.model.resize(width, height, {
            absolute: !0
        })
    },
    pointermove: function (evt) {

        if(this._action){
            evt.preventDefault();
            evt.stopPropagation();
            evt = dedu.util.normalizeEvent(evt);
            var new_position = this.options.paper.snapToGrid({
                x:evt.clientX,
                y:evt.clientY
            });
            var old_position = this.options.paper.snapToGrid({
                x:this._clientX,
                y:this._clientY
            });
            dx = new_position.x - old_position.x;
            dy = new_position.y - old_position.y;

            this.triggerAction(this._action,"pointermove",evt,dx,dy, evt.clientX - this._startClientX, evt.clientY - this._startClientY);
            this._clientX = evt.clientX, this._clientY = evt.clientY;
        }
    },
    pointerup: function (evt) {
        if(this._action){
            this.triggerAction(this._action, "pointerup", evt);
            delete this._action;
        }
    }
});