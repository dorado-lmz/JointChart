define(['./CellView', '../core', 'underscore', "text!../templates/link.html", '../geometry', '../routers/routers.manhattan','../connectors/connectors.normal'],
function(CellView, core, _, LinkTemplate, g) {
    var util = core.util;
    /**
     * `LinkView`是{@link link}的view and is responsible for rendering a link with properties defined in its model
     * @class
     * @augments CellView
     */
    LinkView = CellView.extend({

        /**
         * @override
         * @returns {string}
         */
        className: function() {
            return _.unique(this.model.get("type").split(".").concat("link")).join(" ")
        },

        template: _.template(LinkTemplate),

        initialize: function(opts) {
            this.options = _.extend({}, _.result(this, "options"), opts || {});

            CellView.prototype.initialize.apply(this, arguments);

            // create methods in prototype, so they can be accessed from any instance and
            // don't need to be create over and over
            if ("function" != typeof this.constructor.prototype.watchSource) {
                this.constructor.prototype.watchSource = this.createWatcher("source");
                this.constructor.prototype.watchTarget = this.createWatcher("target");
            }

            // `_.labelCache` is a mapping of indexes of labels in the `this.get('labels')` array to
            // `<g class="label">` nodes wrapped by Vectorizer. This allows for quick access to the
            // nodes in `updateLabelPosition()` in order to update the label positions.
            this._labelCache = {};

            // keeps markers bboxes and positions again for quicker access
            this._markerCache = {};

            //this.listenTo(this.options.paper, "blank:pointerdown", this.unfocus);

            // bind events
            this.startListening();

            this.model.on('change:selected', function() {
                if (this.model.get("selected")) {
                    this.focus();
                } else {
                    this.unfocus();
                }
            }, this);

            this.model.on('change:labels', function() {
                this.renderLabels();
                this.updateLabelPositions();
            }, this);
        },
        // Event Binding. The controller part.
        // ---------------------------------
        // Returns a function observing changes on an end of the link. If a change happens and new end is a new model,
        // it stops listening on the previous one and starts listening to the new one.
        createWatcher: function(endType) {
            // create handler for specific end type (source|target).
            var onModelChange = _.partial(this.onEndModelChange, endType);

            function watchEndModel(link, end) {

                end = end || {};

                var endModel = null;
                var previousEnd = link.previous(endType) || {};

                if (previousEnd.id) {
                    this.stopListening(this.paper.getModelById(previousEnd.id), 'change', onModelChange);
                }

                if (end.id) {
                    // If the observed model changes, it caches a new bbox and do the link update.
                    endModel = this.paper.getModelById(end.id);
                    this.listenTo(endModel, 'change', onModelChange);
                }

                onModelChange.call(this, endModel, {
                    cacheOnly: true
                });

                return this;
            }

            return watchEndModel;
        },

        onEndModelChange: function(endType, endModel, opt) {

            var doUpdate = !opt.cacheOnly;
            var end = this.model.get(endType) || {};

            if (endModel) {
                var selector = this.constructor.makeSelector(end);
                var oppositeEndType = endType == 'source' ? 'target' : 'source';
                var oppositeEnd = this.model.get(oppositeEndType) || {};
                var oppositeSelector = oppositeEnd.id && this.constructor.makeSelector(oppositeEnd);

                // Caching end models bounding boxes.
                // If `opt.handleBy` equals the client-side ID of this link view and it is a loop link, then we already cached
                // the bounding boxes in the previous turn (e.g. for loop link, the change:source event is followed
                // by change:target and so on change:source, we already chached the bounding boxes of - the same - element).
                if (opt.handleBy === this.cid && selector == oppositeSelector) {

                    // Source and target elements are identical. We're dealing with a loop link. We are handling `change` event for the
                    // second time now. There is no need to calculate bbox and find magnet element again.
                    // It was calculated already for opposite link end.
                    this[endType + 'BBox'] = this[oppositeEndType + 'BBox'];
                    this[endType + 'View'] = this[oppositeEndType + 'View'];
                    this[endType + 'Magnet'] = this[oppositeEndType + 'Magnet'];

                } else if (opt.translateBy) {
                    // `opt.translateBy` optimizes the way we calculate bounding box of the source/target element.
                    // If `opt.translateBy` is an ID of the element that was originally translated. This allows us
                    // to just offset the cached bounding box by the translation instead of calculating the bounding
                    // box from scratch on every translate.

                    var bbox = this[endType + 'BBox'];
                    bbox.x += opt.tx;
                    bbox.y += opt.ty;
                    var path = this.model.get('vertices');
                    if (path) {
                        if (endType === 'source') {
                            var source = path[0];
                            path = path.slice(path.length - 1);
                            path.unshift({
                                x: source.x + opt.tx,
                                y: source.y + opt.ty
                            });
                        } else {
                            var target = path[path.length - 1];
                            path = path.slice(0, 1);
                            path.push({
                                x: target.x + opt.tx,
                                y: target.y + opt.ty
                            });
                        }
                        this.model.set('vertices', path, {
                            silent: true
                        });
                    }

                } else {
                    // The slowest path, source/target could have been rotated or resized or any attribute
                    // that affects the bounding box of the view might have been changed.

                    var view = this.paper.findViewByModel(end.id);
                    var magnetElement = view.el.querySelector(selector);

                    this[endType + 'BBox'] = view.getStrokeBBox(magnetElement);
                    this[endType + 'View'] = view;
                    this[endType + 'Magnet'] = magnetElement;
                }

                if (opt.handleBy === this.cid && opt.translateBy &&
                    this.model.isEmbeddedIn(endModel) &&
                    !_.isEmpty(this.model.get('vertices'))) {
                    // Loop link whose element was translated and that has vertices (that need to be translated with
                    // the parent in which my element is embedded).
                    // If the link is embedded, has a loop and vertices and the end model
                    // has been translated, do not update yet. There are vertices still to be updated (change:vertices
                    // event will come in the next turn).
                    doUpdate = false;
                }

                if (!this.updatePostponed && oppositeEnd.id) {
                    // The update was not postponed (that can happen e.g. on the first change event) and the opposite
                    // end is a model (opposite end is the opposite end of the link we're just updating, e.g. if
                    // we're reacting on change:source event, the oppositeEnd is the target model).

                    var oppositeEndModel = this.paper.getModelById(oppositeEnd.id);

                    // Passing `handleBy` flag via event option.
                    // Note that if we are listening to the same model for event 'change' twice.
                    // The same event will be handled by this method also twice.
                    if (end.id === oppositeEnd.id) {
                        // We're dealing with a loop link. Tell the handlers in the next turn that they should update
                        // the link instead of me. (We know for sure there will be a next turn because
                        // loop links react on at least two events: change on the source model followed by a change on
                        // the target model).
                        opt.handleBy = this.cid;
                    }

                    if (opt.handleBy === this.cid || (opt.translateBy && oppositeEndModel.isEmbeddedIn(opt.translateBy))) {

                        // Here are two options:
                        // - Source and target are connected to the same model (not necessarily the same port).
                        // - Both end models are translated by the same ancestor. We know that opposite end
                        //   model will be translated in the next turn as well.
                        // In both situations there will be more changes on the model that trigger an
                        // update. So there is no need to update the linkView yet.
                        this.updatePostponed = true;
                        doUpdate = false;
                    }
                }

            } else {

                // the link end is a point ~ rect 1x1
                this[endType + 'BBox'] = g.rect(end.x || 0, end.y || 0, 1, 1);
                this[endType + 'View'] = this[endType + 'Magnet'] = null;
            }

            // keep track which end had been changed very last
            this.lastEndChange = endType;

            doUpdate && this.update();
        },

        startListening: function() {
            var model = this.model;

            this.listenTo(model, 'change:vertices', this.update);
            this.listenTo(model, 'change:source', this.onSourceChange);
            this.listenTo(model, 'change:target', this.onTargetChange);
        },

        onVerticesChange: function(cell, changed, opt) {

            //this.renderVertexMarkers();
        },

        render: function() {
            this.$el.empty();

            var content = this.template({
                "marker_end": core.marker_end.id
            });
            var children = Snap.fragment(content);
            // Cache all children elements for quicker access.
            this._V = {}; //vectorized markup;

            this.vel.append(children);
            this._V.connection_background = this.vel.select('.connection_background');
            this._V.connection_outline = this.vel.select('.connection_outline');
            this._V.connection_line = this.vel.select('.connection_line');

            // start watching the ends of the link for changes
            this.watchSource(this.model, this.model.get('source'))
                .watchTarget(this.model, this.model.get('target'))
                .update();

            return this;
        },

        // Update. The controller part.
        // ---------------------------------
        // Default is to process the `attrs` object and set attributes on subelements based on the selectors.
        update: function() {
            // Update attributes.
            _.each(this.model.get('attrs'), function(attrs, selector) {

                var processedAttributes = [];

                // If the `fill` or `stroke` attribute is an object, it is in the special JointJS gradient format and so
                // it becomes a special attribute and is treated separately.
                if (_.isObject(attrs.fill)) {

                    this.applyGradient(selector, 'fill', attrs.fill);
                    processedAttributes.push('fill');
                }

                if (_.isObject(attrs.stroke)) {

                    this.applyGradient(selector, 'stroke', attrs.stroke);
                    processedAttributes.push('stroke');
                }

                // If the `filter` attribute is an object, it is in the special JointJS filter format and so
                // it becomes a special attribute and is treated separately.
                if (_.isObject(attrs.filter)) {

                    this.applyFilter(selector, attrs.filter);
                    processedAttributes.push('filter');
                }

                // remove processed special attributes from attrs
                if (processedAttributes.length > 0) {

                    processedAttributes.unshift(attrs);
                    attrs = _.omit.apply(_, processedAttributes);
                }

                this.findBySelector(selector).attr(attrs);
            }, this);

            // Path finding
            var vertices = this.route = [];//this.findRoute(this.model.get('vertices') || []);

            // this.model.set('vertices', [], { silent: true });

            // finds all the connection points taking new vertices into account
            this._findConnectionPoints(vertices);

            var pathData = this.getPathData(vertices);

            // The markup needs to contain a `.connection`
            this._V.connection_background.attr({
                'd': pathData
            });
            this._V.connection_outline.attr({
                'd': pathData
            });
            this._V.connection_line.attr({
                'd': pathData
            });

            // this._translateAndAutoOrientArrows(this._V.markerSource, this._V.markerTarget);
            if (this.model.get('selected')) {
                this._V.connection_line.attr({
                    'stroke': '#ff7f0e'
                });
            } else {
                this._V.connection_line.attr({
                    'stroke': 'blue'
                });
            }
        },


        findRoute: function(oldVertices) {

            var defaultRouter = this.paper.options.defaultRouter;

            var router = defaultRouter;

            var routerFn = _.isFunction(router) ? router : core.routers[router.name];

            if (!_.isFunction(routerFn)) {
                throw new Error('unknown router: "' + router + '"');
            }

            var newVertices = routerFn.call(this, oldVertices || [], {}, this);

            return newVertices;
        },

        // Return the `d` attribute value of the `<path>` element representing the link
        // between `source` and `target`.
        getPathData: function(vertices) {

            var defaultConnector = this.paper.options.defaultConnector;
            var connector = defaultConnector;

            var connectorFn = _.isFunction(connector) ? connector : core.connectors[connector.name];
            // var args = connector.args || {};

            if (!_.isFunction(connectorFn)) {
                throw 'unknown connector: ' + connector;
            }

            var pathData = connectorFn.call(
                this,
                this.sourcePoint, // Note that the value is translated by the size
                this.targetPoint, // of the marker. (We'r not using this.sourcePoint)
                vertices || (this.model.get('vertices') || {}),
                {}, //options
                this
            );

            return pathData;
        },

        _findConnectionPoints: function(vertices) {
            // cache source and target points
            var sourcePoint, targetPoint;

            var firstVertex = _.first(vertices);

            sourcePoint = this.getConnectionPoint(
                'source', this.model.get('source'), firstVertex || this.model.get('target')
            ).round();

            var lastVertex = _.last(vertices);

            targetPoint = this.getConnectionPoint(
                'target', this.model.get('target'), lastVertex || sourcePoint
            ).round();

            // make connection points public
            this.sourcePoint = sourcePoint;
            this.targetPoint = targetPoint;
        },

        // Find a point that is the start of the connection.
        // If `selectorOrPoint` is a point, then we're done and that point is the start of the connection.
        // If the `selectorOrPoint` is an element however, we need to know a reference point (or element)
        // that the link leads to in order to determine the start of the connection on the original element.
        getConnectionPoint: function(end, selectorOrPoint, referenceSelectorOrPoint) {
            var spot;

            // If the `selectorOrPoint` (or `referenceSelectorOrPoint`) is `undefined`, the `source`/`target` of the link model is `undefined`.
            // We want to allow this however so that one can create links such as `var link = new joint.dia.Link` and
            // set the `source`/`target` later.dfa
            _.isEmpty(selectorOrPoint) && (selectorOrPoint = {
                x: 0,
                y: 0
            });
            _.isEmpty(referenceSelectorOrPoint) && (referenceSelectorOrPoint = {
                x: 0,
                y: 0
            });

            if (!selectorOrPoint.id) {
                // If the source is a point, we don't need a reference point to find the sticky point of connection.
                spot = g.point(selectorOrPoint);
            } else {
                // If the source is an element, we need to find a point on the element boundary that is closest
                // to the reference point (or reference element).
                // Get the bounding box of the spot relative to the paper viewport. This is necessary
                // in order to follow paper viewport transformations (scale/rotate).
                // `_sourceBbox` (`_targetBbox`) comes from `_sourceBboxUpdate` (`_sourceBboxUpdate`)
                // method, it exists since first render and are automatically updated
                var spotBbox = end === 'source' ? this.sourceBBox : this.targetBBox;

                var reference;

                if (!referenceSelectorOrPoint.id) {

                    // Reference was passed as a point, therefore, we're ready to find the sticky point of connection on the source element.
                    reference = g.point(referenceSelectorOrPoint);


                } else {
                    // Reference was passed as an element, therefore we need to find a point on the reference
                    // element boundary closest to the source element.
                    // Get the bounding box of the spot relative to the paper viewport. This is necessary
                    // in order to follow paper viewport transformations (scale/rotate).
                    var referenceBbox = end === 'source' ? this.targetBBox : this.sourceBBox;

                    reference = g.rect(referenceBbox).intersectionWithLineFromCenterToPoint(g.rect(spotBbox).center());
                    reference = reference || g.rect(referenceBbox).center();
                }

                // If `perpendicularLinks` flag is set on the paper and there are vertices
                // on the link, then try to find a connection point that makes the link perpendicular
                // even though the link won't point to the center of the targeted object.
                if (this.paper.options.perpendicularLinks || this.options.perpendicular) {

                    var horizontalLineRect = g.rect(0, reference.y, this.paper.options.width, 1);
                    var verticalLineRect = g.rect(reference.x, 0, 1, this.paper.options.height);
                    var nearestSide;

                    if (horizontalLineRect.intersect(g.rect(spotBbox))) {

                        nearestSide = g.rect(spotBbox).sideNearestToPoint(reference);
                        switch (nearestSide) {
                            case 'left':
                                spot = g.point(spotBbox.x, reference.y);
                                break;
                            case 'right':
                                spot = g.point(spotBbox.x + spotBbox.width, reference.y);
                                break;
                            default:
                                spot = g.rect(spotBbox).center();
                                break;
                        }

                    } else if (verticalLineRect.intersect(g.rect(spotBbox))) {

                        nearestSide = g.rect(spotBbox).sideNearestToPoint(reference);
                        switch (nearestSide) {
                            case 'top':
                                spot = g.point(reference.x, spotBbox.y);
                                break;
                            case 'bottom':
                                spot = g.point(reference.x, spotBbox.y + spotBbox.height);
                                break;
                            default:
                                spot = g.rect(spotBbox).center();
                                break;
                        }

                    } else {

                        // If there is no intersection horizontally or vertically with the object bounding box,
                        // then we fall back to the regular situation finding straight line (not perpendicular)
                        // between the object and the reference point.

                        spot = g.rect(spotBbox).intersectionWithLineFromCenterToPoint(reference);
                        spot = spot || g.rect(spotBbox).center();
                    }

                } else if (this.paper.options.linkConnectionPoint) {

                    var view = end === 'target' ? this.targetView : this.sourceView;
                    var magnet = end === 'target' ? this.targetMagnet : this.sourceMagnet;

                    spot = this.paper.options.linkConnectionPoint(this, view, magnet, reference);

                } else {

                    spot = g.rect(spotBbox).intersectionWithLineFromCenterToPoint(reference);
                    spot = spot || g.rect(spotBbox).center();
                }

            }
            return spot;
        },

        onSourceChange: function(cell, source) {

            this.watchSource(cell, source).update();

        },

        onTargetChange: function(cell, target) {

            this.watchTarget(cell, target).update();

        },

        // Interaction. The controller part.
        // ---------------------------------
        pointerdown: function(evt, x, y) {
            CellView.prototype.pointerdown.apply(this, arguments);

            this._dx = x;
            this._dy = y;

            // if are simulating pointerdown on a link during a magnet click, skip link interactions
            if (evt.target.getAttribute('magnet') != null) return;

            var interactive = _.isFunction(this.options.interactive) ? this.options.interactive(this, 'pointerdown') : this.options.interactive;
            if (interactive === false) return;

            var className = evt.target.getAttribute('class');
            // var parentClassName = evt.target.parentNode.getAttribute('class');
            // var labelNode;
            // if (parentClassName === 'label') {
            //     className = parentClassName;
            //     labelNode = evt.target.parentNode;
            // } else {
            //     labelNode = evt.target;
            // }

            switch (className) {
                case 'marker-arrowhead':
                    if (this.can('arrowheadMove')) {
                        this.startArrowheadMove(evt.target.getAttribute('end'));
                    }
                    break;

                // case 'connection_background':
                //     //if (this.can('labelMove')) {
                //     //    this._action = 'label-move';
                //     //    this._labelIdx = parseInt(V(labelNode).attr('label-idx'), 10);
                //     //    // Precalculate samples so that we don't have to do that
                //     //    // over and over again while dragging the label.
                //     //    this._samples = this._V.connection.sample(1);
                //     //    this._linkLength = this._V.connection.node.getTotalLength();
                //     //}
                //     this.notify('link:pointerdown', evt, x, y);
                //     break;
            }


            // var targetParentEvent = evt.target.parentNode.getAttribute('event');
            this.focus();
        },

        pointerdblclick: function(evt, x, y) {

            var m = g.line(g.point(this.sourcePoint.x, this.sourcePoint.y), g.point(this.targetPoint.x, this.targetPoint.y)).midpoint();
            x = m.x - 8;
            y = m.y - 8;
            CellView.prototype.pointerdblclick.apply(this, arguments);
        },

        pointermove: function(evt, x, y) {

            switch (this._action) {
                case 'arrowhead-move':
                    if (this.paper.options.snapLinks) {
                        var r = this.paper.options.snapLinks.radius || 50;
                        var viewsInArea = this.paper.findViewsInArea({
                            x: x - r,
                            y: y - r,
                            width: 2 * r,
                            height: 2 * r
                        });

                        this._closestView && this._closestView.unhighlight(this._closestEnd.selector, {
                            connecting: true,
                            snapping: true
                        });
                        this._closestView = this._closestEnd = null;

                        var distance;
                        var minDistance = Number.MAX_VALUE;
                        var pointer = g.point(x, y);

                        _.each(viewsInArea, function(view) {

                            if (this.paper.findViewByModel(this.model.get('source').id) == view) {
                                return;
                            }
                            // skip connecting to the element in case '.': { magnet: false } attribute present
                            if (view.el.getAttribute('magnet') == 'true') {

                                // find distance from the center of the model to pointer coordinates
                                distance = view.model.getBBox().center().distance(pointer);

                                // the connection is looked up in a circle area by `distance < r`
                                if (distance < r && distance < minDistance) {

                                    if (this.paper.options.validateConnection.apply(
                                            this.paper, this._validateConnectionArgs(view, null)
                                        )) {
                                        minDistance = distance;
                                        this._closestView = view;
                                        this._closestEnd = {
                                            id: view.model.id
                                        };
                                    }
                                }
                            }

                            view.$('[magnet]').each(_.bind(function(index, magnet) {

                                var bbox = Snap(magnet).bbox(false, this.paper.viewport);

                                distance = pointer.distance({
                                    x: bbox.x + bbox.width / 2,
                                    y: bbox.y + bbox.height / 2
                                });

                                if (distance < r && distance < minDistance) {

                                    if (this.paper.options.validateConnection.apply(
                                            this.paper, this._validateConnectionArgs(view, magnet)
                                        )) {
                                        minDistance = distance;
                                        this._closestView = view;
                                        this._closestEnd = {
                                            id: view.model.id,
                                            redID: view.model.get('redID'),
                                            // selector: view.getSelector(magnet),
                                            //port: magnet.getAttribute('port')
                                        };
                                    }
                                }

                            }, this));

                        }, this);

                        this._closestView && this._closestView.highlight(this._closestEnd.selector, {
                            connecting: true,
                            snapping: true
                        });

                        this.model.set(this._arrowhead, this._closestEnd || {
                            x: x,
                            y: y
                        }, {
                            ui: true
                        });

                    } else {
                        // checking views right under the pointer

                        // Touchmove event's target is not reflecting the element under the coordinates as mousemove does.
                        // It holds the element when a touchstart triggered.
                        var target = (evt.type === 'mousemove') ? evt.target : document.elementFromPoint(evt.clientX, evt.clientY);
                        if (this._targetEvent !== target) {
                            // Unhighlight the previous view under pointer if there was one.
                            this._magnetUnderPointer && this._viewUnderPointer.unhighlight(this._magnetUnderPointer, {
                                connecting: true
                            });
                            this._viewUnderPointer = this.paper.findView(target);
                            if (this._viewUnderPointer) {
                                // If we found a view that is under the pointer, we need to find the closest
                                // magnet based on the real target element of the event.
                                this._magnetUnderPointer = this._viewUnderPointer.findMagnet(target);

                                if (this._magnetUnderPointer && this.paper.options.validateConnection.apply(
                                        this.paper,
                                        this._validateConnectionArgs(this._viewUnderPointer, this._magnetUnderPointer)
                                    )) {

                                    // If there was no magnet found, do not highlight anything and assume there
                                    // is no view under pointer we're interested in reconnecting to.
                                    // This can only happen if the overall element has the attribute `'.': { magnet: false }`.
                                    this._magnetUnderPointer && this._viewUnderPointer.highlight(this._magnetUnderPointer, {
                                        connecting: true
                                    });
                                } else {
                                    // This type of connection is not valid. Disregard this magnet.
                                    this._magnetUnderPointer = null;
                                }
                            } else {
                                // Make sure we'll delete previous magnet
                                this._magnetUnderPointer = null;
                            }
                        }
                        this._targetEvent = target;

                        this.model.set(this._arrowhead, {
                            x: x,
                            y: y
                        }, {
                            ui: true
                        });
                    }
                    break;
            }

            this._dx = x;
            this._dy = y;

            CellView.prototype.pointermove.apply(this, arguments);
            this.notify('link:pointermove', evt, x, y);
        },

        pointerup: function(evt, x, y) {

            if (this._action === 'arrowhead-move') {
                var paperOptions = this.paper.options;
                var arrowhead = this._arrowhead;

                if (paperOptions.snapLinks) {
                    // Finish off link snapping. Everything except view unhighlighting was already done on pointermove.
                    this._closestView && this._closestView.unhighlight(this._closestEnd.selector, {
                        connecting: true,
                        snapping: true
                    });
                    this._closestView && this.trigger.apply(this.model, ['link:complete']);

                    // var box = this._closestView.getPositionBySelector(this._closestEnd.selector);
                    // this._closestEnd = {
                    //   x: box.x,
                    //   y: box.y
                    // };
                    // this.model.set(this._arrowhead, this._closestEnd , { ui: true });
                    this._closestView = this._closestEnd = null;
                } else {
                    var viewUnderPointer = this._viewUnderPointer;
                    var magnetUnderPointer = this._magnetUnderPointer;

                    delete this._viewUnderPointer;
                    delete this._magnetUnderPointer;

                    if (magnetUnderPointer) {

                        viewUnderPointer.unhighlight(magnetUnderPointer, {
                            connecting: true
                        });
                        // Find a unique `selector` of the element under pointer that is a magnet. If the
                        // `this._magnetUnderPointer` is the root element of the `this._viewUnderPointer` itself,
                        // the returned `selector` will be `undefined`. That means we can directly pass it to the
                        // `source`/`target` attribute of the link model below.
                        var selector = viewUnderPointer.getSelector(magnetUnderPointer);
                        var port = magnetUnderPointer.getAttribute('port');
                        var arrowheadValue = {
                            id: viewUnderPointer.model.id
                        };
                        if (selector != null) arrowheadValue.port = port;
                        if (port != null) arrowheadValue.selector = selector;
                        this.model.set(arrowhead, arrowheadValue, {
                            ui: true
                        });
                        this.trigger.apply(this.model, 'link:complete');
                    } else {
                        this.model.remove({
                            ui: true
                        });
                    }
                }
                this._afterArrowheadMove();
            }

            delete this._action;
            this.notify('link:pointerup', evt, x, y);
            CellView.prototype.pointerup.apply(this, arguments);
        },

        _beforeArrowheadMove: function() {
            this._z = this.model.get('z');
            this.model.toFront();

            // Let the pointer propagate throught the link view elements so that
            // the `evt.target` is another element under the pointer, not the link itself.
            this.el.style.pointerEvents = 'none';

            if (this.paper.options.markAvailable) {

                //TODO:打开可连接的magnets
                //this._markAvailableMagnets():
            }
        },

        _afterArrowheadMove: function() {
            if (!_.isUndefined(this._z)) {
                this.model.set('z', this._z, {
                    ui: true
                });
                delete this._z;
            }

            // Put `pointer-events` back to its original value. See `startArrowheadMove()` for explanation.
            // Value `auto` doesn't work in IE9. We force to use `visiblePainted` instead.
            // See `https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events`.
            this.el.style.pointerEvents = 'visiblePainted';


            if (this.paper.options.markAvailable) {
                //this._unmarkAvailableMagnets();
            }
        },

        startArrowheadMove: function(end) {
            // Allow to delegate events from an another view to this linkView in order to trigger arrowhead
            // move without need to click on the actual arrowhead dom element.
            this._action = 'arrowhead-move';
            this._arrowhead = end;
            this._initialEnd = _.clone(this.model.get(end)) || {
                x: 0,
                y: 0
            };
            this._validateConnectionArgs = this._createValidateConnectionArgs(this._arrowhead);
            // this._beforeArrowheadMove();
        },

        /**
         * Return `true` if the link is allowed to perform a certain UI `feature`.
         * @example
         *  `can('vertexMove')`, `can('labelMove')`.
         * @param {String} feature
         * @returns {boolean}
         */
        can: function(feature) {
            var interactive = _.isFunction(this.options.interactive) ? this.options.interactive(this, 'pointerdown') : this.options.interactive;
            if (!_.isObject(interactive) || interactive[feature] !== false) return true;
            return false;
        },

        _createValidateConnectionArgs: function(arrowhead) {
            // It makes sure the arguments for validateConnection have the following form:
            // (source view, source magnet, target view, target magnet and link view)
            var args = [];
            args[4] = arrowhead;
            args[5] = this;

            var oppositeArrowhead;
            var i = 0;
            var j = 0;

            if (arrowhead === 'source') {
                i = 2;
                oppositeArrowhead = 'target';
            } else {
                j = 2;
                oppositeArrowhead = 'source';
            }

            var end = this.model.get(oppositeArrowhead);

            if (end.id) {
                args[i] = this.paper.findViewByModel(end.id);
                args[i + 1] = end.selector && args[i].el.querySelector(end.selector);
            }

            function validateConnectionArgs(cellView, magnet) {
                args[j] = cellView;
                args[j + 1] = cellView.el === magnet ? undefined : magnet;
                return args;
            }
            return validateConnectionArgs;
        },

        _translateAndAutoOrientArrows: function(sourceArrow, targetArrow) {

            // Make the markers "point" to their sticky points being auto-oriented towards
            // `targetPosition`/`sourcePosition`. And do so only if there is a markup for them.
            if (sourceArrow) {
                sourceArrow.translateAndAutoOrient(
                    this.sourcePoint,
                    _.first(this.route) || this.targetPoint,
                    this.paper.viewport
                );
            }

            if (targetArrow) {
                targetArrow.translateAndAutoOrient(
                    this.targetPoint,
                    _.last(this.route) || this.sourcePoint,
                    this.paper.viewport
                );
            }
        },



        highlight: function(el) {
            this._V[el].attr({
                'stroke': '#ff7f0e'
            });
        },

        focus: function() {
            //CellView.prototype.focus.apply(this);
            this.highlight('connection_line');
        },

        unfocus: function() {
            //CellView.prototype.unfocus.apply(this);
            this.unhighlight('connection_line');
        },


        unhighlight: function(el) {
            this._V[el].attr({
                'stroke': 'blue'
            });
        },


    }, {
        /**
         * get port of vertex
         * @param {Link~Vertex} end
         * @returns {string}
         */
        makeSelector: function(end) {
            var selector = '[model-id="' + end.id + '"]';
            // `port` has a higher precendence over `selector`. This is because the selector to the magnet
            // might change while the name of the port can stay the same.
            if (end.port) {
                selector += ' [port="' + end.port + '"]';
            } else if (end.selector) {
                selector += ' ' + end.selector;
            }

            return selector;
        }
    });
    return LinkView;
});
