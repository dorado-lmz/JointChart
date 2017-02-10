/**
 * `dedu.Element`是所有节点的父类
 * @class
 * @augments dedu.Cell
 */
dedu.Element = dedu.Cell.extend({
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
     * @memberof dedu.Element
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
        selected:false
    },

    position:function(x,y,opt){

    },
    /**
     * @method translate - 更改position
     * @param {Number} tx - x轴偏移量
     * @param {Number} ty - y轴偏移量
     * @param {Object} opt
     * @returns {dedu.Element}
     * @memberof dedu.Element
     */
    translate:function(tx,ty,opt){
        tx = tx || 0;
        ty = ty || 0;
        if(tx === 0 && ty === 0){
            // Like nothing has happened.
            return this;
        }

        opt = opt || {};
        // Pass the initiator of the translation.
        opt.translateBy = opt.translateBy || this.id;
        var position = this.get('position') || { x: 0, y: 0 };

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
     * @returns {dedu.Element}
     * @memberof dedu.Element
     */
    resize: function (width, height, opt) {
        this.set('size', { width: width, height: height }, opt);
        return this;
    }

});

/**
 * `dedu.ElementView`是`dedu.Element`的view
 * @class
 * @augments  dedu.CellView
 */
dedu.ElementView = dedu.CellView.extend({
    /**
     * 用于attrs的特殊属性
     * * style : An object containing CSS styles for a subelement
     * * text : Valid only for <text> subelements.  text attribute contains the text that will be set either directly to the <text> subelement or its <tspan> children depending on whether the text is multiline or not (contains '\n' character(s)).
     * * html :
     * * ref-x : [.5/'50%'/20] > 相对于ref的参照物，x轴的相对距离，如果使用[0,1]或百分比的形式表示比例，或者20表示20px的相对偏移
     * * ref-y : 与ref-x相似
     * * ref-dx : Make x-coordinate of the subelement relative to the right edge of the element referenced to by the selector in ref attribute.
     * * ref-dy : Make y-coordinate of the subelement relative to the bottom edge of the element referenced to by the selector in ref attribute.
     * * ref-width :
     * * ref-height :
     * * ref : 'css selector' > 比如图元中的label使用svg的text标签实现，label相对于图元处于正中间，这种相对定位，使用ref属性
     * * x-alignment' : 如果设置为'middle',子元素会相对于该元素水平居中
     * * y-alignment' : 垂直居中
     * * port : An object containing at least an id property. This property uniquely identifies the port. If a link gets connected to a magnet that has also a port object defined, the id property of the port object will be copied to the port property of the source/target of the link.
     * @member {Array}
     * @memberof dedu.ElementView
     *
     */
    SPECIAL_ATTRIBUTES:[
        'style',
        'text',
        'html',
        'ref-x',
        'ref-y',
        'ref-dx',
        'ref-dy',
        'ref-width',
        'ref-height',
        'ref',
        'x-alignment',
        'y-alignment',
        'port'
    ],

    /**
     * set the attribute of dom node Dom节点的attribute
     * @returns {String}
     * @instance
     * @memberof dedu.ElementView
     */
    className:function(){
        return 'element node '+this.model.get('type').replace('.',' ','g')
    },

    initialize:function(options){

        if(options.skip_render){
            return;
        }
        dedu.CellView.prototype.initialize.apply(this, arguments);

        _.bindAll(this, 'translate', 'resize', 'rotate');

        this.listenTo(this.model, 'change:position', this.translate);
        this.listenTo(this.model, 'change:size', this.resize);
        this.listenTo(this.model, 'change:angle', this.rotate);


    },

    render:function(){
        this.$el.empty();
        this.renderMarkup();
        this.rotatableNode = this.vel.findOne('.rotatable');
        this.scalableNode = this.vel.findOne('.scalable');

        if(this.renderView){
            this.renderView();//留给第三方拓展使用
        }
        this.update();
        this.resize();
        this.rotate();
        this.translate();
        return this;
    },

    // `prototype.markup` is rendered by default. Set the `markup` attribute on the model if the
    // default markup is not desirable.
    renderMarkup:function(){
        var markup = this.model.get('markup') || this.model.markup;
        if(markup){
            var nodes = V(markup);
            this.vel.append(nodes);
        }
    },

    resize:function(){
        var size = this.model.get('size') || {
            width: 1,
            height: 1
        };
        var angle = this.model.get('angle') || 0;

        var scalable = this.scalableNode;
        if (!scalable) {
            // If there is no scalable elements, than there is nothing to resize.
            return;
        }
        var scalableBbox = scalable.bbox(true);
        // Make sure `scalableBbox.width` and `scalableBbox.height` are not zero which can happen if the element does not have any content. By making
        // the width/height 1, we prevent HTML errors of the type `scale(Infinity, Infinity)`.
        scalable.attr('transform', 'scale(' + (size.width / (scalableBbox.width || 1)) + ',' + (size.height / (scalableBbox.height || 1)) + ')');

        this.update();
    },

    /**
     * Default is to process the `attrs` object and set attributes on subelements based on the selectors.
     * @method update
     * @param [cell]
     * @param renderingOnlyAttrs
     */
    update: function(cell, renderingOnlyAttrs) {

        var allAttrs = this.model.get('attrs');

        var rotatable = this.rotatableNode;
        if (rotatable) {
            var rotation = rotatable.attr('transform');
            rotatable.attr('transform', '');
        }

        var relativelyPositioned = [];
        var nodesBySelector = {};

        _.each(renderingOnlyAttrs || allAttrs, function(attrs, selector) {

            // Elements that should be updated.
            var $selected = this.findBySelector(selector);
            // No element matched by the `selector` was found. We're done then.
            if ($selected.length === 0) return;

            nodesBySelector[selector] = $selected;

            // Special attributes are treated by JointJS, not by SVG.
            var specialAttributes = this.SPECIAL_ATTRIBUTES.slice();

            // If the `filter` attribute is an object, it is in the special JointJS filter format and so
            // it becomes a special attribute and is treated separately.
            if (_.isObject(attrs.filter)) {

                specialAttributes.push('filter');
                this.applyFilter($selected, attrs.filter);
            }

            // If the `fill` or `stroke` attribute is an object, it is in the special JointJS gradient format and so
            // it becomes a special attribute and is treated separately.
            if (_.isObject(attrs.fill)) {

                specialAttributes.push('fill');
                this.applyGradient($selected, 'fill', attrs.fill);
            }
            if (_.isObject(attrs.stroke)) {

                specialAttributes.push('stroke');
                this.applyGradient($selected, 'stroke', attrs.stroke);
            }

            // Make special case for `text` attribute. So that we can set text content of the `<text>` element
            // via the `attrs` object as well.
            // Note that it's important to set text before applying the rest of the final attributes.
            // Vectorizer `text()` method sets on the element its own attributes and it has to be possible
            // to rewrite them, if needed. (i.e display: 'none')
            if (!_.isUndefined(attrs.text)) {

                $selected.each(function() {

                    V(this).text(attrs.text + '', { lineHeight: attrs.lineHeight, textPath: attrs.textPath, annotations: attrs.annotations });
                });
                specialAttributes.push('lineHeight', 'textPath', 'annotations');
            }

            // Set regular attributes on the `$selected` subelement. Note that we cannot use the jQuery attr()
            // method as some of the attributes might be namespaced (e.g. xlink:href) which fails with jQuery attr().
            var finalAttributes = _.omit(attrs, specialAttributes);

            $selected.each(function() {

                V(this).attr(finalAttributes);
            });

            // `port` attribute contains the `id` of the port that the underlying magnet represents.
            if (attrs.port) {

                $selected.attr('port', _.isUndefined(attrs.port.id) ? attrs.port : attrs.port.id);
            }

            // `style` attribute is special in the sense that it sets the CSS style of the subelement.
            if (attrs.style) {

                $selected.css(attrs.style);
            }

            if (!_.isUndefined(attrs.html)) {

                $selected.each(function() {

                    $(this).html(attrs.html + '');
                });
            }

            // Special `ref-x` and `ref-y` attributes make it possible to set both absolute or
            // relative positioning of subelements.
            if (!_.isUndefined(attrs['ref-x']) ||
                !_.isUndefined(attrs['ref-y']) ||
                !_.isUndefined(attrs['ref-dx']) ||
                !_.isUndefined(attrs['ref-dy']) ||
                !_.isUndefined(attrs['x-alignment']) ||
                !_.isUndefined(attrs['y-alignment']) ||
                !_.isUndefined(attrs['ref-width']) ||
                !_.isUndefined(attrs['ref-height'])
            ) {

                _.each($selected, function(el, index, list) {
                    var $el = $(el);
                    // copy original list selector to the element
                    $el.selector = list.selector;
                    relativelyPositioned.push($el);
                });
            }

        }, this);

        // We don't want the sub elements to affect the bounding box of the root element when
        // positioning the sub elements relatively to the bounding box.
        //_.invoke(relativelyPositioned, 'hide');
        //_.invoke(relativelyPositioned, 'show');

        // Note that we're using the bounding box without transformation because we are already inside
        // a transformed coordinate system.
        var size = this.model.get('size');
        var bbox = { x: 0, y: 0, width: size.width, height: size.height };

        renderingOnlyAttrs = renderingOnlyAttrs || {};

        _.each(relativelyPositioned, function($el) {

            // if there was a special attribute affecting the position amongst renderingOnlyAttributes
            // we have to merge it with rest of the element's attributes as they are necessary
            // to update the position relatively (i.e `ref`)
            var renderingOnlyElAttrs = renderingOnlyAttrs[$el.selector];
            var elAttrs = renderingOnlyElAttrs
                ? _.merge({}, allAttrs[$el.selector], renderingOnlyElAttrs)
                : allAttrs[$el.selector];

            this.positionRelative(V($el[0]), bbox, elAttrs, nodesBySelector);

        }, this);

        if (rotatable) {

            rotatable.attr('transform', rotation || '');
        }
    },

    /**
     * 相对定位
     * @private
     * @mehtod positionRelative
     * @param vel
     * @param bbox
     * @param attributes
     * @param nodesBySelector
     */
    positionRelative: function(vel, bbox, attributes, nodesBySelector) {

        var ref = attributes['ref'];
        var refDx = parseFloat(attributes['ref-dx']);
        var refDy = parseFloat(attributes['ref-dy']);
        var yAlignment = attributes['y-alignment'];
        var xAlignment = attributes['x-alignment'];

        // 'ref-y', 'ref-x', 'ref-width', 'ref-height' can be defined
        // by value or by percentage e.g 4, 0.5, '200%'.
        var refY = attributes['ref-y'];
        var refYPercentage = _.isString(refY) && refY.slice(-1) === '%';
        refY = parseFloat(refY);
        if (refYPercentage) {
            refY /= 100;
        }

        var refX = attributes['ref-x'];
        var refXPercentage = _.isString(refX) && refX.slice(-1) === '%';
        refX = parseFloat(refX);
        if (refXPercentage) {
            refX /= 100;
        }

        var refWidth = attributes['ref-width'];
        var refWidthPercentage = _.isString(refWidth) && refWidth.slice(-1) === '%';
        refWidth = parseFloat(refWidth);
        if (refWidthPercentage) {
            refWidth /= 100;
        }

        var refHeight = attributes['ref-height'];
        var refHeightPercentage = _.isString(refHeight) && refHeight.slice(-1) === '%';
        refHeight = parseFloat(refHeight);
        if (refHeightPercentage) {
            refHeight /= 100;
        }

        // Check if the node is a descendant of the scalable group.
        var scalable = vel.findParentByClass('scalable', this.el);

        // `ref` is the selector of the reference element. If no `ref` is passed, reference
        // element is the root element.
        if (ref) {

            var vref;

            if (nodesBySelector && nodesBySelector[ref]) {
                // First we check if the same selector has been already used.
                vref = V(nodesBySelector[ref][0]);
            } else {
                // Other wise we find the ref ourselves.
                vref = ref === '.' ? this.vel : this.vel.findOne(ref);
            }

            if (!vref) {
                throw new Error('dia.ElementView: reference does not exists.');
            }

            // Get the bounding box of the reference element relative to the root `<g>` element.
            bbox = vref.bbox(false, this.el);
        }

        // Remove the previous translate() from the transform attribute and translate the element
        // relative to the root bounding box following the `ref-x` and `ref-y` attributes.
        if (vel.attr('transform')) {

            vel.attr('transform', vel.attr('transform').replace(/translate\([^)]*\)/g, '').trim() || '');
        }

        // 'ref-width'/'ref-height' defines the width/height of the subelement relatively to
        // the reference element size
        // val in 0..1         ref-width = 0.75 sets the width to 75% of the ref. el. width
        // val < 0 || val > 1  ref-height = -20 sets the height to the the ref. el. height shorter by 20

        if (isFinite(refWidth)) {

            if (refWidthPercentage || refWidth >= 0 && refWidth <= 1) {

                vel.attr('width', refWidth * bbox.width);

            } else {

                vel.attr('width', Math.max(refWidth + bbox.width, 0));
            }
        }

        if (isFinite(refHeight)) {

            if (refHeightPercentage || refHeight >= 0 && refHeight <= 1) {

                vel.attr('height', refHeight * bbox.height);

            } else {

                vel.attr('height', Math.max(refHeight + bbox.height, 0));
            }
        }

        // The final translation of the subelement.
        var tx = 0;
        var ty = 0;
        var scale;

        // `ref-dx` and `ref-dy` define the offset of the subelement relative to the right and/or bottom
        // coordinate of the reference element.
        if (isFinite(refDx)) {

            if (scalable) {

                // Compensate for the scale grid in case the elemnt is in the scalable group.
                scale = scale || scalable.scale();
                tx = bbox.x + bbox.width + refDx / scale.sx;

            } else {

                tx = bbox.x + bbox.width + refDx;
            }
        }
        if (isFinite(refDy)) {

            if (scalable) {

                // Compensate for the scale grid in case the elemnt is in the scalable group.
                scale = scale || scalable.scale();
                ty = bbox.y + bbox.height + refDy / scale.sy;
            } else {

                ty = bbox.y + bbox.height + refDy;
            }
        }

        // if `refX` is in [0, 1] then `refX` is a fraction of bounding box width
        // if `refX` is < 0 then `refX`'s absolute values is the right coordinate of the bounding box
        // otherwise, `refX` is the left coordinate of the bounding box
        // Analogical rules apply for `refY`.
        if (isFinite(refX)) {

            if (refXPercentage || Math.abs(refX) > 0 && Math.abs(refX) < 1) {

                tx = bbox.x + bbox.width * refX;

            } else if (scalable) {

                // Compensate for the scale grid in case the elemnt is in the scalable group.
                scale = scale || scalable.scale();
                tx = bbox.x + refX / scale.sx;

            } else {

                tx = bbox.x + refX;
            }
        }
        if (isFinite(refY)) {

            if (refYPercentage || Math.abs(refY) > 0 && Math.abs(refY) < 1) {

                ty = bbox.y + bbox.height * refY;

            } else if (scalable) {

                // Compensate for the scale grid in case the elemnt is in the scalable group.
                scale = scale || scalable.scale();
                ty = bbox.y + refY / scale.sy;

            } else {

                ty = bbox.y + refY;
            }
        }

        if (!_.isUndefined(yAlignment) || !_.isUndefined(xAlignment)) {

            var velBBox = vel.bbox(false, this.paper&&this.paper.viewport || this.options.paper&&this.options.paper.viewport);

            // `y-alignment` when set to `middle` causes centering of the subelement around its new y coordinate.
            if (yAlignment === 'middle') {

                ty -= velBBox.height / 2;

            } else if (isFinite(yAlignment)) {

                ty += (yAlignment > -1 && yAlignment < 1) ?  velBBox.height * yAlignment : yAlignment;
            }

            // `x-alignment` when set to `middle` causes centering of the subelement around its new x coordinate.
            if (xAlignment === 'middle') {

                tx -= velBBox.width / 2;

            } else if (isFinite(xAlignment)) {

                tx += (xAlignment > -1 && xAlignment < 1) ?  velBBox.width * xAlignment : xAlignment;
            }
        }

        vel.translate(tx, ty);
    },

    rotate:function(){

    },

    translate:function(){
        var position = this.model.get('position') || {x:0,y:0};
        this.vel.attr('transform','translate('+position.x+','+position.y+')');
    },

    /**
     * 在`rect`内的view
     * @method findMagnetsInArea
     * @param rect
     * @param opt
     * @returns {Array}
     */
    findMagnetsInArea:function(rect, opt) {
        rect = g.rect(rect);
        var views = [this.up,this.down,this.left,this.right];

    //    console.log(this.up.bbox(false,this.paper.viewport));

        return _.filter(views,function(view){
            return view && rect.intersect(g.rect(view.bbox(false,this.paper.viewport)));
        },this);
    },

    /**
     * 处理鼠标按下事件
     * @method pointerdown
     * @param {Event} evt
     * @param {Number} x - 鼠标点击位置的x坐标
     * @param {Number} y - 鼠标点击位置的y坐标
     */
    pointerdown:function(evt,x,y){
        var paper = this.paper;

        var r = 3;
        var viewsInArea = this.findMagnetsInArea({ x: x - r, y: y - r, width: 2 * r, height: 2 * r });

        var distance;
        var minDistance = Number.MAX_VALUE;
        var pointer = g.point(x, y);

        _.each(viewsInArea, function(view) {
            if (view.attr('magnet') !== 'false') {
                // find distance from the center of the model to pointer coordinates
                distance = g.rect(view.bbox(false,this.paper.viewport)).center().distance(pointer);

                // the connection is looked up in a circle area by `distance < r`
                if (distance < r && distance < minDistance) {
                    minDistance = distance;
                    this._closestView = view;
                   // this._closestEnd = { id: view.model.id };

                }
            }
        },this);

        // target is a valid magnet start linking
         if(this._closestView || evt.target.getAttribute('magnet') && paper.options.validateMagnet.call(paper, this, evt.target)){
            //this.model.trigger('batch:start', { batchName: 'add-link' });

            var link = paper.getDefaultLink(this, evt.target);

             if(this._closestView){
                 link.set({
                     source: {
                         id: this.model.id,
                         redID:this.model.get('redID'),
                         selector: this.getSelector(this._closestView.node),
                         port: evt.target.getAttribute('port')
                     },
                 });
             }else{
                 link.set({
                     source: {
                         id: this.model.id,
                         redID: this.model.get('redID'),
                         selector: this.getSelector(evt.target),
                         port: evt.target.getAttribute('port')
                     },
                 });
             }
             link.set({
                 target: { x: x, y: y },
             });


            paper.model.addCell(link);

            this._linkView = paper.findViewByModel(link);

            this._linkView.pointerdown(evt,x,y);
            this._linkView.startArrowheadMove('target');

        }else{
            this._dx = x;
            this._dy = y;


            this.restrictedArea = paper.getRestrictedArea(this);
            dedu.CellView.prototype.pointerdown.apply(this, arguments);
            this.notify('element:pointerdown', evt, x, y);
        }
        this._closestView = null;
    },

    /**
     * 处理鼠标move事件
     * @method pointermove
     * @param {Event} evt
     * @param {Number} tx
     * @param {Number} ty
     * @param localPoint
     */
    pointermove:function(evt,tx,ty,localPoint){
        if(this._linkView){
            // let the linkview deal with this event
            this._linkView.pointermove(evt, localPoint.x, localPoint.y );
        }else{
            var grid = this.paper.options.gridSize;
            var interactive = _.isFunction(this.options.interactive) ? this.options.interactive(this, 'pointermove') : this.options.interactive;
            if (interactive !== false) {
                //var position = this.model.get('position');
                // Make sure the new element's position always snaps to the current grid after
                // translate as the previous one could be calculated with a different grid size.
                //var tx = g.snapToGrid(position.x, grid) - position.x + g.snapToGrid(x - this._dx, grid);
                //var ty = g.snapToGrid(position.y, grid) - position.y + g.snapToGrid(y - this._dy, grid);

                this.model.translate(tx, ty, {
                    restrictedArea: this.restrictedArea,
                    ui: true
                });
            }

            //this._dx = g.snapToGrid(x, grid);
            //this._dy = g.snapToGrid(y, grid);
            dedu.CellView.prototype.pointermove.apply(this, arguments);
            this.notify('element:pointermove', evt, tx, ty);
        }
    },

    /**
     * 处理鼠标up事件
     * @method pointerup
     * @param {Event} evt
     * @param {Number} x
     * @param {Number} y
     */
    pointerup:function(evt,x,y){
        if (this._linkView) {

            var linkView = this._linkView;
            var linkModel = linkView.model;

            // let the linkview deal with this event
            linkView.pointerup(evt, x, y);

            // If the link pinning is not allowed and the link is not connected to an element
            // we remove the link, because the link was never connected to any target element.
            if (!this.paper.options.linkPinning && !_.has(linkModel.get('target'), 'id')) {
                linkModel.remove({ ui: true });
            }
            delete this._linkView;

        }else{
            this.notify('element:pointerup', evt, x, y);
            dedu.CellView.prototype.pointerup.apply(this, arguments);
        }
    }

});
