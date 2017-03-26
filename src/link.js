define(['./cell'], function (dedu) {
  /**
   * source or target
   * @typeof {Object} dedu.Link~Vertex
   * @property {String} id - vertex'id
   * @property {String} redID - vertex'redID
   * @property {Selector} selector - css
   * @property {String} port - port'name
   */

  /**
   * `dedu.Link` 是所有link的父类
   * Properties source and target determine to which elements the link is connected to. Both objects are of the form<dedu.Link~Vertex>:
   *
   * {
   *   id: <id of an element>,
   *   selector: <CSS selector>,
   *   port: <id of a port>
   * }
   *
   * @class
   * @augments dedu.Cell
   */
  dedu.Link = dedu.Cell.extend({
    /**
     * The default markup for links.
     * @member {Array}
     * @memberof dedu.Link
     */
    markup: [
      '<path class="connection_background"/>',
      '<path class="connection_outline"/>',
      '<path class="connection_line"/>',
      // '<path class="connection-wrap"/>',
      '<g class="labels"/>',
      // '<g class="marker-vertices"/>',
      '<g class="marker-arrowheads"/>',
      // '<g class="link-tools"/>'
    ].join(''),

    /**
     * The default labelMarkup for links.
     * @member {Array}
     * @memberof dedu.Link
     */
    labelMarkup: [
      '<g class="label">',
      '<rect />',
      '<text />',
      '</g>'
    ].join(''),

    /**
     * The default arrowHeadMarkup for links.箭头
     * @member {Array}
     * @memberof dedu.Link
     */
    arrowheadMarkup: [
      '<g class="marker-arrowhead-group marker-arrowhead-group-<%= end %>">',
      '<path class="marker-arrowhead" end="<%= end %>" d="M 26 0 L 0 13 L 26 26 z" />',
      '</g>'
    ].join(''),

    /**
     * @member {Object} defaults - 默认属性
     * @property {String} defaults.type='link'
     * @property {dedu.Link~Vertex} source
     * @property {dedu.Link~Vertex} target
     * @property {Object} labels
     * @property {Object} attrs
     * @override
     * @memberof dedu.Link
     */
    defaults: {
      type: 'link',
      source: {},
      target: {},
      labels: undefined,
      attrs: {
        '.marker-target': {
          d: 'M 10 0 L 0 5 L 10 10 z'
        },
        '.connection_line': {
          stroke: 'blue'
        }
      }
    },

    /**
     *  A convenient way to set labels. Currently set values will be mixined with `value` if used as a setter.
     * * The link model has a property labels that contains the whole array of labels of that link. Each item of that array has the form:
     *
     * {
     *   position: <number>,
     *   attrs: { <selector>: <SVG attributes> }
}    * }
     *
     * @example
     *
     * link.label(0, {
     *      position: .5,
     *      attrs: {
     *          rect: { fill: 'white' },
     *          text: { fill: 'blue', text: 'my label' }
     *       }
     *   });
     *
     * @param {Number} idx
     * @param {Object} value
     * @returns {*}
     */
    label: function (idx, value) {

      idx = idx || 0;

      var labels = this.get('labels') || [];

      // Is it a getter?
      if (arguments.length === 0 || arguments.length === 1) {

        return labels[idx];
      }

      var newValue = _.extend({}, labels[idx], value);

      var newLabels = labels.slice();
      newLabels[idx] = newValue;

      return this.set({
        labels: newLabels
      });
    },

    /**
     * Return the source element of the link or null if there is none.
     * @returns {*|dedu.Cell|null}
     */
    getSourceElement: function () {

      var source = this.get('source');

      return (source && source.id && this.graph && this.graph.getCell(source.id)) || null;
    },

    /**
     * Return the target element of the link or null if there is none.
     * @returns {*|dedu.Cell|null}
     */
    getTargetElement: function () {

      var target = this.get('target');

      return (target && target.id && this.graph && this.graph.getCell(target.id)) || null;
    },
    /**
     * 返回true
     * @override
     * @returns {boolean}
     * @memberof dedu.Link
     */
    isLink: function () {
      return true;
    }
  });

  /**
   * `dedu.LinkView`是{@link dedu.link}的view and is responsible for rendering a link with properties defined in its model
   * @class
   * @augments dedu.CellView
   */
  dedu.LinkView = dedu.CellView.extend({

    /**
     * @override
     * @returns {string}
     */
    className: function () {
      return _.unique(this.model.get("type").split(".").concat("link")).join(" ")
    },

    initialize: function (opts) {
      this.options = _.extend({}, _.result(this, "options"), opts || {});

      dedu.CellView.prototype.initialize.apply(this, arguments);

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

      this.model.on('change:selected', function () {
        if (this.model.get("selected")) {
          this.focus();
        } else {
          this.unfocus();
        }
      }, this);

      this.model.on('change:labels', function () {
        this.renderLabels();
        this.updateLabelPositions();
      }, this);

    },

    // Returns a function observing changes on an end of the link. If a change happens and new end is a new model,
    // it stops listening on the previous one and starts listening to the new one.
    createWatcher: function (endType) {
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

    onEndModelChange: function (endType, endModel, opt) {

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

    startListening: function () {
      var model = this.model;

      this.listenTo(model, 'change:vertices', this.render);
      this.listenTo(model, 'change:source', this.onSourceChange);
      this.listenTo(model, 'change:target', this.onTargetChange);

    },

    onVerticesChange: function (cell, changed, opt) {

      //this.renderVertexMarkers();
    },

    render: function () {
      this.$el.empty();

      // A special markup can be given in the `properties.markup` property. This might be handy
      // if e.g. arrowhead markers should be `<image>` elements or any other element than `<path>`s.
      // `.connection`, `.connection-wrap`, `.marker-source` and `.marker-target` selectors
      // of elements with special meaning though. Therefore, those classes should be preserved in any
      // special markup passed in `properties.markup`.
      var children = V(this.model.get('markup') || this.model.markup);

      // custom markup may contain only one children
      if (!_.isArray(children)) children = [children];


      // Cache all children elements for quicker access.
      this._V = {}; //vectorized markup;
      _.each(children, function (child) {
        var c = child.attr('class');
        c && (this._V[$.camelCase(c)] = child);
      }, this);

      // Only the connection path is mandatory
      if (!this._V.connection_line) throw new Error('link: no connection path in the markup');

      // rendering labels has to be run after the link is appended to DOM tree. (otherwise <Text> bbox
      // returns zero values)

      // this.renderArrowheadMarkers();
      Snap(this._V.connection_line.node).attr({
        "marker-end": dedu.Paper.marker_end
      });
      V(this.vel.node).append(children);
      // rendering labels has to be run after the link is appended to DOM tree. (otherwise <Text> bbox
      // returns zero values)
      this.renderLabels();

      // start watching the ends of the link for changes
      this.watchSource(this.model, this.model.get('source'))
        .watchTarget(this.model, this.model.get('target'))
        .update();

      return this;
    },

    renderLabels: function () {

      if (!this._V.labels) return this;

      this._labelCache = {};
      var $labels = $(this._V.labels.node).empty();

      var labels = this.model.get('labels') || [];
      if (!labels.length) return this;

      var labelTemplate = _.template(this.model.get('labelMarkup') || this.model.labelMarkup);

      // This is a prepared instance of a vectorized SVGDOM node for the label element resulting from
      // compilation of the labelTemplate. The purpose is that all labels will just `clone()` this
      // node to create a duplicate.
      var labelNodeInstance = V(labelTemplate());

      _.each(labels, function (label, idx) {

        var labelNode = labelNodeInstance.clone().node;
        V(labelNode).attr('label-idx', idx);

        // Cache label nodes so that the `updateLabels()` can just update the label node positions.
        this._labelCache[idx] = V(labelNode);

        var $text = $(labelNode).find('text');
        var $rect = $(labelNode).find('rect');

        // Text attributes with the default `text-anchor` and font-size set.
        var textAttributes = _.extend({
          'text-anchor': 'middle',
          'font-size': 14
        }, dedu.util.getByPath(label, 'attrs/text', '/'));

        $text.attr(_.omit(textAttributes, 'text'));
        if (!_.isUndefined(textAttributes.text)) {

          V($text[0]).text(textAttributes.text + '');
        }
        // Note that we first need to append the `<text>` element to the DOM in order to
        // get its bounding box.
        $labels.append(labelNode);

        // `y-alignment` - center the text element around its y coordinate.
        var textBbox = V($text[0]).bbox(true, $labels[0]);
        V($text[0]).translate(0, -textBbox.height / 2);

        // Add default values.
        var rectAttributes = _.extend({

          fill: 'white',
          rx: 3,
          ry: 3

        }, dedu.util.getByPath(label, 'attrs/rect', '/'));

        $rect.attr(_.extend(rectAttributes, {
          x: textBbox.x,
          y: textBbox.y - textBbox.height / 2, // Take into account the y-alignment translation.
          width: textBbox.width,
          height: textBbox.height
        }));
      }, this);

      return this;
    },

    renderArrowheadMarkers: function () {

      // Custom markups might not have arrowhead markers. Therefore, jump of this function immediately if that's the case.
      if (!this._V.markerArrowheads) return this;

      var $markerArrowheads = $(this._V.markerArrowheads.node);

      $markerArrowheads.empty();

      // A special markup can be given in the `properties.vertexMarkup` property. This might be handy
      // if default styling (elements) are not desired. This makes it possible to use any
      // SVG elements for .marker-vertex and .marker-vertex-remove tools.
      var markupTemplate = _.template(this.model.get('arrowheadMarkup') || this.model.arrowheadMarkup);

      if (this.model.get('attrs')['.marker-source']) {
        this._V.sourceArrowhead = V(markupTemplate({
          end: 'source'
        }));
      }
      if (this.model.get('attrs')['.marker-target']) {
        this._V.targetArrowhead = V(markupTemplate({
          end: 'target'
        }));
      }
      $markerArrowheads.append(this._V.sourceArrowhead ? this._V.sourceArrowhead.node : undefined, this._V.targetArrowhead ? this._V.targetArrowhead.node : undefined);

      return this;
    },

    // Default is to process the `attrs` object and set attributes on subelements based on the selectors.
    update: function () {
      // Update attributes.
      _.each(this.model.get('attrs'), function (attrs, selector) {

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
      var vertices = this.route = this.findRoute(this.model.get('vertices') || []);

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

      this.updateLabelPositions();
      // this.updateArrowheadMarkers();

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

    updateLabelPositions: function () {

      if (!this._V.labels) return this;

      var labels = this.model.get('labels') || [];
      if (!labels.length) return this;

      var connectionElement = this._V.connection_line.node;
      var connectionLength = connectionElement.getTotalLength();

      // Firefox returns connectionLength=NaN in odd cases (for bezier curves).
      // In that case we won't update labels at all.
      if (!_.isNaN(connectionLength)) {
        var samples;

        _.each(labels, function (label, idx) {
          var position = label.position;
          var distance = _.isObject(position) ? position.distance : position;
          var offset = _.isObject(position) ? position.offset : {
            x: 0,
            y: 0
          };

          distance = (distance > connectionLength) ? connectionLength : distance; // sanity check
          distance = (distance < 0) ? connectionLength + distance : distance;
          distance = (distance > 1) ? distance : connectionLength * distance;

          var labelCoordinates = connectionElement.getPointAtLength(distance);

          if (_.isObject(offset)) {

            // Just offset the label by the x,y provided in the offset object.
            labelCoordinates = g.point(labelCoordinates).offset(offset.x, offset.y);

          } else if (_.isNumber(offset)) {
            if (!samples) {
              samples = this._samples || this._V.connection_line.sample(this.options.sampleInterval);
            }

            // Offset the label by the amount provided in `offset` to an either
            // side of the link.

            // 1. Find the closest sample & its left and right neighbours.
            var minSqDistance = Infinity;
            var closestSample;
            var closestSampleIndex;
            var p;
            var sqDistance;
            for (var i = 0, len = samples.length; i < len; i++) {
              p = samples[i];
              sqDistance = g.line(p, labelCoordinates).squaredLength();
              if (sqDistance < minSqDistance) {
                minSqDistance = sqDistance;
                closestSample = p;
                closestSampleIndex = i;
              }
            }
            var prevSample = samples[closestSampleIndex - 1];
            var nextSample = samples[closestSampleIndex + 1];

            // 2. Offset the label on the perpendicular line between
            // the current label coordinate ("at `distance`") and
            // the next sample.
            var angle = 0;
            if (nextSample) {
              angle = g.point(labelCoordinates).theta(nextSample);
            } else if (prevSample) {
              angle = g.point(prevSample).theta(labelCoordinates);
            }
            labelCoordinates = g.point(labelCoordinates).offset(offset).rotate(labelCoordinates, angle - 90);
          }

          this._labelCache[idx].attr('transform', 'translate(' + labelCoordinates.x + ', ' + labelCoordinates.y + ')');
        }, this);
      }

      return this;

    },

    updateArrowheadMarkers: function () {

      if (!this._V.markerArrowheads) return this;

      // getting bbox of an element with `display="none"` in IE9 ends up with access violation
      if ($.css(this._V.markerArrowheads.node, 'display') === 'none') return this;

      var sx = this.getConnectionLength() < this.options.shortLinkLength ? .5 : 1;
      this._V.sourceArrowhead && this._V.sourceArrowhead.scale(sx);
      this._V.targetArrowhead && this._V.targetArrowhead.scale(sx);

      this._translateAndAutoOrientArrows(this._V.sourceArrowhead, this._V.targetArrowhead);

      return this;
    },

    hideLabels: function () {
      $(this._V.labels.node).hide();
    },

    showLabel: function () {
      $(this._V.labels.node).show();
    },

    findRoute: function (oldVertices) {
      var namespace = dedu.routers;
      var router = this.model.get('router');

      var defaultRouter = this.paper.options.defaultRouter;

      if (!router) {

        if (this.model.get('manhattan')) {
          // backwards compability
          router = {
            name: 'orthogonal'
          };
        } else if (defaultRouter) {
          router = defaultRouter;
        } else {
          return oldVertices;
        }
      }
      var args = router.args || {};
      var routerFn = _.isFunction(router) ? router : namespace[router.name];

      if (!_.isFunction(routerFn)) {
        throw new Error('unknown router: "' + router.name + '"');
      }

      var newVertices = routerFn.call(this, oldVertices || [], args, this);

      return newVertices;
    },

    // Return the `d` attribute value of the `<path>` element representing the link
    // between `source` and `target`.
    getPathData: function (vertices) {

      var namespace = dedu.connectors;
      var connector = this.model.get('connector');
      var defaultConnector = this.paper.options.defaultConnector;

      if (!connector) {
        // backwards compability
        if (this.model.get('smooth')) {
          connector = {
            name: 'smooth'
          };
        } else {
          connector = defaultConnector || {
            name: 'normal'
          };
        }
      }

      var connectorFn = _.isFunction(connector) ? connector : namespace[connector.name];
      var args = connector.args || {};

      if (!_.isFunction(connectorFn)) {
        throw 'unknown connector: ' + connector.name;
      }

      var pathData = connectorFn.call(
        this,
        this._markerCache.sourcePoint, // Note that the value is translated by the size
        this._markerCache.targetPoint, // of the marker. (We'r not using this.sourcePoint)
        vertices || (this.model.get('vertices') || {}),
        args, //options
        this
      );

      return pathData;
    },

    getConnectionLength: function () {

      return this._V.connection_line.node.getTotalLength();
    },


    _findConnectionPoints: function (vertices) {
      // cache source and target points
      var sourcePoint, targetPoint, sourceMarkerPoint, targetMarkerPoint;

      var firstVertex = _.first(vertices);

      sourcePoint = this.getConnectionPoint(
        'source', this.model.get('source'), firstVertex || this.model.get('target')
      ).round();

      var lastVertex = _.last(vertices);

      targetPoint = this.getConnectionPoint(
        'target', this.model.get('target'), lastVertex || sourcePoint
      ).round();
      // Move the source point by the width of the marker taking into account
      // its scale around x-axis. Note that scale is the only transform that
      // makes sense to be set in `.marker-source` attributes object
      // as all other transforms (translate/rotate) will be replaced
      // by the `translateAndAutoOrient()` function.
      var cache = this._markerCache;

      if (this._V.markerSource) {

        cache.sourceBBox = cache.sourceBBox || this._V.markerSource.bbox(true);

        sourceMarkerPoint = g.point(sourcePoint).move(
          firstVertex || targetPoint,
          cache.sourceBBox.width * this._V.markerSource.scale().sx * -1
        ).round();
      }

      // if (!this._V.markerTarget) {

      //      cache.targetBBox = cache.targetBBox || this._V.markerTarget.bbox(true);

      //     targetMarkerPoint = g.point(targetPoint).move(
      //         lastVertex || sourcePoint,
      //         cache.targetBBox.width * this._V.markerTarget.scale().sx * -1
      //     ).round();
      // }

      // if there was no markup for the marker, use the connection point.
      cache.sourcePoint = sourceMarkerPoint || sourcePoint;
      cache.targetPoint = targetMarkerPoint || targetPoint;

      // make connection points public
      this.sourcePoint = sourcePoint;
      this.targetPoint = targetPoint;
    },


    // Interaction. The controller part.
    // ---------------------------------

    _beforeArrowheadMove: function () {
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

    _afterArrowheadMove: function () {
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

    startArrowheadMove: function (end) {
      // Allow to delegate events from an another view to this linkView in order to trigger arrowhead
      // move without need to click on the actual arrowhead dom element.
      this._action = 'arrowhead-move';
      this._arrowhead = end;
      this._initialEnd = _.clone(this.model.get(end)) || {
        x: 0,
        y: 0
      };
      this._validateConnectionArgs = this._createValidateConnectionArgs(this._arrowhead);
      this._beforeArrowheadMove();
    },

    /**
     * Return `true` if the link is allowed to perform a certain UI `feature`.
     * @example
     *  `can('vertexMove')`, `can('labelMove')`.
     * @param {String} feature
     * @returns {boolean}
     */
    can: function (feature) {
      var interactive = _.isFunction(this.options.interactive) ? this.options.interactive(this, 'pointerdown') : this.options.interactive;
      if (!_.isObject(interactive) || interactive[feature] !== false) return true;
      return false;
    },

    _createValidateConnectionArgs: function (arrowhead) {
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

    _translateAndAutoOrientArrows: function (sourceArrow, targetArrow) {

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

    // Find a point that is the start of the connection.
    // If `selectorOrPoint` is a point, then we're done and that point is the start of the connection.
    // If the `selectorOrPoint` is an element however, we need to know a reference point (or element)
    // that the link leads to in order to determine the start of the connection on the original element.
    getConnectionPoint: function (end, selectorOrPoint, referenceSelectorOrPoint) {
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

    onSourceChange: function (cell, source) {

      this.watchSource(cell, source).update();

    },

    onTargetChange: function (cell, target) {

      this.watchTarget(cell, target).update();

    },

    highlight: function (el) {
      this._V[el].attr({
        'stroke': '#ff7f0e'
      });
    },

    focus: function () {
      //dedu.CellView.prototype.focus.apply(this);
      this.highlight('connection_line');
    },

    unfocus: function () {
      //dedu.CellView.prototype.unfocus.apply(this);
      this.unhighlight('connection_line');
    },


    unhighlight: function (el) {
      this._V[el].attr({
        'stroke': 'blue'
      });
    },

    pointerdown: function (evt, x, y) {
      dedu.CellView.prototype.pointerdown.apply(this, arguments);

      this._dx = x;
      this._dy = y;

      // if are simulating pointerdown on a link during a magnet click, skip link interactions
      if (evt.target.getAttribute('magnet') != null) return;

      var interactive = _.isFunction(this.options.interactive) ? this.options.interactive(this, 'pointerdown') : this.options.interactive;
      if (interactive === false) return;

      var className = evt.target.getAttribute('class');
      var parentClassName = evt.target.parentNode.getAttribute('class');
      var labelNode;
      if (parentClassName === 'label') {
        className = parentClassName;
        labelNode = evt.target.parentNode;
      } else {
        labelNode = evt.target;
      }

      switch (className) {
        case 'marker-arrowhead':
          if (this.can('arrowheadMove')) {
            this.startArrowheadMove(evt.target.getAttribute('end'));
          }
          break;

        case 'connection_background':
          //if (this.can('labelMove')) {
          //    this._action = 'label-move';
          //    this._labelIdx = parseInt(V(labelNode).attr('label-idx'), 10);
          //    // Precalculate samples so that we don't have to do that
          //    // over and over again while dragging the label.
          //    this._samples = this._V.connection.sample(1);
          //    this._linkLength = this._V.connection.node.getTotalLength();
          //}
          this.notify('link:pointerdown', evt, x, y);
          break;


      }


      var targetParentEvent = evt.target.parentNode.getAttribute('event');
      this.focus();

    },

    pointerdblclick: function (evt, x, y) {

      var m = g.line(g.point(this.sourcePoint.x, this.sourcePoint.y), g.point(this.targetPoint.x, this.targetPoint.y)).midpoint();
      x = m.x - 8;
      y = m.y - 8;
      dedu.CellView.prototype.pointerdblclick.apply(this, arguments);

    },

    pointermove: function (evt, x, y) {

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

            _.each(viewsInArea, function (view) {

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

              view.$('[magnet]').each(_.bind(function (index, magnet) {

                var bbox = V(magnet).bbox(false, this.paper.viewport);

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
                } else if (V(target).hasClass("tip")) {
                  console.log("collaspe");
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

      dedu.CellView.prototype.pointermove.apply(this, arguments);
      this.notify('link:pointermove', evt, x, y);
    },

    pointerup: function (evt, x, y) {

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
      dedu.CellView.prototype.pointerup.apply(this, arguments);
    },



  }, {
    /**
     * get port of vertex
     * @param {dedu.Link~Vertex} end
     * @returns {string}
     */
    makeSelector: function (end) {
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

return dedu;
})
