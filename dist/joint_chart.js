// Vectorizer.
// -----------

// A tiny library for making your live easier when dealing with SVG.
// The only Vectorizer dependency is the Geometry library.

// Copyright © 2012 - 2015 client IO (http://client.io)

var V;
var Vectorizer;

V = Vectorizer = (function() {

    var SVGsupported = typeof window === 'object' && !!(window.SVGAngle || document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1'));

    // SVG support is required.
    if (!SVGsupported) return function() {};

    // XML namespaces.
    var ns = {
        xmlns: 'http://www.w3.org/2000/svg',
        xlink: 'http://www.w3.org/1999/xlink'
    };
    // SVG version.
    var SVGversion = '1.1';

    // A function returning a unique identifier for this client session with every call.
    var idCounter = 0;
    function uniqueId() {
        var id = ++idCounter + '';
        return 'v-' + id;
    }

    // Replace all spaces with the Unicode No-break space (http://www.fileformat.info/info/unicode/char/a0/index.htm).
    // IE would otherwise collapse all spaces into one. This is used in the text() method but it is
    // also exposed so that the programmer can use it in case he needs to. This is useful e.g. in tests
    // when you want to compare the actual DOM text content without having to add the unicode character in
    // the place of all spaces.
    function sanitizeText(text) {
        return (text || '').replace(/ /g, '\u00A0');
    }

    function isObject(o) {
        return o === Object(o);
    }

    function isArray(o) {
        return Object.prototype.toString.call(o) == '[object Array]';
    }

    // Create an SVG document element.
    // If `content` is passed, it will be used as the SVG content of the `<svg>` root element.
    function createSvgDocument(content) {

        var svg = '<svg xmlns="' + ns.xmlns + '" xmlns:xlink="' + ns.xlink + '" version="' + SVGversion + '">' + (content || '') + '</svg>';
        var xml = parseXML(svg, { async: false });
        return xml.documentElement;
    }

    function parseXML(data, opt) {

        opt = opt || {};

        var xml;

        try {
            var parser = new DOMParser();

            if (typeof opt.async !== 'undefined') {
                parser.async = opt.async;
            }

            xml = parser.parseFromString(data, 'text/xml');
        } catch (error) {
            xml = undefined;
        }

        if (!xml || xml.getElementsByTagName('parsererror').length) {
            throw new Error('Invalid XML: ' + data);
        }

        return xml;
    }

    // Create SVG element.
    // -------------------

    function createElement(el, attrs, children) {

        var i, len;

        if (!el) return undefined;

        // If `el` is an object, it is probably a native SVG element. Wrap it to VElement.
        if (typeof el === 'object') {
            return new VElement(el);
        }
        attrs = attrs || {};

        // If `el` is a `'svg'` or `'SVG'` string, create a new SVG canvas.
        if (el.toLowerCase() === 'svg') {

            return new VElement(createSvgDocument());

        } else if (el[0] === '<') {
            // Create element from an SVG string.
            // Allows constructs of type: `document.appendChild(Vectorizer('<rect></rect>').node)`.

            var svgDoc = createSvgDocument(el);

            // Note that `createElement()` might also return an array should the SVG string passed as
            // the first argument contain more then one root element.
            if (svgDoc.childNodes.length > 1) {

                // Map child nodes to `VElement`s.
                var ret = [];
                for (i = 0, len = svgDoc.childNodes.length; i < len; i++) {

                    var childNode = svgDoc.childNodes[i];
                    ret.push(new VElement(document.importNode(childNode, true)));
                }
                return ret;
            }

            return new VElement(document.importNode(svgDoc.firstChild, true));
        }

        el = document.createElementNS(ns.xmlns, el);

        // Set attributes.
        for (var key in attrs) {

            setAttribute(el, key, attrs[key]);
        }

        // Normalize `children` array.
        if (Object.prototype.toString.call(children) != '[object Array]') children = [children];

        // Append children if they are specified.
        for (i = 0, len = (children[0] && children.length) || 0; i < len; i++) {
            var child = children[i];
            el.appendChild(child instanceof VElement ? child.node : child);
        }

        return new VElement(el);
    }

    function setAttribute(el, name, value) {

        if (name.indexOf(':') > -1) {
            // Attribute names can be namespaced. E.g. `image` elements
            // have a `xlink:href` attribute to set the source of the image.
            var combinedKey = name.split(':');
            el.setAttributeNS(ns[combinedKey[0]], combinedKey[1], value);

        } else if (name === 'id') {
            el.id = value;
        } else {
            el.setAttribute(name, value);
        }
    }

    function parseTransformString(transform) {
        var translate,
            rotate,
            scale;

        if (transform) {

            var separator = /[ ,]+/;

            var translateMatch = transform.match(/translate\((.*)\)/);
            if (translateMatch) {
                translate = translateMatch[1].split(separator);
            }
            var rotateMatch = transform.match(/rotate\((.*)\)/);
            if (rotateMatch) {
                rotate = rotateMatch[1].split(separator);
            }
            var scaleMatch = transform.match(/scale\((.*)\)/);
            if (scaleMatch) {
                scale = scaleMatch[1].split(separator);
            }
        }

        var sx = (scale && scale[0]) ? parseFloat(scale[0]) : 1;

        return {
            translate: {
                tx: (translate && translate[0]) ? parseInt(translate[0], 10) : 0,
                ty: (translate && translate[1]) ? parseInt(translate[1], 10) : 0
            },
            rotate: {
                angle: (rotate && rotate[0]) ? parseInt(rotate[0], 10) : 0,
                cx: (rotate && rotate[1]) ? parseInt(rotate[1], 10) : undefined,
                cy: (rotate && rotate[2]) ? parseInt(rotate[2], 10) : undefined
            },
            scale: {
                sx: sx,
                sy: (scale && scale[1]) ? parseFloat(scale[1]) : sx
            }
        };
    }


    // Matrix decomposition.
    // ---------------------

    function deltaTransformPoint(matrix, point) {

        var dx = point.x * matrix.a + point.y * matrix.c + 0;
        var dy = point.x * matrix.b + point.y * matrix.d + 0;
        return { x: dx, y: dy };
    }

    function decomposeMatrix(matrix) {

        // @see https://gist.github.com/2052247

        // calculate delta transform point
        var px = deltaTransformPoint(matrix, { x: 0, y: 1 });
        var py = deltaTransformPoint(matrix, { x: 1, y: 0 });

        // calculate skew
        var skewX = ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90);
        var skewY = ((180 / Math.PI) * Math.atan2(py.y, py.x));

        return {

            translateX: matrix.e,
            translateY: matrix.f,
            scaleX: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
            scaleY: Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d),
            skewX: skewX,
            skewY: skewY,
            rotation: skewX // rotation is the same as skew x
        };
    }

    // VElement.
    // ---------

    function VElement(el) {
        if (el instanceof VElement) {
            el = el.node;
        }
        this.node = el;
        if (!this.node.id) {
            this.node.id = uniqueId();
        }
    }

    // VElement public API.
    // --------------------

    VElement.prototype = {

        translate: function(tx, ty, opt) {

            opt = opt || {};
            ty = ty || 0;

            var transformAttr = this.attr('transform') || '';
            var transform = parseTransformString(transformAttr);

            // Is it a getter?
            if (typeof tx === 'undefined') {
                return transform.translate;
            }

            transformAttr = transformAttr.replace(/translate\([^\)]*\)/g, '').trim();

            var newTx = opt.absolute ? tx : transform.translate.tx + tx;
            var newTy = opt.absolute ? ty : transform.translate.ty + ty;
            var newTranslate = 'translate(' + newTx + ',' + newTy + ')';

            // Note that `translate()` is always the first transformation. This is
            // usually the desired case.
            this.attr('transform', (newTranslate + ' ' + transformAttr).trim());
            return this;
        },

        rotate: function(angle, cx, cy, opt) {

            opt = opt || {};

            var transformAttr = this.attr('transform') || '';
            var transform = parseTransformString(transformAttr);

            // Is it a getter?
            if (typeof angle === 'undefined') {
                return transform.rotate;
            }

            transformAttr = transformAttr.replace(/rotate\([^\)]*\)/g, '').trim();

            angle %= 360;

            var newAngle = opt.absolute ? angle : transform.rotate.angle + angle;
            var newOrigin = (cx !== undefined && cy !== undefined) ? ',' + cx + ',' + cy : '';
            var newRotate = 'rotate(' + newAngle + newOrigin + ')';

            this.attr('transform', (transformAttr + ' ' + newRotate).trim());
            return this;
        },

        // Note that `scale` as the only transformation does not combine with previous values.
        scale: function(sx, sy) {
            sy = (typeof sy === 'undefined') ? sx : sy;

            var transformAttr = this.attr('transform') || '';
            var transform = parseTransformString(transformAttr);

            // Is it a getter?
            if (typeof sx === 'undefined') {
                return transform.scale;
            }

            transformAttr = transformAttr.replace(/scale\([^\)]*\)/g, '').trim();

            var newScale = 'scale(' + sx + ',' + sy + ')';

            this.attr('transform', (transformAttr + ' ' + newScale).trim());
            return this;
        },

        // Get SVGRect that contains coordinates and dimension of the real bounding box,
        // i.e. after transformations are applied.
        // If `target` is specified, bounding box will be computed relatively to `target` element.
        bbox: function(withoutTransformations, target) {

            // If the element is not in the live DOM, it does not have a bounding box defined and
            // so fall back to 'zero' dimension element.
            if (!this.node.ownerSVGElement) return { x: 0, y: 0, width: 0, height: 0 };

            var box;
            try {

                box = this.node.getBBox();
                // We are creating a new object as the standard says that you can't
                // modify the attributes of a bbox.
                box = { x: box.x, y: box.y, width: box.width, height: box.height };

            } catch (e) {

                // Fallback for IE.
                box = {
                    x: this.node.clientLeft,
                    y: this.node.clientTop,
                    width: this.node.clientWidth,
                    height: this.node.clientHeight
                };
            }

            if (withoutTransformations) {

                return box;
            }

            var matrix = this.node.getTransformToElement(target || this.node.ownerSVGElement);

            return V.transformRect(box, matrix);
        },

        text: function(content, opt) {

            // Replace all spaces with the Unicode No-break space (http://www.fileformat.info/info/unicode/char/a0/index.htm).
            // IE would otherwise collapse all spaces into one.
            content = sanitizeText(content);
            opt = opt || {};
            var lines = content.split('\n');
            var i = 0;
            var tspan;

            // `alignment-baseline` does not work in Firefox.
            // Setting `dominant-baseline` on the `<text>` element doesn't work in IE9.
            // In order to have the 0,0 coordinate of the `<text>` element (or the first `<tspan>`)
            // in the top left corner we translate the `<text>` element by `0.8em`.
            // See `http://www.w3.org/Graphics/SVG/WG/wiki/How_to_determine_dominant_baseline`.
            // See also `http://apike.ca/prog_svg_text_style.html`.
            var y = this.attr('y');
            if (!y) {
                this.attr('y', '0.8em');
            }

            // An empty text gets rendered into the DOM in webkit-based browsers.
            // In order to unify this behaviour across all browsers
            // we rather hide the text element when it's empty.
            this.attr('display', content ? null : 'none');

            // Preserve spaces. In other words, we do not want consecutive spaces to get collapsed to one.
            this.node.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');

            // Easy way to erase all `<tspan>` children;
            this.node.textContent = '';

            var textNode = this.node;

            if (opt.textPath) {

                // Wrap the text in the SVG <textPath> element that points
                // to a path defined by `opt.textPath` inside the internal `<defs>` element.
                var defs = this.find('defs');
                if (defs.length === 0) {
                    defs = createElement('defs');
                    this.append(defs);
                }

                // If `opt.textPath` is a plain string, consider it to be directly the
                // SVG path data for the text to go along (this is a shortcut).
                // Otherwise if it is an object and contains the `d` property, then this is our path.
                var d = Object(opt.textPath) === opt.textPath ? opt.textPath.d : opt.textPath;
                if (d) {
                    var path = createElement('path', { d: d });
                    defs.append(path);
                }

                var textPath = createElement('textPath');
                // Set attributes on the `<textPath>`. The most important one
                // is the `xlink:href` that points to our newly created `<path/>` element in `<defs/>`.
                // Note that we also allow the following construct:
                // `t.text('my text', { textPath: { 'xlink:href': '#my-other-path' } })`.
                // In other words, one can completely skip the auto-creation of the path
                // and use any other arbitrary path that is in the document.
                if (!opt.textPath['xlink:href'] && path) {
                    textPath.attr('xlink:href', '#' + path.node.id);
                }

                if (Object(opt.textPath) === opt.textPath) {
                    textPath.attr(opt.textPath);
                }
                this.append(textPath);
                // Now all the `<tspan>`s will be inside the `<textPath>`.
                textNode = textPath.node;
            }

            var offset = 0;

            for (var i = 0; i < lines.length; i++) {

                var line = lines[i];
                // Shift all the <tspan> but first by one line (`1em`)
                var lineHeight = opt.lineHeight || '1em';
                if (opt.lineHeight === 'auto') {
                    lineHeight = '1.5em';
                }
                var vLine = V('tspan', { dy: (i == 0 ? '0em' : lineHeight), x: this.attr('x') || 0 });
                vLine.addClass('v-line');

                if (line) {

                    if (opt.annotations) {

                        // Get the line height based on the biggest font size in the annotations for this line.
                        var maxFontSize = 0;

                        // Find the *compacted* annotations for this line.
                        var lineAnnotations = V.annotateString(lines[i], isArray(opt.annotations) ? opt.annotations : [opt.annotations], { offset: -offset, includeAnnotationIndices: opt.includeAnnotationIndices });
                        for (var j = 0; j < lineAnnotations.length; j++) {

                            var annotation = lineAnnotations[j];
                            if (isObject(annotation)) {

                                var fontSize = parseInt(annotation.attrs['font-size'], 10);
                                if (fontSize && fontSize > maxFontSize) {
                                    maxFontSize = fontSize;
                                }

                                tspan = V('tspan', annotation.attrs);
                                if (opt.includeAnnotationIndices) {
                                    // If `opt.includeAnnotationIndices` is `true`,
                                    // set the list of indices of all the applied annotations
                                    // in the `annotations` attribute. This list is a comma
                                    // separated list of indices.
                                    tspan.attr('annotations', annotation.annotations);
                                }
                                if (annotation.attrs['class']) {
                                    tspan.addClass(annotation.attrs['class']);
                                }
                                tspan.node.textContent = annotation.t;

                            } else {

                                tspan = document.createTextNode(annotation || ' ');

                            }
                            vLine.append(tspan);
                        }

                        if (opt.lineHeight === 'auto' && maxFontSize && i !== 0) {

                            vLine.attr('dy', (maxFontSize * 1.2) + 'px');
                        }

                    } else {

                        vLine.node.textContent = line;
                    }

                } else {

                    // Make sure the textContent is never empty. If it is, add a dummy
                    // character and make it invisible, making the following lines correctly
                    // relatively positioned. `dy=1em` won't work with empty lines otherwise.
                    vLine.addClass('v-empty-line');
                    vLine.node.style.opacity = 0;
                    vLine.node.textContent = '-';
                }

                V(textNode).append(vLine);

                offset += line.length + 1;      // + 1 = newline character.
            }

            return this;
        },

        attr: function(name, value) {

            if(typeof value === 'function'){
                value = value.apply(this);
            }

            if (typeof name === 'undefined') {
                // Return all attributes.
                var attributes = this.node.attributes;
                var attrs = {};
                for (var i = 0; i < attributes.length; i++) {
                    attrs[attributes[i].nodeName] = attributes[i].nodeValue;
                }
                return attrs;
            }

            if (typeof name === 'string' && typeof value === 'undefined') {
                return this.node.getAttribute(name);
            }

            if (typeof name === 'object') {

                for (var attrName in name) {
                    if (name.hasOwnProperty(attrName)) {
                        setAttribute(this.node, attrName, name[attrName]);
                    }
                }

            } else {

                setAttribute(this.node, name, value);
            }

            return this;
        },

        remove: function() {
            if (this.node.parentNode) {
                this.node.parentNode.removeChild(this.node);
            }
        },

        append: function(el) {

            var els = el;

            if (Object.prototype.toString.call(el) !== '[object Array]') {

                els = [el];
            }

            for (var i = 0, len = els.length; i < len; i++) {
                el = els[i];
                this.node.appendChild(el instanceof VElement ? el.node : el);
            }

            return this;
        },

        prepend: function(el) {
            this.node.insertBefore(el instanceof VElement ? el.node : el, this.node.firstChild);
        },

        svg: function() {

            return this.node instanceof window.SVGSVGElement ? this : V(this.node.ownerSVGElement);
        },

        defs: function() {

            var defs = this.svg().node.getElementsByTagName('defs');

            return (defs && defs.length) ? V(defs[0]) : undefined;
        },

        clone: function() {
            var clone = V(this.node.cloneNode(true));
            // Note that clone inherits also ID. Therefore, we need to change it here.
            clone.node.id = uniqueId();
            return clone;
        },

        findOne: function(selector) {

            var found = this.node.querySelector(selector);
            return found ? V(found) : undefined;
        },

        find: function(selector) {

            var nodes = this.node.querySelectorAll(selector);

            // Map DOM elements to `VElement`s.
            return Array.prototype.map.call(nodes, V);
        },

        // Find an index of an element inside its container.
        index: function() {

            var index = 0;
            var node = this.node.previousSibling;

            while (node) {
                // nodeType 1 for ELEMENT_NODE
                if (node.nodeType === 1) index++;
                node = node.previousSibling;
            }

            return index;
        },

        findParentByClass: function(className, terminator) {

            terminator = terminator || this.node.ownerSVGElement;

            var node = this.node.parentNode;

            while (node && node !== terminator) {

                if (V(node).hasClass(className)) {
                    return V(node);
                }

                node = node.parentNode;
            }

            return null;
        },

        // Convert global point into the coordinate space of this element.
        toLocalPoint: function(x, y) {

            var svg = this.svg().node;

            var p = svg.createSVGPoint();
            p.x = x;
            p.y = y;

            try {

                var globalPoint = p.matrixTransform(svg.getScreenCTM().inverse());
                var globalToLocalMatrix = this.node.getTransformToElement(svg).inverse();

            } catch (e) {
                // IE9 throws an exception in odd cases. (`Unexpected call to method or property access`)
                // We have to make do with the original coordianates.
                return p;
            }

            return globalPoint.matrixTransform(globalToLocalMatrix);
        },

        translateCenterToPoint: function(p) {

            var bbox = this.bbox();
            var center = g.rect(bbox).center();

            this.translate(p.x - center.x, p.y - center.y);
        },

        // Efficiently auto-orient an element. This basically implements the orient=auto attribute
        // of markers. The easiest way of understanding on what this does is to imagine the element is an
        // arrowhead. Calling this method on the arrowhead makes it point to the `position` point while
        // being auto-oriented (properly rotated) towards the `reference` point.
        // `target` is the element relative to which the transformations are applied. Usually a viewport.
        translateAndAutoOrient: function(position, reference, target) {

            // Clean-up previously set transformations except the scale. If we didn't clean up the
            // previous transformations then they'd add up with the old ones. Scale is an exception as
            // it doesn't add up, consider: `this.scale(2).scale(2).scale(2)`. The result is that the
            // element is scaled by the factor 2, not 8.

            var s = this.scale();
            this.attr('transform', '');
            this.scale(s.sx, s.sy);

            var svg = this.svg().node;
            var bbox = this.bbox(false, target);

            // 1. Translate to origin.
            var translateToOrigin = svg.createSVGTransform();
            translateToOrigin.setTranslate(-bbox.x - bbox.width / 2, -bbox.y - bbox.height / 2);

            // 2. Rotate around origin.
            var rotateAroundOrigin = svg.createSVGTransform();
            var angle = g.point(position).changeInAngle(position.x - reference.x, position.y - reference.y, reference);
            rotateAroundOrigin.setRotate(angle, 0, 0);

            // 3. Translate to the `position` + the offset (half my width) towards the `reference` point.
            var translateFinal = svg.createSVGTransform();
            var finalPosition = g.point(position).move(reference, bbox.width / 2);
            translateFinal.setTranslate(position.x + (position.x - finalPosition.x), position.y + (position.y - finalPosition.y));

            // 4. Apply transformations.
            var ctm = this.node.getTransformToElement(target);
            var transform = svg.createSVGTransform();
            transform.setMatrix(
                translateFinal.matrix.multiply(
                    rotateAroundOrigin.matrix.multiply(
                        translateToOrigin.matrix.multiply(
                            ctm)))
            );

            // Instead of directly setting the `matrix()` transform on the element, first, decompose
            // the matrix into separate transforms. This allows us to use normal Vectorizer methods
            // as they don't work on matrices. An example of this is to retrieve a scale of an element.
            // this.node.transform.baseVal.initialize(transform);

            var decomposition = decomposeMatrix(transform.matrix);

            this.translate(decomposition.translateX, decomposition.translateY);
            this.rotate(decomposition.rotation);
            // Note that scale has been already applied, hence the following line stays commented. (it's here just for reference).
            //this.scale(decomposition.scaleX, decomposition.scaleY);

            return this;
        },

        animateAlongPath: function(attrs, path) {

            var animateMotion = V('animateMotion', attrs);
            var mpath = V('mpath', { 'xlink:href': '#' + V(path).node.id });

            animateMotion.append(mpath);

            this.append(animateMotion);
            try {
                animateMotion.node.beginElement();
            } catch (e) {
                // Fallback for IE 9.
                // Run the animation programatically if FakeSmile (`http://leunen.me/fakesmile/`) present
                if (document.documentElement.getAttribute('smiling') === 'fake') {

                    // Register the animation. (See `https://answers.launchpad.net/smil/+question/203333`)
                    var animation = animateMotion.node;
                    animation.animators = [];

                    var animationID = animation.getAttribute('id');
                    if (animationID) id2anim[animationID] = animation;

                    var targets = getTargets(animation);
                    for (var i = 0, len = targets.length; i < len; i++) {
                        var target = targets[i];
                        var animator = new Animator(animation, target, i);
                        animators.push(animator);
                        animation.animators[i] = animator;
                        animator.register();
                    }
                }
            }
        },

        hasClass: function(className) {

            return new RegExp('(\\s|^)' + className + '(\\s|$)').test(this.node.getAttribute('class'));
        },

        addClass: function(className) {

            if (!this.hasClass(className)) {
                var prevClasses = this.node.getAttribute('class') || '';
                this.node.setAttribute('class', (prevClasses + ' ' + className).trim());
            }

            return this;
        },

        removeClass: function(className) {

            if (this.hasClass(className)) {
                var newClasses = this.node.getAttribute('class').replace(new RegExp('(\\s|^)' + className + '(\\s|$)', 'g'), '$2');
                this.node.setAttribute('class', newClasses);
            }

            return this;
        },

        toggleClass: function(className, toAdd) {

            if(typeof toAdd === 'function'){
                toAdd = toAdd.apply(this);
            }

            var toRemove = typeof toAdd === 'undefined' ? this.hasClass(className) : !toAdd;

            if (toRemove) {
                this.removeClass(className);
            } else {
                this.addClass(className);
            }

            return this;
        },

        // Interpolate path by discrete points. The precision of the sampling
        // is controlled by `interval`. In other words, `sample()` will generate
        // a point on the path starting at the beginning of the path going to the end
        // every `interval` pixels.
        // The sampler can be very useful for e.g. finding intersection between two
        // paths (finding the two closest points from two samples).
        sample: function(interval) {

            interval = interval || 1;
            var node = this.node;
            var length = node.getTotalLength();
            var samples = [];
            var distance = 0;
            var sample;
            while (distance < length) {
                sample = node.getPointAtLength(distance);
                samples.push({ x: sample.x, y: sample.y, distance: distance });
                distance += interval;
            }
            return samples;
        },

        convertToPath: function() {

            var path = createElement('path');
            path.attr(this.attr());
            var d = this.convertToPathData();
            if (d) {
                path.attr('d', d);
            }
            return path;
        },

        convertToPathData: function() {

            var tagName = this.node.tagName.toUpperCase();

            switch (tagName) {
            case 'PATH':
                return this.attr('d');
            case 'LINE':
                return convertLineToPathData(this.node);
            case 'POLYGON':
                return convertPolygonToPathData(this.node);
            case 'POLYLINE':
                return convertPolylineToPathData(this.node);
            case 'ELLIPSE':
                return convertEllipseToPathData(this.node);
            case 'CIRCLE':
                return convertCircleToPathData(this.node);
            case 'RECT':
                return convertRectToPathData(this.node);
            }

            throw new Error(tagName + ' cannot be converted to PATH.');
        },

        // Find the intersection of a line starting in the center
        // of the SVG `node` ending in the point `ref`.
        // `target` is an SVG element to which `node`s transformations are relative to.
        // In JointJS, `target` is the `paper.viewport` SVG group element.
        // Note that `ref` point must be in the coordinate system of the `target` for this function to work properly.
        // Returns a point in the `target` coordinte system (the same system as `ref` is in) if
        // an intersection is found. Returns `undefined` otherwise.
        findIntersection: function(ref, target) {

            var svg = this.svg().node;
            target = target || svg;
            var bbox = g.rect(this.bbox(false, target));
            var center = bbox.center();
            var spot = bbox.intersectionWithLineFromCenterToPoint(ref);

            if (!spot) return undefined;

            var tagName = this.node.localName.toUpperCase();

            // Little speed up optimalization for `<rect>` element. We do not do conversion
            // to path element and sampling but directly calculate the intersection through
            // a transformed geometrical rectangle.
            if (tagName === 'RECT') {

                var gRect = g.rect(
                    parseFloat(this.attr('x') || 0),
                    parseFloat(this.attr('y') || 0),
                    parseFloat(this.attr('width')),
                    parseFloat(this.attr('height'))
                );
                // Get the rect transformation matrix with regards to the SVG document.
                var rectMatrix = this.node.getTransformToElement(target);
                // Decompose the matrix to find the rotation angle.
                var rectMatrixComponents = V.decomposeMatrix(rectMatrix);
                // Now we want to rotate the rectangle back so that we
                // can use `intersectionWithLineFromCenterToPoint()` passing the angle as the second argument.
                var resetRotation = svg.createSVGTransform();
                resetRotation.setRotate(-rectMatrixComponents.rotation, center.x, center.y);
                var rect = V.transformRect(gRect, resetRotation.matrix.multiply(rectMatrix));
                spot = g.rect(rect).intersectionWithLineFromCenterToPoint(ref, rectMatrixComponents.rotation);

            } else if (tagName === 'PATH' || tagName === 'POLYGON' || tagName === 'POLYLINE' || tagName === 'CIRCLE' || tagName === 'ELLIPSE') {

                var pathNode = (tagName === 'PATH') ? this : this.convertToPath();
                var samples = pathNode.sample();
                var minDistance = Infinity;
                var closestSamples = [];

                for (var i = 0, len = samples.length; i < len; i++) {

                    var sample = samples[i];
                    // Convert the sample point in the local coordinate system to the global coordinate system.
                    var gp = V.createSVGPoint(sample.x, sample.y);
                    gp = gp.matrixTransform(this.node.getTransformToElement(target));
                    sample = g.point(gp);
                    var centerDistance = sample.distance(center);
                    // Penalize a higher distance to the reference point by 10%.
                    // This gives better results. This is due to
                    // inaccuracies introduced by rounding errors and getPointAtLength() returns.
                    var refDistance = sample.distance(ref) * 1.1;
                    var distance = centerDistance + refDistance;
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestSamples = [{ sample: sample, refDistance: refDistance }];
                    } else if (distance < minDistance + 1) {
                        closestSamples.push({ sample: sample, refDistance: refDistance });
                    }
                }
                closestSamples.sort(function(a, b) { return a.refDistance - b.refDistance; });
                spot = closestSamples[0].sample;
            }

            return spot;
        }
    };

    function convertLineToPathData(line) {

        line = createElement(line);
        var d = [
            'M', line.attr('x1'), line.attr('y1'),
            'L', line.attr('x2'), line.attr('y2')
        ].join(' ');
        return d;
    }

    function convertPolygonToPathData(polygon) {

        polygon = createElement(polygon);
        var points = polygon.node.points;

        var d = [];
        var p;
        for (var i = 0; i < points.length; i++) {
            p = points[i];
            d.push(i === 0 ? 'M' : 'L', p.x, p.y);
        }
        d.push('Z');
        return d.join(' ');
    }

    function convertPolylineToPathData(polyline) {

        polyline = createElement(polyline);
        var points = polyline.node.points;

        var d = [];
        var p;
        for (var i = 0; i < points.length; i++) {
            p = points[i];
            d.push(i === 0 ? 'M' : 'L', p.x, p.y);
        }
        return d.join(' ');
    }

    var KAPPA = 0.5522847498307935;

    function convertCircleToPathData(circle) {

        circle = createElement(circle);
        var cx = parseFloat(circle.attr('cx')) || 0;
        var cy = parseFloat(circle.attr('cy')) || 0;
        var r = parseFloat(circle.attr('r'));
        var cd = r * KAPPA; // Control distance.

        var d = [
            'M', cx, cy - r,    // Move to the first point.
            'C', cx + cd, cy - r, cx + r, cy - cd, cx + r, cy, // I. Quadrant.
            'C', cx + r, cy + cd, cx + cd, cy + r, cx, cy + r, // II. Quadrant.
            'C', cx - cd, cy + r, cx - r, cy + cd, cx - r, cy, // III. Quadrant.
            'C', cx - r, cy - cd, cx - cd, cy - r, cx, cy - r, // IV. Quadrant.
            'Z'
        ].join(' ');
        return d;
    }

    function convertEllipseToPathData(ellipse) {

        ellipse = createElement(ellipse);
        var cx = parseFloat(ellipse.attr('cx')) || 0;
        var cy = parseFloat(ellipse.attr('cy')) || 0;
        var rx = parseFloat(ellipse.attr('rx'));
        var ry = parseFloat(ellipse.attr('ry')) || rx;
        var cdx = rx * KAPPA; // Control distance x.
        var cdy = ry * KAPPA; // Control distance y.

        var d = [
            'M', cx, cy - ry,    // Move to the first point.
            'C', cx + cdx, cy - ry, cx + rx, cy - cdy, cx + rx, cy, // I. Quadrant.
            'C', cx + rx, cy + cdy, cx + cdx, cy + ry, cx, cy + ry, // II. Quadrant.
            'C', cx - cdx, cy + ry, cx - rx, cy + cdy, cx - rx, cy, // III. Quadrant.
            'C', cx - rx, cy - cdy, cx - cdx, cy - ry, cx, cy - ry, // IV. Quadrant.
            'Z'
        ].join(' ');
        return d;
    }

    function convertRectToPathData(rect) {

        rect = createElement(rect);
        var x = parseFloat(rect.attr('x')) || 0;
        var y = parseFloat(rect.attr('y')) || 0;
        var width = parseFloat(rect.attr('width')) || 0;
        var height = parseFloat(rect.attr('height')) || 0;
        var rx = parseFloat(rect.attr('rx')) || 0;
        var ry = parseFloat(rect.attr('ry')) || 0;
        var bbox = g.rect(x, y, width, height);

        var d;

        if (!rx && !ry) {

            d = [
                'M', bbox.origin().x, bbox.origin().y,
                'H', bbox.corner().x,
                'V', bbox.corner().y,
                'H', bbox.origin().x,
                'V', bbox.origin().y,
                'Z'
            ].join(' ');

        } else {

            var r = x + width;
            var b = y + height;
            d = [
                'M', x + rx, y,
                'L', r - rx, y,
                'Q', r, y, r, y + ry,
                'L', r, y + height - ry,
                'Q', r, b, r - rx, b,
                'L', x + rx, b,
                'Q', x, b, x, b - rx,
                'L', x, y + ry,
                'Q', x, y, x + rx, y,
                'Z'
            ].join(' ');
        }
        return d;
    }

    // Convert a rectangle to SVG path commands. `r` is an object of the form:
    // `{ x: [number], y: [number], width: [number], height: [number], top-ry: [number], top-ry: [number], bottom-rx: [number], bottom-ry: [number] }`,
    // where `x, y, width, height` are the usual rectangle attributes and [top-/bottom-]rx/ry allows for
    // specifying radius of the rectangle for all its sides (as opposed to the built-in SVG rectangle
    // that has only `rx` and `ry` attributes).
    function rectToPath(r) {

        var topRx = r.rx || r['top-rx'] || 0;
        var bottomRx = r.rx || r['bottom-rx'] || 0;
        var topRy = r.ry || r['top-ry'] || 0;
        var bottomRy = r.ry || r['bottom-ry'] || 0;

        return [
            'M', r.x, r.y + topRy,
            'v', r.height - topRy - bottomRy,
            'a', bottomRx, bottomRy, 0, 0, 0, bottomRx, bottomRy,
            'h', r.width - 2 * bottomRx,
            'a', bottomRx, bottomRy, 0, 0, 0, bottomRx, -bottomRy,
            'v', -(r.height - bottomRy - topRy),
            'a', topRx, topRy, 0, 0, 0, -topRx, -topRy,
            'h', -(r.width - 2 * topRx),
            'a', topRx, topRy, 0, 0, 0, -topRx, topRy
        ].join(' ');
    }

    var V = createElement;

    V.isVElement = function(object) {
        return object instanceof VElement;
    };

    V.decomposeMatrix = decomposeMatrix;
    V.rectToPath = rectToPath;

    var svgDocument = V('svg').node;

    V.createSVGMatrix = function(m) {

        var svgMatrix = svgDocument.createSVGMatrix();
        for (var component in m) {
            svgMatrix[component] = m[component];
        }

        return svgMatrix;
    };

    V.createSVGTransform = function() {

        return svgDocument.createSVGTransform();
    };

    V.createSVGPoint = function(x, y) {

        var p = svgDocument.createSVGPoint();
        p.x = x;
        p.y = y;
        return p;
    };

    V.transformRect = function(r, matrix) {

        var p = svgDocument.createSVGPoint();

        p.x = r.x;
        p.y = r.y;
        var corner1 = p.matrixTransform(matrix);

        p.x = r.x + r.width;
        p.y = r.y;
        var corner2 = p.matrixTransform(matrix);

        p.x = r.x + r.width;
        p.y = r.y + r.height;
        var corner3 = p.matrixTransform(matrix);

        p.x = r.x;
        p.y = r.y + r.height;
        var corner4 = p.matrixTransform(matrix);

        var minX = Math.min(corner1.x, corner2.x, corner3.x, corner4.x);
        var maxX = Math.max(corner1.x, corner2.x, corner3.x, corner4.x);
        var minY = Math.min(corner1.y, corner2.y, corner3.y, corner4.y);
        var maxY = Math.max(corner1.y, corner2.y, corner3.y, corner4.y);

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    };

    // Convert a style represented as string (e.g. `'fill="blue"; stroke="red"'`) to
    // an object (`{ fill: 'blue', stroke: 'red' }`).
    V.styleToObject = function(styleString) {
        var ret = {};
        var styles = styleString.split(';');
        for (var i = 0; i < styles.length; i++) {
            var style = styles[i];
            var pair = style.split('=');
            ret[pair[0].trim()] = pair[1].trim();
        }
        return ret;
    };

    // Inspired by d3.js https://github.com/mbostock/d3/blob/master/src/svg/arc.js
    V.createSlicePathData = function(innerRadius, outerRadius, startAngle, endAngle) {

        var svgArcMax = 2 * Math.PI - 1e-6;
        var r0 = innerRadius;
        var r1 = outerRadius;
        var a0 = startAngle;
        var a1 = endAngle;
        var da = (a1 < a0 && (da = a0, a0 = a1, a1 = da), a1 - a0);
        var df = da < Math.PI ? '0' : '1';
        var c0 = Math.cos(a0);
        var s0 = Math.sin(a0);
        var c1 = Math.cos(a1);
        var s1 = Math.sin(a1);

        return (da >= svgArcMax)
            ? (r0
               ? 'M0,' + r1
               + 'A' + r1 + ',' + r1 + ' 0 1,1 0,' + (-r1)
               + 'A' + r1 + ',' + r1 + ' 0 1,1 0,' + r1
               + 'M0,' + r0
               + 'A' + r0 + ',' + r0 + ' 0 1,0 0,' + (-r0)
               + 'A' + r0 + ',' + r0 + ' 0 1,0 0,' + r0
               + 'Z'
               : 'M0,' + r1
               + 'A' + r1 + ',' + r1 + ' 0 1,1 0,' + (-r1)
               + 'A' + r1 + ',' + r1 + ' 0 1,1 0,' + r1
               + 'Z')
            : (r0
               ? 'M' + r1 * c0 + ',' + r1 * s0
               + 'A' + r1 + ',' + r1 + ' 0 ' + df + ',1 ' + r1 * c1 + ',' + r1 * s1
               + 'L' + r0 * c1 + ',' + r0 * s1
               + 'A' + r0 + ',' + r0 + ' 0 ' + df + ',0 ' + r0 * c0 + ',' + r0 * s0
               + 'Z'
               : 'M' + r1 * c0 + ',' + r1 * s0
               + 'A' + r1 + ',' + r1 + ' 0 ' + df + ',1 ' + r1 * c1 + ',' + r1 * s1
               + 'L0,0'
               + 'Z');
    };

    // Merge attributes from object `b` with attributes in object `a`.
    // Note that this modifies the object `a`.
    // Also important to note that attributes are merged but CSS classes are concatenated.
    V.mergeAttrs = function(a, b) {
        for (var attr in b) {
            if (attr === 'class') {
                // Concatenate classes.
                a[attr] = a[attr] ? a[attr] + ' ' + b[attr] : b[attr];
            } else if (attr === 'style') {
                // `style` attribute can be an object.
                if (isObject(a[attr]) && isObject(b[attr])) {
                    // `style` stored in `a` is an object.
                    a[attr] = V.mergeAttrs(a[attr], b[attr]);
                } else if (isObject(a[attr])) {
                    // `style` in `a` is an object but it's a string in `b`.
                    // Convert the style represented as a string to an object in `b`.
                    a[attr] = V.mergeAttrs(a[attr], V.styleToObject(b[attr]));
                } else if (isObject(b[attr])) {
                    // `style` in `a` is a string, in `b` it's an object.
                    a[attr] = V.mergeAttrs(V.styleToObject(a[attr]), b[attr]);
                } else {
                    // Both styles are strings.
                    a[attr] = V.mergeAttrs(V.styleToObject(a[attr]), V.styleToObject(b[attr]));
                }
            } else {
                a[attr] = b[attr];
            }
        }
        return a;
    };

    V.annotateString = function(t, annotations, opt) {

        annotations = annotations || [];
        opt = opt || {};
        offset = opt.offset || 0;
        var compacted = [];
        var batch;

        var ret = [];
        var item;
        var prev;

        for (var i = 0; i < t.length; i++) {

            item = ret[i] = t[i];

            for (var j = 0; j < annotations.length; j++) {
                var annotation = annotations[j];
                var start = annotation.start + offset;
                var end = annotation.end + offset;

                if (i >= start && i < end) {
                    // Annotation applies.
                    if (isObject(item)) {
                        // There is more than one annotation to be applied => Merge attributes.
                        item.attrs = V.mergeAttrs(V.mergeAttrs({}, item.attrs), annotation.attrs);
                    } else {
                        item = ret[i] = { t: t[i], attrs: annotation.attrs };
                    }
                    if (opt.includeAnnotationIndices) {
                        (item.annotations || (item.annotations = [])).push(j);
                    }
                }
            }

            prev = ret[i - 1];

            if (!prev) {

                batch = item;

            } else if (isObject(item) && isObject(prev)) {
                // Both previous item and the current one are annotations. If the attributes
                // didn't change, merge the text.
                if (JSON.stringify(item.attrs) === JSON.stringify(prev.attrs)) {
                    batch.t += item.t;
                } else {
                    compacted.push(batch);
                    batch = item;
                }

            } else if (isObject(item)) {
                // Previous item was a string, current item is an annotation.
                compacted.push(batch);
                batch = item;

            } else if (isObject(prev)) {
                // Previous item was an annotation, current item is a string.
                compacted.push(batch);
                batch = item;

            } else {
                // Both previous and current item are strings.
                batch = (batch || '') + item;
            }
        }

        if (batch) {
            compacted.push(batch);
        }

        return compacted;
    };

    V.findAnnotationsAtIndex = function(annotations, index) {

        if (!annotations) return [];

        var found = [];

        annotations.forEach(function(annotation) {

            if (annotation.start < index && index <= annotation.end) {
                found.push(annotation);
            }
        });
        return found;
    };

    V.findAnnotationsBetweenIndexes = function(annotations, start, end) {

        if (!annotations) return [];

        var found = [];

        annotations.forEach(function(annotation) {

            if ((start >= annotation.start && start < annotation.end) || (end > annotation.start && end <= annotation.end) || (annotation.start >= start && annotation.end < end)) {
                found.push(annotation);
            }
        });
        return found;
    };

    // Shift all the text annotations after character `index` by `offset` positions.
    V.shiftAnnotations = function(annotations, index, offset) {

        if (!annotations) return annotations;

        annotations.forEach(function(annotation) {

            if (annotation.start >= index) {
                annotation.start += offset;
                annotation.end += offset;
            }
        });

        return annotations;
    };

    V.sanitizeText = sanitizeText;

    return V;

})();

//      Geometry library.
//      (c) 2011-2013 client IO

var g = (function() {

    // Declare shorthands to the most used math functions.
    var math = Math;
    var abs = math.abs;
    var cos = math.cos;
    var sin = math.sin;
    var sqrt = math.sqrt;
    var mmin = math.min;
    var mmax = math.max;
    var atan = math.atan;
    var atan2 = math.atan2;
    var acos = math.acos;
    var round = math.round;
    var floor = math.floor;
    var PI = math.PI;
    var random = math.random;
    var toDeg = function(rad) { return (180 * rad / PI) % 360; };
    var toRad = function(deg, over360) {
        over360 = over360 || false;
        deg = over360 ? deg : (deg % 360);
        return deg * PI / 180;
    };
    var snapToGrid = function(val, gridSize) { return gridSize * Math.round(val / gridSize); };
    var normalizeAngle = function(angle) { return (angle % 360) + (angle < 0 ? 360 : 0); };

    // Point
    // -----

    // Point is the most basic object consisting of x/y coordinate,.

    // Possible instantiations are:

    // * `point(10, 20)`
    // * `new point(10, 20)`
    // * `point('10 20')`
    // * `point(point(10, 20))`
    function point(x, y) {
        if (!(this instanceof point))
            return new point(x, y);
        var xy;
        if (y === undefined && Object(x) !== x) {
            xy = x.split(x.indexOf('@') === -1 ? ' ' : '@');
            this.x = parseInt(xy[0], 10);
            this.y = parseInt(xy[1], 10);
        } else if (Object(x) === x) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    point.prototype = {
        toString: function() {
            return this.x + '@' + this.y;
        },
        // If point lies outside rectangle `r`, return the nearest point on the boundary of rect `r`,
        // otherwise return point itself.
        // (see Squeak Smalltalk, Point>>adhereTo:)
        adhereToRect: function(r) {
            if (r.containsPoint(this)) {
                return this;
            }
            this.x = mmin(mmax(this.x, r.x), r.x + r.width);
            this.y = mmin(mmax(this.y, r.y), r.y + r.height);
            return this;
        },
        // Compute the angle between me and `p` and the x axis.
        // (cartesian-to-polar coordinates conversion)
        // Return theta angle in degrees.
        theta: function(p) {
            p = point(p);
            // Invert the y-axis.
            var y = -(p.y - this.y);
            var x = p.x - this.x;
            // Makes sure that the comparison with zero takes rounding errors into account.
            var PRECISION = 10;
            // Note that `atan2` is not defined for `x`, `y` both equal zero.
            var rad = (y.toFixed(PRECISION) == 0 && x.toFixed(PRECISION) == 0) ? 0 : atan2(y, x);

            // Correction for III. and IV. quadrant.
            if (rad < 0) {
                rad = 2 * PI + rad;
            }
            return 180 * rad / PI;
        },
        // Returns distance between me and point `p`.
        distance: function(p) {
            return line(this, p).length();
        },
        // Returns a manhattan (taxi-cab) distance between me and point `p`.
        manhattanDistance: function(p) {
            return abs(p.x - this.x) + abs(p.y - this.y);
        },
        // Offset me by the specified amount.
        offset: function(dx, dy) {
            this.x += dx || 0;
            this.y += dy || 0;
            return this;
        },
        magnitude: function() {
            return sqrt((this.x * this.x) + (this.y * this.y)) || 0.01;
        },
        update: function(x, y) {
            this.x = x || 0;
            this.y = y || 0;
            return this;
        },
        round: function(decimals) {
            this.x = decimals ? this.x.toFixed(decimals) : round(this.x);
            this.y = decimals ? this.y.toFixed(decimals) : round(this.y);
            return this;
        },
        // Scale the line segment between (0,0) and me to have a length of len.
        normalize: function(len) {
            var s = (len || 1) / this.magnitude();
            this.x = s * this.x;
            this.y = s * this.y;
            return this;
        },
        difference: function(p) {
            return point(this.x - p.x, this.y - p.y);
        },
        // Return the bearing between me and point `p`.
        bearing: function(p) {
            return line(this, p).bearing();
        },
        // Converts rectangular to polar coordinates.
        // An origin can be specified, otherwise it's 0@0.
        toPolar: function(o) {
            o = (o && point(o)) || point(0, 0);
            var x = this.x;
            var y = this.y;
            this.x = sqrt((x - o.x) * (x - o.x) + (y - o.y) * (y - o.y)); // r
            this.y = toRad(o.theta(point(x, y)));
            return this;
        },
        // Rotate point by angle around origin o.
        rotate: function(o, angle) {
            angle = (angle + 360) % 360;
            this.toPolar(o);
            this.y += toRad(angle);
            var p = point.fromPolar(this.x, this.y, o);
            this.x = p.x;
            this.y = p.y;
            return this;
        },
        // Move point on line starting from ref ending at me by
        // distance distance.
        move: function(ref, distance) {
            var theta = toRad(point(ref).theta(this));
            return this.offset(cos(theta) * distance, -sin(theta) * distance);
        },
        // Returns change in angle from my previous position (-dx, -dy) to my new position
        // relative to ref point.
        changeInAngle: function(dx, dy, ref) {
            // Revert the translation and measure the change in angle around x-axis.
            return point(this).offset(-dx, -dy).theta(ref) - this.theta(ref);
        },
        equals: function(p) {
            return this.x === p.x && this.y === p.y;
        },
        snapToGrid: function(gx, gy) {
            this.x = snapToGrid(this.x, gx);
            this.y = snapToGrid(this.y, gy || gx);
            return this;
        },
        // Returns a point that is the reflection of me with
        // the center of inversion in ref point.
        reflection: function(ref) {
            return point(ref).move(this, this.distance(ref));
        },
        clone: function() {
            return point(this);
        }
    };
    // Alternative constructor, from polar coordinates.
    // @param {number} r Distance.
    // @param {number} angle Angle in radians.
    // @param {point} [optional] o Origin.
    point.fromPolar = function(r, angle, o) {
        o = (o && point(o)) || point(0, 0);
        var x = abs(r * cos(angle));
        var y = abs(r * sin(angle));
        var deg = normalizeAngle(toDeg(angle));

        if (deg < 90) {
            y = -y;
        } else if (deg < 180) {
            x = -x;
            y = -y;
        } else if (deg < 270) {
            x = -x;
        }

        return point(o.x + x, o.y + y);
    };

    // Create a point with random coordinates that fall into the range `[x1, x2]` and `[y1, y2]`.
    point.random = function(x1, x2, y1, y2) {
        return point(floor(random() * (x2 - x1 + 1) + x1), floor(random() * (y2 - y1 + 1) + y1));
    };

    // Line.
    // -----
    function line(p1, p2) {
        if (!(this instanceof line))
            return new line(p1, p2);
        this.start = point(p1);
        this.end = point(p2);
    }

    line.prototype = {
        toString: function() {
            return this.start.toString() + ' ' + this.end.toString();
        },
        // @return {double} length of the line
        length: function() {
            return sqrt(this.squaredLength());
        },
        // @return {integer} length without sqrt
        // @note for applications where the exact length is not necessary (e.g. compare only)
        squaredLength: function() {
            var x0 = this.start.x;
            var y0 = this.start.y;
            var x1 = this.end.x;
            var y1 = this.end.y;
            return (x0 -= x1) * x0 + (y0 -= y1) * y0;
        },
        // @return {point} my midpoint
        midpoint: function() {
            return point((this.start.x + this.end.x) / 2,
                         (this.start.y + this.end.y) / 2);
        },
        // @return {point} Point where I'm intersecting l.
        // @see Squeak Smalltalk, LineSegment>>intersectionWith:
        intersection: function(l) {
            var pt1Dir = point(this.end.x - this.start.x, this.end.y - this.start.y);
            var pt2Dir = point(l.end.x - l.start.x, l.end.y - l.start.y);
            var det = (pt1Dir.x * pt2Dir.y) - (pt1Dir.y * pt2Dir.x);
            var deltaPt = point(l.start.x - this.start.x, l.start.y - this.start.y);
            var alpha = (deltaPt.x * pt2Dir.y) - (deltaPt.y * pt2Dir.x);
            var beta = (deltaPt.x * pt1Dir.y) - (deltaPt.y * pt1Dir.x);

            if (det === 0 ||
                alpha * det < 0 ||
                beta * det < 0) {
                // No intersection found.
                return null;
            }
            if (det > 0) {
                if (alpha > det || beta > det) {
                    return null;
                }
            } else {
                if (alpha < det || beta < det) {
                    return null;
                }
            }
            return point(this.start.x + (alpha * pt1Dir.x / det),
                         this.start.y + (alpha * pt1Dir.y / det));
        },

        // @return the bearing (cardinal direction) of the line. For example N, W, or SE.
        // @returns {String} One of the following bearings : NE, E, SE, S, SW, W, NW, N.
        bearing: function() {

            var lat1 = toRad(this.start.y);
            var lat2 = toRad(this.end.y);
            var lon1 = this.start.x;
            var lon2 = this.end.x;
            var dLon = toRad(lon2 - lon1);
            var y = sin(dLon) * cos(lat2);
            var x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
            var brng = toDeg(atan2(y, x));

            var bearings = ['NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];

            var index = brng - 22.5;
            if (index < 0)
                index += 360;
            index = parseInt(index / 45);

            return bearings[index];
        },

        // @return {point} my point at 't' <0,1>
        pointAt: function(t) {
            var x = (1 - t) * this.start.x + t * this.end.x;
            var y = (1 - t) * this.start.y + t * this.end.y;
            return point(x, y);
        },

        // @return {number} the offset of the point `p` from the line. + if the point `p` is on the right side of the line, - if on the left and 0 if on the line.
        pointOffset: function(p) {
            // Find the sign of the determinant of vectors (start,end), where p is the query point.
            return ((this.end.x - this.start.x) * (p.y - this.start.y) - (this.end.y - this.start.y) * (p.x - this.start.x)) / 2;
        },
        clone: function() {
            return line(this);
        }
    };

    // Rectangle.
    // ----------
    function rect(x, y, w, h) {
        if (!(this instanceof rect))
            return new rect(x, y, w, h);
        if (y === undefined) {
            y = x.y;
            w = x.width;
            h = x.height;
            x = x.x;
        }
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    }

    rect.prototype = {
        toString: function() {
            return this.origin().toString() + ' ' + this.corner().toString();
        },
        // @return {boolean} true if rectangles are equal.
        equals: function(r) {
            var mr = g.rect(this).normalize();
            var nr = g.rect(r).normalize();
            return mr.x === nr.x && mr.y === nr.y && mr.width === nr.width && mr.height === nr.height;
        },
        origin: function() {
            return point(this.x, this.y);
        },
        corner: function() {
            return point(this.x + this.width, this.y + this.height);
        },
        topRight: function() {
            return point(this.x + this.width, this.y);
        },
        bottomLeft: function() {
            return point(this.x, this.y + this.height);
        },
        center: function() {
            return point(this.x + this.width / 2, this.y + this.height / 2);
        },
        // @return {rect} if rectangles intersect, {null} if not.
        intersect: function(r) {
            var myOrigin = this.origin();
            var myCorner = this.corner();
            var rOrigin = r.origin();
            var rCorner = r.corner();

            // No intersection found
            if (rCorner.x <= myOrigin.x ||
                rCorner.y <= myOrigin.y ||
                rOrigin.x >= myCorner.x ||
                rOrigin.y >= myCorner.y) return null;

            var x = Math.max(myOrigin.x, rOrigin.x);
            var y = Math.max(myOrigin.y, rOrigin.y);

            return rect(x, y, Math.min(myCorner.x, rCorner.x) - x, Math.min(myCorner.y, rCorner.y) - y);
        },

        // @return {string} (left|right|top|bottom) side which is nearest to point
        // @see Squeak Smalltalk, Rectangle>>sideNearestTo:
        sideNearestToPoint: function(p) {
            p = point(p);
            var distToLeft = p.x - this.x;
            var distToRight = (this.x + this.width) - p.x;
            var distToTop = p.y - this.y;
            var distToBottom = (this.y + this.height) - p.y;
            var closest = distToLeft;
            var side = 'left';

            if (distToRight < closest) {
                closest = distToRight;
                side = 'right';
            }
            if (distToTop < closest) {
                closest = distToTop;
                side = 'top';
            }
            if (distToBottom < closest) {
                closest = distToBottom;
                side = 'bottom';
            }
            return side;
        },
        // @return {bool} true if point p is insight me
        containsPoint: function(p) {
            p = point(p);
            if (p.x >= this.x && p.x <= this.x + this.width &&
                p.y >= this.y && p.y <= this.y + this.height) {
                return true;
            }
            return false;
        },
        // Algorithm ported from java.awt.Rectangle from OpenJDK.
        // @return {bool} true if rectangle `r` is inside me.
        containsRect: function(r) {
            var nr = rect(r).normalize();
            var W = nr.width;
            var H = nr.height;
            var X = nr.x;
            var Y = nr.y;
            var w = this.width;
            var h = this.height;
            if ((w | h | W | H) < 0) {
                // At least one of the dimensions is negative...
                return false;
            }
            // Note: if any dimension is zero, tests below must return false...
            var x = this.x;
            var y = this.y;
            if (X < x || Y < y) {
                return false;
            }
            w += x;
            W += X;
            if (W <= X) {
                // X+W overflowed or W was zero, return false if...
                // either original w or W was zero or
                // x+w did not overflow or
                // the overflowed x+w is smaller than the overflowed X+W
                if (w >= x || W > w) return false;
            } else {
                // X+W did not overflow and W was not zero, return false if...
                // original w was zero or
                // x+w did not overflow and x+w is smaller than X+W
                if (w >= x && W > w) return false;
            }
            h += y;
            H += Y;
            if (H <= Y) {
                if (h >= y || H > h) return false;
            } else {
                if (h >= y && H > h) return false;
            }
            return true;
        },
        // @return {point} a point on my boundary nearest to p
        // @see Squeak Smalltalk, Rectangle>>pointNearestTo:
        pointNearestToPoint: function(p) {
            p = point(p);
            if (this.containsPoint(p)) {
                var side = this.sideNearestToPoint(p);
                switch (side){
                    case 'right': return point(this.x + this.width, p.y);
                    case 'left': return point(this.x, p.y);
                    case 'bottom': return point(p.x, this.y + this.height);
                    case 'top': return point(p.x, this.y);
                }
            }
            return p.adhereToRect(this);
        },
        // Find point on my boundary where line starting
        // from my center ending in point p intersects me.
        // @param {number} angle If angle is specified, intersection with rotated rectangle is computed.
        intersectionWithLineFromCenterToPoint: function(p, angle) {
            p = point(p);
            var center = point(this.x + this.width / 2, this.y + this.height / 2);
            var result;
            if (angle) p.rotate(center, angle);

            // (clockwise, starting from the top side)
            var sides = [
                line(this.origin(), this.topRight()),
                line(this.topRight(), this.corner()),
                line(this.corner(), this.bottomLeft()),
                line(this.bottomLeft(), this.origin())
            ];
            var connector = line(center, p);

            for (var i = sides.length - 1; i >= 0; --i) {
                var intersection = sides[i].intersection(connector);
                if (intersection !== null) {
                    result = intersection;
                    break;
                }
            }
            if (result && angle) result.rotate(center, -angle);
            return result;
        },
        // Move and expand me.
        // @param r {rectangle} representing deltas
        moveAndExpand: function(r) {
            this.x += r.x || 0;
            this.y += r.y || 0;
            this.width += r.width || 0;
            this.height += r.height || 0;
            return this;
        },
        round: function(decimals) {
            this.x = decimals ? this.x.toFixed(decimals) : round(this.x);
            this.y = decimals ? this.y.toFixed(decimals) : round(this.y);
            this.width = decimals ? this.width.toFixed(decimals) : round(this.width);
            this.height = decimals ? this.height.toFixed(decimals) : round(this.height);
            return this;
        },
        // Normalize the rectangle; i.e., make it so that it has a non-negative width and height.
        // If width < 0 the function swaps the left and right corners,
        // and it swaps the top and bottom corners if height < 0
        // like in http://qt-project.org/doc/qt-4.8/qrectf.html#normalized
        normalize: function() {
            var newx = this.x;
            var newy = this.y;
            var newwidth = this.width;
            var newheight = this.height;
            if (this.width < 0) {
                newx = this.x + this.width;
                newwidth = -this.width;
            }
            if (this.height < 0) {
                newy = this.y + this.height;
                newheight = -this.height;
            }
            this.x = newx;
            this.y = newy;
            this.width = newwidth;
            this.height = newheight;
            return this;
        },
        // Find my bounding box when I'm rotated with the center of rotation in the center of me.
        // @return r {rectangle} representing a bounding box
        bbox: function(angle) {
            var theta = toRad(angle || 0);
            var st = abs(sin(theta));
            var ct = abs(cos(theta));
            var w = this.width * ct + this.height * st;
            var h = this.width * st + this.height * ct;
            return rect(this.x + (this.width - w) / 2, this.y + (this.height - h) / 2, w, h);
        },
        snapToGrid: function(gx, gy) {
            var origin = this.origin().snapToGrid(gx, gy);
            var corner = this.corner().snapToGrid(gx, gy);
            this.x = origin.x;
            this.y = origin.y;
            this.width = corner.x - origin.x;
            this.height = corner.y - origin.y;
            return this;
        },
        clone: function() {
            return rect(this);
        }
    };

    // Ellipse.
    // --------
    function ellipse(c, a, b) {
        if (!(this instanceof ellipse))
            return new ellipse(c, a, b);
        c = point(c);
        this.x = c.x;
        this.y = c.y;
        this.a = a;
        this.b = b;
    }

    ellipse.prototype = {
        toString: function() {
            return point(this.x, this.y).toString() + ' ' + this.a + ' ' + this.b;
        },
        bbox: function() {
            return rect(this.x - this.a, this.y - this.b, 2 * this.a, 2 * this.b);
        },
        // Find point on me where line from my center to
        // point p intersects my boundary.
        // @param {number} angle If angle is specified, intersection with rotated ellipse is computed.
        intersectionWithLineFromCenterToPoint: function(p, angle) {
            p = point(p);
            if (angle) p.rotate(point(this.x, this.y), angle);
            var dx = p.x - this.x;
            var dy = p.y - this.y;
            var result;
            if (dx === 0) {
                result = this.bbox().pointNearestToPoint(p);
                if (angle) return result.rotate(point(this.x, this.y), -angle);
                return result;
            }
            var m = dy / dx;
            var mSquared = m * m;
            var aSquared = this.a * this.a;
            var bSquared = this.b * this.b;
            var x = sqrt(1 / ((1 / aSquared) + (mSquared / bSquared)));

            x = dx < 0 ? -x : x;
            var y = m * x;
            result = point(this.x + x, this.y + y);
            if (angle) return result.rotate(point(this.x, this.y), -angle);
            return result;
        },
        clone: function() {
            return ellipse(this);
        }
    };

    // Bezier curve.
    // -------------
    var bezier = {
        // Cubic Bezier curve path through points.
        // Ported from C# implementation by Oleg V. Polikarpotchkin and Peter Lee (http://www.codeproject.com/KB/graphics/BezierSpline.aspx).
        // @param {array} points Array of points through which the smooth line will go.
        // @return {array} SVG Path commands as an array
        curveThroughPoints: function(points) {
            var controlPoints = this.getCurveControlPoints(points);
            var path = ['M', points[0].x, points[0].y];

            for (var i = 0; i < controlPoints[0].length; i++) {
                path.push('C', controlPoints[0][i].x, controlPoints[0][i].y, controlPoints[1][i].x, controlPoints[1][i].y, points[i + 1].x, points[i + 1].y);
            }
            return path;
        },

        // Get open-ended Bezier Spline Control Points.
        // @param knots Input Knot Bezier spline points (At least two points!).
        // @param firstControlPoints Output First Control points. Array of knots.length - 1 length.
        //  @param secondControlPoints Output Second Control points. Array of knots.length - 1 length.
        getCurveControlPoints: function(knots) {
            var firstControlPoints = [];
            var secondControlPoints = [];
            var n = knots.length - 1;
            var i;

            // Special case: Bezier curve should be a straight line.
            if (n == 1) {
                // 3P1 = 2P0 + P3
                firstControlPoints[0] = point((2 * knots[0].x + knots[1].x) / 3,
                                              (2 * knots[0].y + knots[1].y) / 3);
                // P2 = 2P1 – P0
                secondControlPoints[0] = point(2 * firstControlPoints[0].x - knots[0].x,
                                               2 * firstControlPoints[0].y - knots[0].y);
                return [firstControlPoints, secondControlPoints];
            }

            // Calculate first Bezier control points.
            // Right hand side vector.
            var rhs = [];

            // Set right hand side X values.
            for (i = 1; i < n - 1; i++) {
                rhs[i] = 4 * knots[i].x + 2 * knots[i + 1].x;
            }
            rhs[0] = knots[0].x + 2 * knots[1].x;
            rhs[n - 1] = (8 * knots[n - 1].x + knots[n].x) / 2.0;
            // Get first control points X-values.
            var x = this.getFirstControlPoints(rhs);

            // Set right hand side Y values.
            for (i = 1; i < n - 1; ++i) {
                rhs[i] = 4 * knots[i].y + 2 * knots[i + 1].y;
            }
            rhs[0] = knots[0].y + 2 * knots[1].y;
            rhs[n - 1] = (8 * knots[n - 1].y + knots[n].y) / 2.0;
            // Get first control points Y-values.
            var y = this.getFirstControlPoints(rhs);

            // Fill output arrays.
            for (i = 0; i < n; i++) {
                // First control point.
                firstControlPoints.push(point(x[i], y[i]));
                // Second control point.
                if (i < n - 1) {
                    secondControlPoints.push(point(2 * knots [i + 1].x - x[i + 1],
                                                   2 * knots[i + 1].y - y[i + 1]));
                } else {
                    secondControlPoints.push(point((knots[n].x + x[n - 1]) / 2,
                                                   (knots[n].y + y[n - 1]) / 2));
                }
            }
            return [firstControlPoints, secondControlPoints];
        },

        // Solves a tridiagonal system for one of coordinates (x or y) of first Bezier control points.
        // @param rhs Right hand side vector.
        // @return Solution vector.
        getFirstControlPoints: function(rhs) {
            var n = rhs.length;
            // `x` is a solution vector.
            var x = [];
            var tmp = [];
            var b = 2.0;

            x[0] = rhs[0] / b;
            // Decomposition and forward substitution.
            for (var i = 1; i < n; i++) {
                tmp[i] = 1 / b;
                b = (i < n - 1 ? 4.0 : 3.5) - tmp[i];
                x[i] = (rhs[i] - x[i - 1]) / b;
            }
            for (i = 1; i < n; i++) {
                // Backsubstitution.
                x[n - i - 1] -= tmp[n - i] * x[n - i];
            }
            return x;
        },

        // Solves an inversion problem -- Given the (x, y) coordinates of a point which lies on
        // a parametric curve x = x(t)/w(t), y = y(t)/w(t), ﬁnd the parameter value t
        // which corresponds to that point.
        // @param control points (start, control start, control end, end)
        // @return a function accepts a point and returns t.
        getInversionSolver: function(p0, p1, p2, p3) {
            var pts = arguments;
            function l(i, j) {
                // calculates a determinant 3x3
                // [p.x  p.y  1]
                // [pi.x pi.y 1]
                // [pj.x pj.y 1]
                var pi = pts[i];
                var pj = pts[j];
                return function(p) {
                    var w = (i % 3 ? 3 : 1) * (j % 3 ? 3 : 1);
                    var lij = p.x * (pi.y - pj.y) + p.y * (pj.x - pi.x) + pi.x * pj.y - pi.y * pj.x;
                    return w * lij;
                };
            }
            return function solveInversion(p) {
                var ct = 3 * l(2, 3)(p1);
                var c1 = l(1, 3)(p0) / ct;
                var c2 = -l(2, 3)(p0) / ct;
                var la = c1 * l(3, 1)(p) + c2 * (l(3, 0)(p) + l(2, 1)(p)) + l(2, 0)(p);
                var lb = c1 * l(3, 0)(p) + c2 * l(2, 0)(p) + l(1, 0)(p);
                return lb / (lb - la);
            };
        },

        // Divide a Bezier curve into two at point defined by value 't' <0,1>.
        // Using deCasteljau algorithm. http://math.stackexchange.com/a/317867
        // @param control points (start, control start, control end, end)
        // @return a function accepts t and returns 2 curves each defined by 4 control points.
        getCurveDivider: function(p0, p1, p2, p3) {
            return function divideCurve(t) {
                var l = line(p0, p1).pointAt(t);
                var m = line(p1, p2).pointAt(t);
                var n = line(p2, p3).pointAt(t);
                var p = line(l, m).pointAt(t);
                var q = line(m, n).pointAt(t);
                var r = line(p, q).pointAt(t);
                return [{ p0: p0, p1: l, p2: p, p3: r }, { p0: r, p1: q, p2: n, p3: p3 }];
            };
        }
    };

    // Scale.
    var scale = {

        // Return the `value` from the `domain` interval scaled to the `range` interval.
        linear: function(domain, range, value) {

            var domainSpan = domain[1] - domain[0];
            var rangeSpan = range[1] - range[0];
            return (((value - domain[0]) / domainSpan) * rangeSpan + range[0]) || 0;
        }
    };

    return {
        toDeg: toDeg,
        toRad: toRad,
        snapToGrid: snapToGrid,
        normalizeAngle: normalizeAngle,
        point: point,
        line: line,
        rect: rect,
        ellipse: ellipse,
        bezier: bezier,
        scale: scale
    };

})();

SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(toElement) {
    return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
};

var dedu = {


    // `joint.connectors` namespace.
    connectors: {},

    // `joint.routers` namespace.
    routers: {},
    /**
     * @namespace dedu.util
     */
    util: {

        // Return a simple hash code from a string. See http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/.
        hashCode: function(str) {

            var hash = 0;
            if (str.length == 0) return hash;
            for (var i = 0; i < str.length; i++) {
                var c = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + c;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash;
        },

        /**
         * Return a value at the path in a nested object. delim is the delimiter used in the path
         * @example
         * 
         * joint.util.getByPath({ a: { aa: { aaa: 3 } } }, 'a/aa/aaa', '/');//3
         * 
         * @param {Object} obj
         * @param {String} path
         * @param {String} delim
         * @returns {*}
         */
        getByPath: function(obj, path, delim) {

            delim = delim || '/';
            var keys = path.split(delim);
            var key;

            while (keys.length) {
                key = keys.shift();
                if (Object(obj) === obj && key in obj) {
                    obj = obj[key];
                } else {
                    return undefined;
                }
            }
            return obj;
        },

        /**
         * Set a value at the path in a nested object. delim is the delimiter used in the path
         *  Returns the augmented object
         *  @example
         *  
         *  joint.util.setByPath({ b: {bb:{}} }, 'b/bb/bbb', 2, '/');
         *  //{ b: {bb:{bbb:2}} },
         *  
         * @param {Object} obj
         * @param {String} path
         * @param {*} value
         * @param {String} delim
         * @returns {Object}
         */
        setByPath: function(obj, path, value, delim) {

            delim = delim || '/';

            var keys = path.split(delim);
            var diver = obj;
            var i = 0;

            if (path.indexOf(delim) > -1) {

                for (var len = keys.length; i < len - 1; i++) {
                    // diver creates an empty object if there is no nested object under such a key.
                    // This means that one can populate an empty nested object with setByPath().
                    diver = diver[keys[i]] || (diver[keys[i]] = {});
                }
                diver[keys[len - 1]] = value;
            } else {
                obj[path] = value;
            }
            return obj;
        },

        /**
         * Unset (delete) a property at the path in a nested object. delim is the delimiter used in the path. Returns the augmented object.
         * @example
         * 
         * joint.util.unsetByPath({ a: { aa: { aaa: 3 } } }, 'a/aa/aaa', '/');
         * // { a: { aa: {} } }
         * 
         * @param {Object} obj
         * @param {String} path
         * @param {String} delim
         * @returns {Object}
         */
        unsetByPath: function(obj, path, delim) {

            delim = delim || '/';

            // index of the last delimiter
            var i = path.lastIndexOf(delim);

            if (i > -1) {

                // unsetting a nested attribute
                var parent = joint.util.getByPath(obj, path.substr(0, i), delim);

                if (parent) {
                    delete parent[path.slice(i + 1)];
                }

            } else {

                // unsetting a primitive attribute
                delete obj[path];
            }

            return obj;
        },

        /**
         * Flatten a nested object up until the stop function returns true.
         * * The  stop function takes the value of the node currently traversed
         * * delim is a delimiter for the combined keys in the resulting object
         * @example
         * dedu.flattenObject({
         *  a:{
         *      a1:{
         *          a2:1
         *      }
         *  }
         * ),"/",function(v){return !!v.a2;}}
         * result:
         * {
         * "a/a1/a2":1
         * }
         *
         * @param {Object} obj
         * @param {String} delim
         * @param stop
         * @returns {Object}
         */
        flattenObject: function(obj, delim, stop) {

            delim = delim || '/';
            var ret = {};

            for (var key in obj) {

                if (!obj.hasOwnProperty(key)) continue;

                var shouldGoDeeper = typeof obj[key] === 'object';
                if (shouldGoDeeper && stop && stop(obj[key])) {
                    shouldGoDeeper = false;
                }

                if (shouldGoDeeper) {

                    var flatObject = this.flattenObject(obj[key], delim, stop);

                    for (var flatKey in flatObject) {
                        if (!flatObject.hasOwnProperty(flatKey)) continue;
                        ret[key + delim + flatKey] = flatObject[flatKey];
                    }

                } else {

                    ret[key] = obj[key];
                }
            }

            return ret;
        },

        /**
         * Return a pseudo-UUID.
         * @returns {string}
         */
        uuid: function() {

            // credit: http://stackoverflow.com/posts/2117523/revisions

            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0;
                var v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },

        /** Generate global unique id for obj and store it as a property of the object.
         * Return an identifier unique for the page.
         * @param {Object} obj
         * @returns {string|*}
         */
        guid: function(obj) {

            this.guid.id = this.guid.id || 1;
            obj.id = (obj.id === undefined ? 'j_' + this.guid.id++ : obj.id);
            return obj.id;
        },

        // Copy all the properties to the first argument from the following arguments.
        // All the properties will be overwritten by the properties from the following
        // arguments. Inherited properties are ignored.
        mixin: function() {

            var target = arguments[0];

            for (var i = 1, l = arguments.length; i < l; i++) {

                var extension = arguments[i];

                // Only functions and objects can be mixined.

                if ((Object(extension) !== extension) &&
                    !_.isFunction(extension) &&
                    (extension === null || extension === undefined)) {

                    continue;
                }


                _.each(extension, function(copy, key) {

                    if (this.mixin.deep && (Object(copy) === copy)) {

                        if (!target[key]) {

                            target[key] = _.isArray(copy) ? [] : {};
                        }

                        this.mixin(target[key], copy);
                        return;
                    }

                    if (target[key] !== copy) {

                        if (!this.mixin.supplement || !target.hasOwnProperty(key)) {

                            target[key] = copy;
                        }

                    }

                }, this);
            }

            return target;
        },

        /**
         * * Copy all properties to the first argument from the following \
         * arguments only in case if they don't exists in the first argument.
         * * All the function propererties in the first argument will get \
         *  additional property base pointing to the extenders same named property function's call method.
         * @returns {*}
         */
        supplement: function() {
            this.mixin.supplement = true;
            var ret = this.mixin.apply(this, arguments);
            this.mixin.supplement = false;
            return ret;
        },

        // Same as `mixin()` but deep version.
        deepMixin: function() {

            this.mixin.deep = true;
            var ret = this.mixin.apply(this, arguments);
            this.mixin.deep = false;
            return ret;
        },

        /** Same as `supplement()` but deep version.
         * @method deepSupplement
         * @returns {*}
         */
        deepSupplement: function() {

            this.mixin.deep = this.mixin.supplement = true;
            var ret = this.mixin.apply(this, arguments);
            this.mixin.deep = this.mixin.supplement = false;
            return ret;
        },

        /**
         * get orginal event
         * @method normalizeEvent
         * @param {JQueryEvent|*} evt
         * @example
         * 
         * var evt = dedu.util.normalizeEvent(evt);
         * 
         * @returns {*}
         */
        normalizeEvent: function(evt) {

            var touchEvt = evt.originalEvent && evt.originalEvent.changedTouches && evt.originalEvent.changedTouches[0];
            if (touchEvt) {
                for (var property in evt) {
                    // copy all the properties from the input event that are not
                    // defined on the touch event (functions included).
                    if (touchEvt[property] === undefined) {
                        touchEvt[property] = evt[property];
                    }
                }
                return touchEvt;
            }

            return evt;
        },

        nextFrame: (function() {

            var raf;

            if (typeof window !== 'undefined') {

                raf = window.requestAnimationFrame ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame ||
                    window.oRequestAnimationFrame ||
                    window.msRequestAnimationFrame;
            }

            if (!raf) {

                var lastTime = 0;

                raf = function(callback) {

                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = setTimeout(function() {
                        callback(currTime + timeToCall);
                    }, timeToCall);

                    lastTime = currTime + timeToCall;

                    return id;
                };
            }

            return function(callback, context) {
                return context ? raf(_.bind(callback, context)) : raf(callback);
            };

        })(),

        cancelFrame: (function() {

            var caf;
            var client = typeof window != 'undefined';

            if (client) {

                caf = window.cancelAnimationFrame ||
                    window.webkitCancelAnimationFrame ||
                    window.webkitCancelRequestAnimationFrame ||
                    window.msCancelAnimationFrame ||
                    window.msCancelRequestAnimationFrame ||
                    window.oCancelAnimationFrame ||
                    window.oCancelRequestAnimationFrame ||
                    window.mozCancelAnimationFrame ||
                    window.mozCancelRequestAnimationFrame;
            }

            caf = caf || clearTimeout;

            return client ? _.bind(caf, window) : caf;

        })(),

        shapePerimeterConnectionPoint: function(linkView, view, magnet, reference) {

            var bbox;
            var spot;

            if (!magnet) {

                // There is no magnet, try to make the best guess what is the
                // wrapping SVG element. This is because we want this "smart"
                // connection points to work out of the box without the
                // programmer to put magnet marks to any of the subelements.
                // For example, we want the functoin to work on basic.Path elements
                // without any special treatment of such elements.
                // The code below guesses the wrapping element based on
                // one simple assumption. The wrapping elemnet is the
                // first child of the scalable group if such a group exists
                // or the first child of the rotatable group if not.
                // This makese sense because usually the wrapping element
                // is below any other sub element in the shapes.
                var scalable = view.$('.scalable')[0];
                var rotatable = view.$('.rotatable')[0];

                if (scalable && scalable.firstChild) {

                    magnet = scalable.firstChild;

                } else if (rotatable && rotatable.firstChild) {

                    magnet = rotatable.firstChild;
                }
            }

            if (magnet) {

                spot = V(magnet).findIntersection(reference, linkView.paper.viewport);
                if (!spot) {
                    bbox = g.rect(V(magnet).bbox(false, linkView.paper.viewport));
                }

            } else {

                bbox = view.model.getBBox();
                spot = bbox.intersectionWithLineFromCenterToPoint(reference);
            }
            return spot || bbox.center();
        },

        breakText: function(text, size, styles, opt) {

            opt = opt || {};

            var width = size.width;
            var height = size.height;

            var svgDocument = opt.svgDocument || V('svg').node;
            var textElement = V('<text><tspan></tspan></text>').attr(styles || {}).node;
            var textSpan = textElement.firstChild;
            var textNode = document.createTextNode('');

            textSpan.appendChild(textNode);

            svgDocument.appendChild(textElement);

            if (!opt.svgDocument) {

                document.body.appendChild(svgDocument);
            }

            var words = text.split(' ');
            var full = [];
            var lines = [];
            var p;

            for (var i = 0, l = 0, len = words.length; i < len; i++) {

                var word = words[i];

                textNode.data = lines[l] ? lines[l] + ' ' + word : word;

                if (textSpan.getComputedTextLength() <= width) {

                    // the current line fits
                    lines[l] = textNode.data;

                    if (p) {
                        // We were partitioning. Put rest of the word onto next line
                        full[l++] = true;

                        // cancel partitioning
                        p = 0;
                    }

                } else {

                    if (!lines[l] || p) {

                        var partition = !!p;

                        p = word.length - 1;

                        if (partition || !p) {

                            // word has only one character.
                            if (!p) {

                                if (!lines[l]) {

                                    // we won't fit this text within our rect
                                    lines = [];

                                    break;
                                }

                                // partitioning didn't help on the non-empty line
                                // try again, but this time start with a new line

                                // cancel partitions created
                                words.splice(i, 2, word + words[i + 1]);

                                // adjust word length
                                len--;

                                full[l++] = true;
                                i--;

                                continue;
                            }

                            // move last letter to the beginning of the next word
                            words[i] = word.substring(0, p);
                            words[i + 1] = word.substring(p) + words[i + 1];

                        } else {

                            // We initiate partitioning
                            // split the long word into two words
                            words.splice(i, 1, word.substring(0, p), word.substring(p));

                            // adjust words length
                            len++;

                            if (l && !full[l - 1]) {
                                // if the previous line is not full, try to fit max part of
                                // the current word there
                                l--;
                            }
                        }

                        i--;

                        continue;
                    }

                    l++;
                    i--;
                }

                // if size.height is defined we have to check whether the height of the entire
                // text exceeds the rect height
                if (typeof height !== 'undefined') {

                    // get line height as text height / 0.8 (as text height is approx. 0.8em
                    // and line height is 1em. See vectorizer.text())
                    var lh = lh || textElement.getBBox().height * 1.25;

                    if (lh * lines.length > height) {

                        // remove overflowing lines
                        lines.splice(Math.floor(height / lh));

                        break;
                    }
                }
            }

            if (opt.svgDocument) {

                // svg document was provided, remove the text element only
                svgDocument.removeChild(textElement);

            } else {

                // clean svg document
                document.body.removeChild(svgDocument);
            }

            return lines.join('\n');
        },

        imageToDataUri: function(url, callback) {

            if (!url || url.substr(0, 'data:'.length) === 'data:') {
                // No need to convert to data uri if it is already in data uri.

                // This not only convenient but desired. For example,
                // IE throws a security error if data:image/svg+xml is used to render
                // an image to the canvas and an attempt is made to read out data uri.
                // Now if our image is already in data uri, there is no need to render it to the canvas
                // and so we can bypass this error.

                // Keep the async nature of the function.
                return setTimeout(function() {
                    callback(null, url);
                }, 0);
            }

            var canvas = document.createElement('canvas');
            var img = document.createElement('img');

            img.onload = function() {

                var ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);

                try {

                    // Guess the type of the image from the url suffix.
                    var suffix = (url.split('.').pop()) || 'png';
                    // A little correction for JPEGs. There is no image/jpg mime type but image/jpeg.
                    var type = 'image/' + (suffix === 'jpg') ? 'jpeg' : suffix;
                    var dataUri = canvas.toDataURL(type);

                } catch (e) {

                    if (/\.svg$/.test(url)) {
                        // IE throws a security error if we try to render an SVG into the canvas.
                        // Luckily for us, we don't need canvas at all to convert
                        // SVG to data uri. We can just use AJAX to load the SVG string
                        // and construct the data uri ourselves.
                        var xhr = window.XMLHttpRequest ? new XMLHttpRequest : new ActiveXObject('Microsoft.XMLHTTP');
                        xhr.open('GET', url, false);
                        xhr.send(null);
                        var svg = xhr.responseText;

                        return callback(null, 'data:image/svg+xml,' + encodeURIComponent(svg));
                    }

                    console.error(img.src, 'fails to convert', e);
                }

                callback(null, dataUri);
            };

            img.ononerror = function() {

                callback(new Error('Failed to load image.'));
            };

            img.src = url;
        },

        /**
         * Return a bounding box of the element el and can handle both HTML and SVG elements
         * The resulting object is of the form:`{ x: Number, y: Number, width: Number, height: Number }`
         * @param {DOMObject|SVGObject} el
         * @returns {*}
         */
        getElementBBox: function(el) {

            var $el = $(el);
            var offset = $el.offset();
            var bbox;

            if (el.ownerSVGElement) {

                // Use Vectorizer to get the dimensions of the element if it is an SVG element.
                bbox = V(el).bbox();

                // getBoundingClientRect() used in jQuery.fn.offset() takes into account `stroke-width`
                // in Firefox only. So clientRect width/height and getBBox width/height in FF don't match.
                // To unify this across all browsers we add the `stroke-width` (left & top) back to
                // the calculated offset.
                var crect = el.getBoundingClientRect();
                var strokeWidthX = (crect.width - bbox.width) / 2;
                var strokeWidthY = (crect.height - bbox.height) / 2;

                // The `bbox()` returns coordinates relative to the SVG viewport, therefore, use the
                // ones returned from the `offset()` method that are relative to the document.
                bbox.x = offset.left + strokeWidthX;
                bbox.y = offset.top + strokeWidthY;

            } else {

                bbox = {
                    x: offset.left,
                    y: offset.top,
                    width: $el.outerWidth(),
                    height: $el.outerHeight()
                };
            }

            return bbox;
        },


        // Highly inspired by the jquery.sortElements plugin by Padolsey.
        // See http://james.padolsey.com/javascript/sorting-elements-with-jquery/.
        sortElements: function(elements, comparator) {

            var $elements = $(elements);
            var placements = $elements.map(function() {

                var sortElement = this;
                var parentNode = sortElement.parentNode;
                // Since the element itself will change position, we have
                // to have some way of storing it's original position in
                // the DOM. The easiest way is to have a 'flag' node:
                var nextSibling = parentNode.insertBefore(document.createTextNode(''), sortElement.nextSibling);

                return function() {

                    if (parentNode === this) {
                        throw new Error('You can\'t sort elements if any one is a descendant of another.');
                    }

                    // Insert before flag:
                    parentNode.insertBefore(this, nextSibling);
                    // Remove flag:
                    parentNode.removeChild(nextSibling);
                };
            });

            return Array.prototype.sort.call($elements, comparator).each(function(i) {
                placements[i].call(this);
            });
        },

        /** Sets attributes on the given element and its descendants based on the selector.
         *`attrs` object: { [SELECTOR1]: { attrs1 }, [SELECTOR2]: { attrs2}, ... } e.g. { 'input': { color : 'red' }}
         * @method setAttributesBySelector
         * @param {DOMObject|SVGObject} element
         * @param {Object} attrs
         * @example
         * 
         * var myEl = document.querySelector('.mydiv');
         * dedu.util.setAttributesBySelector(myEl,{
         *  '.mydiv': { 'data-foo': 'bar' },    // Note the reference to the myEl element itself.
         *  'input': { 'value': 'my value' }   // descendant input
         * });
         * 
         */
        setAttributesBySelector: function(element, attrs) {

            var $element = $(element);

            _.each(attrs, function(attrs, selector) {
                var $elements = $element.find(selector).addBack().filter(selector);
                // Make a special case for setting classes.
                // We do not want to overwrite any existing class.
                if (_.has(attrs, 'class')) {
                    $elements.addClass(attrs['class']);
                    attrs = _.omit(attrs, 'class');
                }
                $elements.attr(attrs);
            });
        },

        // Return a new object with all for sides (top, bottom, left and right) in it.
        // Value of each side is taken from the given argument (either number or object).
        // Default value for a side is 0.
        // Examples:
        // joint.util.normalizeSides(5) --> { top: 5, left: 5, right: 5, bottom: 5 }
        // joint.util.normalizeSides({ left: 5 }) --> { top: 0, left: 5, right: 0, bottom: 0 }
        normalizeSides: function(box) {

            if (Object(box) !== box) {
                box = box || 0;
                return {
                    top: box,
                    bottom: box,
                    left: box,
                    right: box
                };
            }

            return {
                top: box.top || 0,
                bottom: box.bottom || 0,
                left: box.left || 0,
                right: box.right || 0
            };
        },

        timing: {

            linear: function(t) {
                return t;
            },

            quad: function(t) {
                return t * t;
            },

            cubic: function(t) {
                return t * t * t;
            },

            inout: function(t) {
                if (t <= 0) return 0;
                if (t >= 1) return 1;
                var t2 = t * t;
                var t3 = t2 * t;
                return 4 * (t < .5 ? t3 : 3 * (t - t2) + t3 - .75);
            },

            exponential: function(t) {
                return Math.pow(2, 10 * (t - 1));
            },

            bounce: function(t) {
                for (var a = 0, b = 1; 1; a += b, b /= 2) {
                    if (t >= (7 - 4 * a) / 11) {
                        var q = (11 - 6 * a - 11 * t) / 4;
                        return -q * q + b * b;
                    }
                }
            },

            reverse: function(f) {
                return function(t) {
                    return 1 - f(1 - t);
                };
            },

            reflect: function(f) {
                return function(t) {
                    return .5 * (t < .5 ? f(2 * t) : (2 - f(2 - 2 * t)));
                };
            },

            clamp: function(f, n, x) {
                n = n || 0;
                x = x || 1;
                return function(t) {
                    var r = f(t);
                    return r < n ? n : r > x ? x : r;
                };
            },

            back: function(s) {
                if (!s) s = 1.70158;
                return function(t) {
                    return t * t * ((s + 1) * t - s);
                };
            },

            elastic: function(x) {
                if (!x) x = 1.5;
                return function(t) {
                    return Math.pow(2, 10 * (t - 1)) * Math.cos(20 * Math.PI * x / 3 * t);
                };
            }
        },

        interpolate: {

            number: function(a, b) {
                var d = b - a;
                return function(t) {
                    return a + d * t;
                };
            },

            object: function(a, b) {
                var s = _.keys(a);
                return function(t) {
                    var i, p;
                    var r = {};
                    for (i = s.length - 1; i != -1; i--) {
                        p = s[i];
                        r[p] = a[p] + (b[p] - a[p]) * t;
                    }
                    return r;
                };
            },

            hexColor: function(a, b) {

                var ca = parseInt(a.slice(1), 16);
                var cb = parseInt(b.slice(1), 16);
                var ra = ca & 0x0000ff;
                var rd = (cb & 0x0000ff) - ra;
                var ga = ca & 0x00ff00;
                var gd = (cb & 0x00ff00) - ga;
                var ba = ca & 0xff0000;
                var bd = (cb & 0xff0000) - ba;

                return function(t) {

                    var r = (ra + rd * t) & 0x000000ff;
                    var g = (ga + gd * t) & 0x0000ff00;
                    var b = (ba + bd * t) & 0x00ff0000;

                    return '#' + (1 << 24 | r | g | b).toString(16).slice(1);
                };
            },

            unit: function(a, b) {

                var r = /(-?[0-9]*.[0-9]*)(px|em|cm|mm|in|pt|pc|%)/;
                var ma = r.exec(a);
                var mb = r.exec(b);
                var p = mb[1].indexOf('.');
                var f = p > 0 ? mb[1].length - p - 1 : 0;
                a = +ma[1];
                var d = +mb[1] - a;
                var u = ma[2];

                return function(t) {
                    return (a + d * t).toFixed(f) + u;
                };
            }
        },

        // SVG filters.
        filter: {

            // `color` ... outline color
            // `width`... outline width
            // `opacity` ... outline opacity
            // `margin` ... gap between outline and the element
            outline: function(args) {

                var tpl = '<filter><feFlood flood-color="${color}" flood-opacity="${opacity}" result="colored"/><feMorphology in="SourceAlpha" result="morphedOuter" operator="dilate" radius="${outerRadius}" /><feMorphology in="SourceAlpha" result="morphedInner" operator="dilate" radius="${innerRadius}" /><feComposite result="morphedOuterColored" in="colored" in2="morphedOuter" operator="in"/><feComposite operator="xor" in="morphedOuterColored" in2="morphedInner" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

                var margin = _.isFinite(args.margin) ? args.margin : 2;
                var width = _.isFinite(args.width) ? args.width : 1;

                return _.template(tpl)({
                    color: args.color || 'blue',
                    opacity: _.isFinite(args.opacity) ? args.opacity : 1,
                    outerRadius: margin + width,
                    innerRadius: margin
                });
            },

            // `color` ... color
            // `width`... width
            // `blur` ... blur
            // `opacity` ... opacity
            highlight: function(args) {

                var tpl = '<filter><feFlood flood-color="${color}" flood-opacity="${opacity}" result="colored"/><feMorphology result="morphed" in="SourceGraphic" operator="dilate" radius="${width}"/><feComposite result="composed" in="colored" in2="morphed" operator="in"/><feGaussianBlur result="blured" in="composed" stdDeviation="${blur}"/><feBlend in="SourceGraphic" in2="blured" mode="normal"/></filter>';

                return _.template(tpl)({
                    color: args.color || 'red',
                    width: _.isFinite(args.width) ? args.width : 1,
                    blur: _.isFinite(args.blur) ? args.blur : 0,
                    opacity: _.isFinite(args.opacity) ? args.opacity : 1
                });
            },

            // `x` ... horizontal blur
            // `y` ... vertical blur (optional)
            blur: function(args) {

                var x = _.isFinite(args.x) ? args.x : 2;

                return _.template('<filter><feGaussianBlur stdDeviation="${stdDeviation}"/></filter>')({
                    stdDeviation: _.isFinite(args.y) ? [x, args.y] : x
                });
            },

            // `dx` ... horizontal shift
            // `dy` ... vertical shift
            // `blur` ... blur
            // `color` ... color
            // `opacity` ... opacity
            dropShadow: function(args) {

                var tpl = 'SVGFEDropShadowElement' in window ? '<filter><feDropShadow stdDeviation="${blur}" dx="${dx}" dy="${dy}" flood-color="${color}" flood-opacity="${opacity}"/></filter>' : '<filter><feGaussianBlur in="SourceAlpha" stdDeviation="${blur}"/><feOffset dx="${dx}" dy="${dy}" result="offsetblur"/><feFlood flood-color="${color}"/><feComposite in2="offsetblur" operator="in"/><feComponentTransfer><feFuncA type="linear" slope="${opacity}"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

                return _.template(tpl)({
                    dx: args.dx || 0,
                    dy: args.dy || 0,
                    opacity: _.isFinite(args.opacity) ? args.opacity : 1,
                    color: args.color || 'black',
                    blur: _.isFinite(args.blur) ? args.blur : 4
                });
            },

            // `amount` ... the proportion of the conversion. A value of 1 is completely grayscale. A value of 0 leaves the input unchanged.
            grayscale: function(args) {

                var amount = _.isFinite(args.amount) ? args.amount : 1;

                return _.template('<filter><feColorMatrix type="matrix" values="${a} ${b} ${c} 0 0 ${d} ${e} ${f} 0 0 ${g} ${b} ${h} 0 0 0 0 0 1 0"/></filter>')({
                    a: 0.2126 + 0.7874 * (1 - amount),
                    b: 0.7152 - 0.7152 * (1 - amount),
                    c: 0.0722 - 0.0722 * (1 - amount),
                    d: 0.2126 - 0.2126 * (1 - amount),
                    e: 0.7152 + 0.2848 * (1 - amount),
                    f: 0.0722 - 0.0722 * (1 - amount),
                    g: 0.2126 - 0.2126 * (1 - amount),
                    h: 0.0722 + 0.9278 * (1 - amount)
                });
            },

            // `amount` ... the proportion of the conversion. A value of 1 is completely sepia. A value of 0 leaves the input unchanged.
            sepia: function(args) {

                var amount = _.isFinite(args.amount) ? args.amount : 1;

                return _.template('<filter><feColorMatrix type="matrix" values="${a} ${b} ${c} 0 0 ${d} ${e} ${f} 0 0 ${g} ${h} ${i} 0 0 0 0 0 1 0"/></filter>')({
                    a: 0.393 + 0.607 * (1 - amount),
                    b: 0.769 - 0.769 * (1 - amount),
                    c: 0.189 - 0.189 * (1 - amount),
                    d: 0.349 - 0.349 * (1 - amount),
                    e: 0.686 + 0.314 * (1 - amount),
                    f: 0.168 - 0.168 * (1 - amount),
                    g: 0.272 - 0.272 * (1 - amount),
                    h: 0.534 - 0.534 * (1 - amount),
                    i: 0.131 + 0.869 * (1 - amount)
                });
            },

            // `amount` ... the proportion of the conversion. A value of 0 is completely un-saturated. A value of 1 leaves the input unchanged.
            saturate: function(args) {

                var amount = _.isFinite(args.amount) ? args.amount : 1;

                return _.template('<filter><feColorMatrix type="saturate" values="${amount}"/></filter>')({
                    amount: 1 - amount
                });
            },

            // `angle` ...  the number of degrees around the color circle the input samples will be adjusted.
            hueRotate: function(args) {

                return _.template('<filter><feColorMatrix type="hueRotate" values="${angle}"/></filter>')({
                    angle: args.angle || 0
                });
            },

            // `amount` ... the proportion of the conversion. A value of 1 is completely inverted. A value of 0 leaves the input unchanged.
            invert: function(args) {

                var amount = _.isFinite(args.amount) ? args.amount : 1;

                return _.template('<filter><feComponentTransfer><feFuncR type="table" tableValues="${amount} ${amount2}"/><feFuncG type="table" tableValues="${amount} ${amount2}"/><feFuncB type="table" tableValues="${amount} ${amount2}"/></feComponentTransfer></filter>')({
                    amount: amount,
                    amount2: 1 - amount
                });
            },

            // `amount` ... proportion of the conversion. A value of 0 will create an image that is completely black. A value of 1 leaves the input unchanged.
            brightness: function(args) {

                return _.template('<filter><feComponentTransfer><feFuncR type="linear" slope="${amount}"/><feFuncG type="linear" slope="${amount}"/><feFuncB type="linear" slope="${amount}"/></feComponentTransfer></filter>')({
                    amount: _.isFinite(args.amount) ? args.amount : 1
                });
            },

            // `amount` ... proportion of the conversion. A value of 0 will create an image that is completely black. A value of 1 leaves the input unchanged.
            contrast: function(args) {

                var amount = _.isFinite(args.amount) ? args.amount : 1;

                return _.template('<filter><feComponentTransfer><feFuncR type="linear" slope="${amount}" intercept="${amount2}"/><feFuncG type="linear" slope="${amount}" intercept="${amount2}"/><feFuncB type="linear" slope="${amount}" intercept="${amount2}"/></feComponentTransfer></filter>')({
                    amount: amount,
                    amount2: .5 - amount / 2
                });
            }
        },

        /**
         * @namespace dedu.util.format
         */
        format: {

            /** Formatting numbers via the Python Format Specification Mini-language.
             * See http://docs.python.org/release/3.1.3/library/string.html#format-specification-mini-language.
             * Heavilly inspired by the D3.js library implementation.
             * @method number
             * @example
             * 
             * joint.util.format.number('.2f', 5)    // 5.00
             * joint.util.format.number('03d', 5)    // 005
             * joint.util.format.number('.1%', .205)    // 20.5%
             * joint.util.format.number('*^9', 5)    // ****5****
             * 
             */
            number: function(specifier, value, locale) {

                locale = locale || {

                    currency: ['$', ''],
                    decimal: '.',
                    thousands: ',',
                    grouping: [3]
                };

                // See Python format specification mini-language: http://docs.python.org/release/3.1.3/library/string.html#format-specification-mini-language.
                // [[fill]align][sign][symbol][0][width][,][.precision][type]
                var re = /(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i;

                var match = re.exec(specifier);
                var fill = match[1] || ' ';
                var align = match[2] || '>';
                var sign = match[3] || '';
                var symbol = match[4] || '';
                var zfill = match[5];
                var width = +match[6];
                var comma = match[7];
                var precision = match[8];
                var type = match[9];
                var scale = 1;
                var prefix = '';
                var suffix = '';
                var integer = false;

                if (precision) precision = +precision.substring(1);

                if (zfill || fill === '0' && align === '=') {
                    zfill = fill = '0';
                    align = '=';
                    if (comma) width -= Math.floor((width - 1) / 4);
                }

                switch (type) {
                    case 'n':
                        comma = true;
                        type = 'g';
                        break;
                    case '%':
                        scale = 100;
                        suffix = '%';
                        type = 'f';
                        break;
                    case 'p':
                        scale = 100;
                        suffix = '%';
                        type = 'r';
                        break;
                    case 'b':
                    case 'o':
                    case 'x':
                    case 'X':
                        if (symbol === '#') prefix = '0' + type.toLowerCase();
                    case 'c':
                    case 'd':
                        integer = true;
                        precision = 0;
                        break;
                    case 's':
                        scale = -1;
                        type = 'r';
                        break;
                }

                if (symbol === '$') {
                    prefix = locale.currency[0];
                    suffix = locale.currency[1];
                }

                // If no precision is specified for `'r'`, fallback to general notation.
                if (type == 'r' && !precision) type = 'g';

                // Ensure that the requested precision is in the supported range.
                if (precision != null) {
                    if (type == 'g') precision = Math.max(1, Math.min(21, precision));
                    else if (type == 'e' || type == 'f') precision = Math.max(0, Math.min(20, precision));
                }

                var zcomma = zfill && comma;

                // Return the empty string for floats formatted as ints.
                if (integer && (value % 1)) return '';

                // Convert negative to positive, and record the sign prefix.
                var negative = value < 0 || value === 0 && 1 / value < 0 ? (value = -value, '-') : sign;

                var fullSuffix = suffix;

                // Apply the scale, computing it from the value's exponent for si format.
                // Preserve the existing suffix, if any, such as the currency symbol.
                if (scale < 0) {
                    var unit = this.prefix(value, precision);
                    value = unit.scale(value);
                    fullSuffix = unit.symbol + suffix;
                } else {
                    value *= scale;
                }

                // Convert to the desired precision.
                value = this.convert(type, value, precision);

                // Break the value into the integer part (before) and decimal part (after).
                var i = value.lastIndexOf('.');
                var before = i < 0 ? value : value.substring(0, i);
                var after = i < 0 ? '' : locale.decimal + value.substring(i + 1);

                function formatGroup(value) {

                    var i = value.length;
                    var t = [];
                    var j = 0;
                    var g = locale.grouping[0];
                    while (i > 0 && g > 0) {
                        t.push(value.substring(i -= g, i + g));
                        g = locale.grouping[j = (j + 1) % locale.grouping.length];
                    }
                    return t.reverse().join(locale.thousands);
                }

                // If the fill character is not `'0'`, grouping is applied before padding.
                if (!zfill && comma && locale.grouping) {

                    before = formatGroup(before);
                }

                var length = prefix.length + before.length + after.length + (zcomma ? 0 : negative.length);
                var padding = length < width ? new Array(length = width - length + 1).join(fill) : '';

                // If the fill character is `'0'`, grouping is applied after padding.
                if (zcomma) before = formatGroup(padding + before);

                // Apply prefix.
                negative += prefix;

                // Rejoin integer and decimal parts.
                value = before + after;

                return (align === '<' ? negative + value + padding : align === '>' ? padding + negative + value : align === '^' ? padding.substring(0, length >>= 1) + negative + value + padding.substring(length) : negative + (zcomma ? value : padding + value)) + fullSuffix;
            },

            // Formatting string via the Python Format string.
            // See https://docs.python.org/2/library/string.html#format-string-syntax)
            string: function(formatString, value) {

                var fieldDelimiterIndex;
                var fieldDelimiter = '{';
                var endPlaceholder = false;
                var formattedStringArray = [];

                while ((fieldDelimiterIndex = formatString.indexOf(fieldDelimiter)) !== -1) {

                    var pieceFormatedString, formatSpec, fieldName;

                    pieceFormatedString = formatString.slice(0, fieldDelimiterIndex);

                    if (endPlaceholder) {
                        formatSpec = pieceFormatedString.split(':');
                        fieldName = formatSpec.shift().split('.');
                        pieceFormatedString = value;

                        for (var i = 0; i < fieldName.length; i++)
                            pieceFormatedString = pieceFormatedString[fieldName[i]];

                        if (formatSpec.length)
                            pieceFormatedString = this.number(formatSpec, pieceFormatedString);
                    }

                    formattedStringArray.push(pieceFormatedString);

                    formatString = formatString.slice(fieldDelimiterIndex + 1);
                    fieldDelimiter = (endPlaceholder = !endPlaceholder) ? '}' : '{';
                }
                formattedStringArray.push(formatString);

                return formattedStringArray.join('');
            },

            convert: function(type, value, precision) {

                switch (type) {
                    case 'b':
                        return value.toString(2);
                    case 'c':
                        return String.fromCharCode(value);
                    case 'o':
                        return value.toString(8);
                    case 'x':
                        return value.toString(16);
                    case 'X':
                        return value.toString(16).toUpperCase();
                    case 'g':
                        return value.toPrecision(precision);
                    case 'e':
                        return value.toExponential(precision);
                    case 'f':
                        return value.toFixed(precision);
                    case 'r':
                        return (value = this.round(value, this.precision(value, precision))).toFixed(Math.max(0, Math.min(20, this.precision(value * (1 + 1e-15), precision))));
                    default:
                        return value + '';
                }
            },

            round: function(value, precision) {

                return precision ? Math.round(value * (precision = Math.pow(10, precision))) / precision : Math.round(value);
            },

            precision: function(value, precision) {

                return precision - (value ? Math.ceil(Math.log(value) / Math.LN10) : 1);
            },

            prefix: function(value, precision) {

                var prefixes = _.map(['y', 'z', 'a', 'f', 'p', 'n', 'µ', 'm', '', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'], function(d, i) {
                    var k = Math.pow(10, Math.abs(8 - i) * 3);
                    return {
                        scale: i > 8 ? function(d) {
                            return d / k;
                        } : function(d) {
                            return d * k;
                        },
                        symbol: d
                    };
                });

                var i = 0;
                if (value) {
                    if (value < 0) value *= -1;
                    if (precision) value = this.round(value, this.precision(value, precision));
                    i = 1 + Math.floor(1e-12 + Math.log(value) / Math.LN10);
                    i = Math.max(-24, Math.min(24, Math.floor((i <= 0 ? i + 1 : i - 1) / 3) * 3));
                }
                return prefixes[8 + i / 3];
            }
        }
    }
}

/**
 * `dedu.Cell` 是`joint_chart`所有图形的父类
 * @class
 * @augments Backbone.Model
 */
dedu.Cell = Backbone.Model.extend({

    constructor: function (attributes, options) {
        var defaults;
        var attrs = attributes || {};
        this.cid = _.uniqueId('c');
        this.attributes = {};
        if (defaults = _.result(this, 'defaults')) {
            //<custom code>
            // Replaced the call to _.defaults with _.merge.
            attrs = _.merge({}, defaults, attrs);
            //</custom code>
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
    initialize: function (options) {
        if (!options || !options.id) {
            this.set('id', dedu.util.uuid(), {silent: true});
        }
        // Collect ports defined in `attrs` and keep collecting whenever `attrs` object changes.
        this.processPorts();
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
        return this.set(_.merge({}, this.attributes, props), value);
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

    // Override the Backbone `_ensureElement()` method in order to create a `<g>` node that wraps
    // all the nodes of the Cell view.
    _ensureElement: function () {

        var el;

        if (!this.el) {
            var attrs = _.extend({
                id: this.id
            }, _.result(this, 'attributes'));
            if (this.className) attrs['class'] = _.result(this, 'className');
            el = V(_.result(this, 'tagName'), attrs).node;
        } else {
            el = _.result(this, 'el');
        }
        this.setElement(el, false);
    },

    // Utilize an alternative DOM manipulation API by
    // adding an element reference wrapped in Vectorizer.
    _setElement: function (el) {
        this.$el = el instanceof Backbone.$ ? el : Backbone.$(el);
        this.el = this.$el[0];
        this.vel = V(this.el);
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
        return g.rect(this.vel.bbox());
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
            this.paper.trigger.apply(this.paper, [evt, this].concat(args));
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
        '<path class="marker-source" fill="black" stroke="black" />',
        '<path class="marker-target" fill="black" stroke="black" />',
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
        labels:undefined,
        attrs: {
            '.marker-target': {
                d: 'M 10 0 L 0 5 L 10 10 z'
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
    label: function(idx, value) {

        idx = idx || 0;

        var labels = this.get('labels') || [];

        // Is it a getter?
        if (arguments.length === 0 || arguments.length === 1) {

            return labels[idx];
        }

        var newValue = _.merge({}, labels[idx], value);

        var newLabels = labels.slice();
        newLabels[idx] = newValue;

        return this.set({ labels: newLabels });
    },

    /**
     * Return the source element of the link or null if there is none.
     * @returns {*|dedu.Cell|null}
     */
    getSourceElement: function() {

        var source = this.get('source');

        return (source && source.id && this.graph && this.graph.getCell(source.id)) || null;
    },

    /**
     * Return the target element of the link or null if there is none.
     * @returns {*|dedu.Cell|null}
     */
    getTargetElement: function() {

        var target = this.get('target');

        return (target && target.id && this.graph && this.graph.getCell(target.id)) || null;
    },
    /**
     * 返回true
     * @override
     * @returns {boolean}
     * @memberof dedu.Link
     */
    isLink: function() {
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
    className: function() {
        return _.unique(this.model.get("type").split(".").concat("link")).join(" ")
    },

    initialize: function (opts) {
        this.options = _.extend({}, _.result(this, "options"), opts || {});

        dedu.CellView.prototype.initialize.apply(this, arguments);

        // create methods in prototype, so they can be accessed from any instance and
        // don't need to be create over and over
        if("function" != typeof this.constructor.prototype.watchSource){
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

        this.model.on('change:selected',function(){
            if(this.model.get("selected")){
                this.focus();
            }else{
                this.unfocus();
            }
        },this);

        this.model.on('change:labels', function () {
            this.renderLabels();
            this.updateLabelPositions();
        },this);

    },

    // Returns a function observing changes on an end of the link. If a change happens and new end is a new model,
    // it stops listening on the previous one and starts listening to the new one.
    createWatcher: function (endType) {
        // create handler for specific end type (source|target).
        var onModelChange = _.partial(this.onEndModelChange, endType);

        function watchEndModel(link,end){

            end = end || {};

            var endModel = null;
            var previousEnd = link.previous(endType) || {};

            if(previousEnd.id){
                this.stopListening(this.paper.getModelById(previousEnd.id), 'change', onModelChange);
            }

            if(end.id){
                // If the observed model changes, it caches a new bbox and do the link update.
                endModel = this.paper.getModelById(end.id);
                this.listenTo(endModel, 'change', onModelChange);
            }

            onModelChange.call(this, endModel, { cacheOnly: true });

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

        this.listenTo(model,'change:vertices',this.onVerticesChange);
        this.listenTo(model, 'change:source', this.onSourceChange);
        this.listenTo(model, 'change:target', this.onTargetChange);

    },

    onVerticesChange: function (cell, changed, opt) {

        this.renderVertexMarkers();
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
        this._V = {};//vectorized markup;
        _.each(children, function (child) {
            var c = child.attr('class');
            c && (this._V[$.camelCase(c)] = child);
        },this);

        // Only the connection path is mandatory
        if (!this._V.connection_line) throw new Error('link: no connection path in the markup');

        // rendering labels has to be run after the link is appended to DOM tree. (otherwise <Text> bbox
        // returns zero values)

        this.renderArrowheadMarkers();
        this.vel.append(children);
        // rendering labels has to be run after the link is appended to DOM tree. (otherwise <Text> bbox
        // returns zero values)
        this.renderLabels();

        // start watching the ends of the link for changes
        this.watchSource(this.model, this.model.get('source'))
            .watchTarget(this.model, this.model.get('target'))
            .update();

        return this;
    },

    renderLabels: function() {

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

        _.each(labels, function(label, idx) {

            var labelNode = labelNodeInstance.clone().node;
            V(labelNode).attr('label-idx', idx);

            // Cache label nodes so that the `updateLabels()` can just update the label node positions.
            this._labelCache[idx] = V(labelNode);

            var $text = $(labelNode).find('text');
            var $rect = $(labelNode).find('rect');

            // Text attributes with the default `text-anchor` and font-size set.
            var textAttributes = _.extend({ 'text-anchor': 'middle', 'font-size': 14 }, dedu.util.getByPath(label, 'attrs/text', '/'));

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
                y: textBbox.y - textBbox.height / 2,  // Take into account the y-alignment translation.
                width: textBbox.width,
                height: textBbox.height
            }));
        }, this);

        return this;        
    },

    renderArrowheadMarkers: function() {

        // Custom markups might not have arrowhead markers. Therefore, jump of this function immediately if that's the case.
        if (!this._V.markerArrowheads) return this;

        var $markerArrowheads = $(this._V.markerArrowheads.node);

        $markerArrowheads.empty();

        // A special markup can be given in the `properties.vertexMarkup` property. This might be handy
        // if default styling (elements) are not desired. This makes it possible to use any
        // SVG elements for .marker-vertex and .marker-vertex-remove tools.
        var markupTemplate = _.template(this.model.get('arrowheadMarkup') || this.model.arrowheadMarkup);

        if(this.model.get('attrs')['.marker-source']){
            this._V.sourceArrowhead = V(markupTemplate({ end: 'source' }));
        }
        if(this.model.get('attrs')['.marker-target']){
            this._V.targetArrowhead = V(markupTemplate({ end: 'target' }));
        }
        $markerArrowheads.append(this._V.sourceArrowhead?this._V.sourceArrowhead.node:undefined, this._V.targetArrowhead?this._V.targetArrowhead.node:undefined);

        return this;
    },


    // Default is to process the `attrs` object and set attributes on subelements based on the selectors.
    update: function () {
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
        var vertices = this.route = this.findRoute(this.model.get('vertices') || []);

        // finds all the connection points taking new vertices into account
        this._findConnectionPoints(vertices);

        var pathData = this.getPathData(vertices);

        // The markup needs to contain a `.connection`
        this._V.connection_background.attr({'d':pathData});
        this._V.connection_outline.attr({'d':pathData});
        this._V.connection_line.attr({'d':pathData});

		this._translateAndAutoOrientArrows(this._V.markerSource, this._V.markerTarget);

        this.updateLabelPositions();
        this.updateArrowheadMarkers();

        if(this.model.get('selected')){
            this._V.connection_line.attr({'stroke': '#ff7f0e'});
        }else{
            this._V.connection_line.attr({'stroke': '#888'});
        }
    },

    updateLabelPositions: function() {

        if (!this._V.labels) return this;

        var labels = this.model.get('labels') || [];
        if(!labels.length) return this;

        var connectionElement = this._V.connection_line.node;
        var connectionLength = connectionElement.getTotalLength();

        // Firefox returns connectionLength=NaN in odd cases (for bezier curves).
        // In that case we won't update labels at all.
        if (!_.isNaN(connectionLength)) {
            var samples;

            _.each(labels,function(label,idx){
                var position = label.position;
                var distance = _.isObject(position) ? position.distance : position;
                var offset = _.isObject(position) ? position.offset : { x: 0, y: 0 };

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
            },this);
        }                

        return this;

    },

    updateArrowheadMarkers: function() {

        if (!this._V.markerArrowheads) return this;

        // getting bbox of an element with `display="none"` in IE9 ends up with access violation
        if ($.css(this._V.markerArrowheads.node, 'display') === 'none') return this;

        var sx = this.getConnectionLength() < this.options.shortLinkLength ? .5 : 1;
        this._V.sourceArrowhead && this._V.sourceArrowhead.scale(sx);
        this._V.targetArrowhead && this._V.targetArrowhead.scale(sx);

        this._translateAndAutoOrientArrows(this._V.sourceArrowhead, this._V.targetArrowhead);

        return this;
    },

    hideLabels:function(){
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
                router = { name: 'orthogonal' };
            } else if (defaultRouter) {
                router = defaultRouter;
            } else {
                return oldVertices;
            }
        }
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
                connector = { name: 'smooth' };
            } else {
                connector = defaultConnector || { name: 'normal' };
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
            args,//options
            this
        );

        return pathData;
    },

    getConnectionLength: function() {

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
            'target',this.model.get('target'),lastVertex || sourcePoint
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

        if (this._V.markerTarget) {

            cache.targetBBox = cache.targetBBox || this._V.markerTarget.bbox(true);

            targetMarkerPoint = g.point(targetPoint).move(
                lastVertex || sourcePoint,
                cache.targetBBox.width * this._V.markerTarget.scale().sx * -1
            ).round();
        }

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

        if(this.paper.options.markAvailable){

            //TODO:打开可连接的magnets
            //this._markAvailableMagnets():
        }
    },

    _afterArrowheadMove: function () {
        if (!_.isUndefined(this._z)) {
            this.model.set('z', this._z, { ui: true });
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
        this._initialEnd = _.clone(this.model.get(end)) || {x:0,y:0};
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
    can: function(feature) {
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

        if(arrowhead === 'source'){
            i = 2;
            oppositeArrowhead = 'target';
        }else{
            j = 2;
            oppositeArrowhead = 'source';
        }

        var end = this.model.get(oppositeArrowhead);

        if(end.id){
            args[i] = this.paper.findViewByModel(end.id);
            args[i+1] = end.selector && args[i].el.querySelector(end.selector);
        }

        function validateConnectionArgs(cellView,magnet){
            args[j] = cellView;
            args[j+1] = cellView.el === magnet? undefined:magnet;
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

    // Find a point that is the start of the connection.
    // If `selectorOrPoint` is a point, then we're done and that point is the start of the connection.
    // If the `selectorOrPoint` is an element however, we need to know a reference point (or element)
    // that the link leads to in order to determine the start of the connection on the original element.
    getConnectionPoint:function(end, selectorOrPoint, referenceSelectorOrPoint){
        var spot;

        // If the `selectorOrPoint` (or `referenceSelectorOrPoint`) is `undefined`, the `source`/`target` of the link model is `undefined`.
        // We want to allow this however so that one can create links such as `var link = new joint.dia.Link` and
        // set the `source`/`target` later.dfa
        _.isEmpty(selectorOrPoint) && (selectorOrPoint = { x: 0, y: 0 });
        _.isEmpty(referenceSelectorOrPoint) && (referenceSelectorOrPoint = { x: 0, y: 0 });

        if(!selectorOrPoint.id){
            // If the source is a point, we don't need a reference point to find the sticky point of connection.
            spot = g.point(selectorOrPoint);
        }else{
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


            }else{
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

        this.watchSource(cell,source).update();

    },

    onTargetChange: function (cell, target) {

        this.watchTarget(cell,target).update();

    },

    highlight: function (el) {
        this._V[el].attr({'stroke':'#ff7f0e'});
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
        this._V[el].attr({'stroke':'#888'});
    },

    pointerdown: function (evt,x,y) {
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

    pointerdblclick: function(evt, x, y) {

        var m = g.line(g.point(this.sourcePoint.x,this.sourcePoint.y), g.point(this.targetPoint.x,this.targetPoint.y)).midpoint();
        x = m.x-8;
        y = m.y-8;
        dedu.CellView.prototype.pointerdblclick.apply(this, arguments);

    },

    pointermove: function (evt, x, y) {

        switch (this._action) {
            case 'arrowhead-move':
                if (this.paper.options.snapLinks) {
                    var r = this.paper.options.snapLinks.radius || 50;
                    var viewsInArea = this.paper.findViewsInArea({ x: x - r, y: y - r, width: 2 * r, height: 2 * r });

                    this._closestView && this._closestView.unhighlight(this._closestEnd.selector, { connecting: true, snapping: true });
                    this._closestView = this._closestEnd = null;

                    var distance;
                    var minDistance = Number.MAX_VALUE;
                    var pointer = g.point(x, y);

                    _.each(viewsInArea, function(view) {

                        if(this.paper.findViewByModel(this.model.get('source').id)==view){
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
                                    this._closestEnd = { id: view.model.id };
                                }
                            }
                        }

                        view.$('[magnet]').each(_.bind(function(index, magnet) {

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
                                        redID:view.model.get('redID'),
                                        selector: view.getSelector(magnet),
                                        port: magnet.getAttribute('port')
                                    };
                                }
                            }

                        }, this));

                    }, this);

                    this._closestView  && this._closestView.highlight(this._closestEnd.selector, { connecting: true, snapping: true });

                    this.model.set(this._arrowhead, this._closestEnd || { x: x, y: y }, { ui: true });

                }else{
                    // checking views right under the pointer

                    // Touchmove event's target is not reflecting the element under the coordinates as mousemove does.
                    // It holds the element when a touchstart triggered.
                    var target = (evt.type === 'mousemove')
                        ? evt.target
                        : document.elementFromPoint(evt.clientX, evt.clientY);
                    if (this._targetEvent !== target) {
                        // Unhighlight the previous view under pointer if there was one.
                        this._magnetUnderPointer && this._viewUnderPointer.unhighlight(this._magnetUnderPointer, { connecting: true });
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
                                this._magnetUnderPointer && this._viewUnderPointer.highlight(this._magnetUnderPointer, { connecting: true });
                            }else if(V(target).hasClass("tip")){
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

                    this.model.set(this._arrowhead, { x: x, y: y }, { ui: true });
                }
                break;
        }

        this._dx = x;
        this._dy = y;

        dedu.CellView.prototype.pointermove.apply(this, arguments);
        this.notify('link:pointermove', evt, x, y);
    },

    pointerup: function (evt, x, y) {

        if(this._action === 'arrowhead-move'){
            var paperOptions = this.paper.options;
            var arrowhead = this._arrowhead;

            if (paperOptions.snapLinks) {
                // Finish off link snapping. Everything except view unhighlighting was already done on pointermove.
                this._closestView && this._closestView.unhighlight(this._closestEnd.selector, { connecting: true, snapping: true });
                this._closestView && this.trigger.apply(this.model, ['link:complete']);
                this._closestView = this._closestEnd = null;
            }else{
                var viewUnderPointer = this._viewUnderPointer;
                var magnetUnderPointer = this._magnetUnderPointer;

                delete this._viewUnderPointer;
                delete this._magnetUnderPointer;

                if (magnetUnderPointer) {

                    viewUnderPointer.unhighlight(magnetUnderPointer, { connecting: true });
                    // Find a unique `selector` of the element under pointer that is a magnet. If the
                    // `this._magnetUnderPointer` is the root element of the `this._viewUnderPointer` itself,
                    // the returned `selector` will be `undefined`. That means we can directly pass it to the
                    // `source`/`target` attribute of the link model below.
                    var selector = viewUnderPointer.getSelector(magnetUnderPointer);
                    var port = magnetUnderPointer.getAttribute('port');
                    var arrowheadValue = { id: viewUnderPointer.model.id };
                    if (selector != null) arrowheadValue.port = port;
                    if (port != null) arrowheadValue.selector = selector;
                    this.model.set(arrowhead, arrowheadValue, { ui: true });
                    this.trigger.apply(this.model, 'link:complete');
                }else{
                    this.model.remove({ ui: true });
                }
            }
            this._afterArrowheadMove();
        }
    
        delete this._action;
        this.notify('link:pointerup', evt, x, y);
        dedu.CellView.prototype.pointerup.apply(this, arguments);
    },

    

},{
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
        console.log(options);
        var namespace = options.collection.cellNamespace;

        // Find the model class in the namespace or use the default one.
        var ModelClass = (attrs.type === 'link')
            ? dedu.Link
            : dedu.util.getByPath(namespace, attrs.type, '.') || dedu.Element;

        return new ModelClass(attrs, options);
    }
});

/**
 * `dedu.Graph` A model holding all the cells (elements and links) of the diagram
 * * property `cells` stores all the cells
 * @class
 * @augments Backbone.Model
 */
dedu.Graph = Backbone.Model.extend({

    initialize:function(attrs,opt){

        opt = opt || {};

        // Passing `cellModel` function in the options object to graph allows for
        // setting models based on attribute objects. This is especially handy
        // when processing JSON graphs that are in a different than JointJS format.
        var cells = new dedu.GraphCells([], {
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
     * @returns {dedu.Cell}
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
     * @returns {dedu.Cell}
     */
    getCell: function(id) {
        return this.get('cells').get(id);
    },

    /**
     * like {@link dedu.Graph~getCell},Get all the elemnet and links in the graph.
     * @returns {Array<dedu.Cell>}
     */
    getCells: function() {
        return this.get('cells').toArray();
    },

    /**
     * Get all the elements in the graph (i.e. omit links).
     * @returns {Array<dedu.Element>}
     */
    getElements: function() {

        return this.get('cells').filter(function(cell) {

            return cell instanceof dedu.Element;
        });
    },

    /**
     * Get all the links in the graph (i.e. omit elements).
     * @returns {Array<dedu.Link>}
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
            if(model instanceof dedu.Element){

                if(model instanceof dedu.shape.node_red.subflowportModel){
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
    addCell:function(cell,options){
        this.get('cells').add(this._prepareCell(cell), options || {});
        var args ;
        var self = this;
        if(cell instanceof dedu.Link){
            cell.on('link:complete',function(){
                args = {
                    source: this.get('source'),
                    target: this.get('target'),
                    redID: this.get('redID'),
                    type: 'link'
                };
                self.notify.apply(this,['node-red:node-link-added'].concat(args));
            },cell);
        }else if(cell instanceof dedu.Element){
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
            selectionIDs[this.selectionSet[i].get('redID')] = this.selectionSet[i] instanceof dedu.Link?'link':'node';
        }
        this.notify.apply(this,['node-red:node-link-removed'].concat(selectionIDs));
        this.selectionSet = [];
    },

    notify:function(evt){
        var args = Array.prototype.slice.call(arguments, 1);
        this.trigger.apply(this, [evt].concat(args));
    },
});


dedu.shape = {basic:{}};

/**
 * 不能连线的图元
 * @class
 * @augments dedu.Element.
 */
dedu.shape.basic.Generic = dedu.Element.extend({
    /**
     * @override
     */
    defaults:dedu.util.deepSupplement({
        type:'basic.Generic',
        attrs:{
            '.':{fill:'#fff',stroke:'none',magnet:false},
            text: {
                'pointer-events': 'none',
                'stroke':'none'
            },
        }
    },dedu.Element.prototype.defaults)
});

dedu.shape.basic.Rect  = dedu.shape.basic.Generic.extend({
    markup: '<g class="rotatable"><g class="scalable"><rect/></g><text/></g>',
    defaults: dedu.util.deepSupplement({
        size: {
            width: 60,
            height: 40
        },
        type: 'basic.Rect',
        attrs: {
            'rect': {
                fill: '#ffffff',
                stroke: '#000000',
                width: 60,
                height: 40
            },
            'text': {
                fill: '#000000',
                text: '',
                'font-size': 10,
                'ref-x': .5,
                'ref-y': .5,
                'text-anchor': 'middle',
                'y-alignment': 'middle',
                'font-family': 'Arial, helvetica, sans-serif'
            }
        }

    }, dedu.shape.basic.Generic.prototype.defaults)
});

dedu.shape.basic.CRect = dedu.shape.basic.Rect.extend({
    defaults:dedu.util.deepSupplement({
        attrs:{
            'rect':{
                rx:7,
                ry:7
            }
        }
    },dedu.shape.basic.Rect.prototype.defaults)
});

dedu.shape.basic.Circle = dedu.shape.basic.Generic.extend({

    markup: '<g class="rotatable"><g class="scalable"><circle/></g><text/></g>',

    defaults: dedu.util.deepSupplement({

        type: 'basic.Circle',
        size: { width: 60, height: 60 },
        attrs: {
            'circle': {
                fill: '#ffffff',
                stroke: '#000000',
                r: 30,
                cx:0,
                cy:0
            },
            'text': {
                'font-size': 14,
                text: '',
                'text-anchor': 'middle',
                'ref-x': .5,
                'ref-y': .5,
                'y-alignment': 'middle',
                fill: '#000000',
                'font-family': 'Arial, helvetica, sans-serif'
            }
        }
    }, dedu.shape.basic.Generic.prototype.defaults)
});


dedu.shape.basic.Ellipse = dedu.shape.basic.Generic.extend({

    markup: '<g class="rotatable"><g class="scalable"><ellipse/></g><text/></g>',

    defaults: dedu.util.deepSupplement({

        type: 'basic.Ellipse',
        size: { width: 60, height: 40 },
        attrs: {
            'ellipse': {
                fill: '#ffffff',
                stroke: '#000000',
                rx: 30,
                ry: 20,
            },
            'text': {
                'font-size': 14,
                text: '',
                'text-anchor': 'middle',
                'ref-x': .5,
                'ref-y': .5,
                'y-alignment': 'middle',
                fill: '#000000',
                'font-family': 'Arial, helvetica, sans-serif'
            }
        }
    }, dedu.shape.basic.Generic.prototype.defaults)
});

dedu.shape.basic.Polygon = dedu.shape.basic.Generic.extend({

    markup: '<g class="rotatable"><g class="scalable"><polygon/></g><text/></g>',

    defaults: dedu.util.deepSupplement({

        type: 'basic.Polygon',
        size: { width: 60, height: 40 },
        attrs: {
            'polygon': {
                fill: '#ffffff',
                stroke: '#000000'
            },
            'text': {
                'font-size': 14,
                text: '',
                'text-anchor': 'middle',
                'ref-x': .5,
                'ref-dy': 20,
                'y-alignment': 'middle',
                fill: '#000000',
                'font-family': 'Arial, helvetica, sans-serif'
            }
        }
    }, dedu.shape.basic.Generic.prototype.defaults)
});

dedu.shape.basic.Polyline = dedu.shape.basic.Generic.extend({

    markup: '<g class="rotatable"><g class="scalable"><polyline/></g><text/></g>',

    defaults: dedu.util.deepSupplement({

        type: 'basic.Polyline',
        size: { width: 60, height: 40 },
        attrs: {
            'polyline': {
                fill: '#ffffff',
                stroke: '#000000'
            },
            'text': {
                'font-size': 14,
                text: '',
                'text-anchor': 'middle',
                'ref-x': .5,
                'ref-dy': 20,
                'y-alignment': 'middle',
                fill: '#000000',
                'font-family': 'Arial, helvetica, sans-serif'
            }
        }
    }, dedu.shape.basic.Generic.prototype.defaults)
});

/**
 * `dedu.shape.basic.PortsModelInterface` 增加inPort和outPort,用于link
 * @class
 */
dedu.shape.basic.PortsModelInterface = {
    /**
     * initialize
     * *增加对port的update
     * @ memberof dedu.shape.basic.PortsModelInterface
     */
    initialize:function(){
        this.updatePortsAttrs();
        this.on('change:inPorts change:outPorts',this.updatePortsAttrs,this);

        //Call the 'initialize()' of the partent.
        this.constructor.__super__.constructor.__super__.initialize.apply(this,arguments);
    },
    /**
     * update port css
     * @memberof dedu.shape.basic.PortsModelInterface
     */
    updatePortsAttrs: function () {
        // Delete previously set attributes for ports.
        var currAttrs = this.get('attrs');
        _.each(this._portSelectors, function(selector) {
            if (currAttrs[selector]) delete currAttrs[selector];
        });
        // This holds keys to the `attrs` object for all the port specific attribute that
        // we set in this method. This is necessary in order to remove previously set
        // attributes for previous ports.
        this._portSelectors = [];

        var attrs = {};
        _.each(this.get('inPorts'), function (portName, index, ports) {
            var portAttributes = this.getPortAttrs(portName,index,ports.length,'.inPorts','in');
            this._portSelectors = this._portSelectors.concat(_.keys(portAttributes));
            _.extend(attrs,portAttributes);
        },this);

        _.each(this.get('outPorts'), function(portName, index, ports) {
            var portAttributes = this.getPortAttrs(portName, index, ports.length, '.outPorts', 'out');
            this._portSelectors = this._portSelectors.concat(_.keys(portAttributes));
            _.extend(attrs, portAttributes);
        }, this);

        // Silently set `attrs` on the cell so that noone knows the attrs have changed. This makes sure
        // that, for example, command manager does not register `change:attrs` command but only
        // the important `change:inPorts`/`change:outPorts` command.
        this.attr(attrs, { silent: true });
        // Manually call the `processPorts()` method that is normally called on `change:attrs` (that we just made silent).
        this.processPorts();
        // Let the outside world (mainly the `ModelView`) know that we're done configuring the `attrs` object.
        this.trigger('process:ports');
    },
    /**
     * get port selector
     * @param {String} name - port'name
     * @returns {string}
     */
    getPortSelector: function (name) {
        var selector = '.inPorts';
        var index = this.get('inPorts').indexOf(name);

        if (index < 0) {
            selector = '.outPorts';
            index = this.get('outPorts').indexOf(name);

            if (index < 0) throw new Error("getPortSelector(): Port doesn't exist.");
        }
        return selector + '>g:nth-child(' + (index + 1) + ')>.port-body';
    }
};

/**
 * `dedu.shape.basic.PortsViewInterface` 是 `dedu.shape.basic.PortsModelInterface`的view
 * @class
 */
dedu.shape.basic.PortsViewInterface = {

    /**
     * initialize
     * @param options
     * @memberof dedu.shape.basic.PortsViewInterface
     */
    initialize: function (options) {
        if(options.skip_render){
            return;
        }
        dedu.ElementView.prototype.initialize.apply(this, arguments);
        // `Model` emits the `process:ports` whenever it's done configuring the `attrs` object for ports.
        this.listenTo(this.model, 'process:ports', this.update);
        this.model.on('change:selected',function(){
            if(this.model.get("selected")){
                this.focus();
            }else{
                this.unfocus();
            }
        },this);
    },

    /**
     * `update` in order to override
     * @memberof dedu.shape.basic.PortsViewInterface
     */
    update: function () {
        // First render ports so that `attrs` can be applied to those newly created DOM elements
        // in `ElementView.prototype.update()`.
        this.renderPorts();
        dedu.ElementView.prototype.update.apply(this, arguments);
    },
    /**
     * render port
     * @memberof dedu.shape.basic.PortsViewInterface
     */
    renderPorts: function () {
        var $inPorts = this.$('.inPorts').empty();
        var $outPorts = this.$('.outPorts').empty();

        var portTemplate = _.template(this.model.portMarkup);

        _.each(_.filter(this.model.ports, function(p) { return p.type === 'in'; }), function(port, index) {

            $inPorts.append(V(portTemplate({ id: index, port: port })).node);
        });
        _.each(_.filter(this.model.ports, function(p) { return p.type === 'out'; }), function(port, index) {

            $outPorts.append(V(portTemplate({ id: index, port: port })).node);
        });

    }
};
/**
 * Created by y50-70 on 3/4/2016.
 */


dedu.connectors.normal = function (sourcePoint, targetPoint, vertices) {
    // Construct the `d` attribute of the `<path>` element.

    var d = ['M',sourcePoint.x,sourcePoint.y,"C"];




    _.each(vertices, function (vertex) {
        d.push(vertex.x,vertex.y);
    });

    var midPointX = Math.abs(sourcePoint.x - targetPoint.x);

    d.push(sourcePoint.x+midPointX/2,sourcePoint.y);
    d.push(targetPoint.x-midPointX/2,targetPoint.y);

    d.push(targetPoint.x,targetPoint.y);

    return d.join(' ');
};

dedu.shape.devs = {};

/**
 * `dedu.shape.devs.Model` extends `dedu.shape.basic.Generic` and `dedu.shape.basic.PortsModelInterface`
 * @class
 * @augments dedu.shape.basic.Generic
 */
dedu.shape.devs.Model = dedu.shape.basic.Generic.extend(
    _.extend(
        {},
        dedu.shape.basic.PortsModelInterface,
        {
            markup: '<g class="rotatable"><g class="scalable"><rect class="body"/></g><text class="label"/><g class="inPorts"/><g class="outPorts"/></g>',
            portMarkup: '<g class="port port<%= id %>"><rect class="port-body"/><text class="port-label"/></g>',

            defaults: dedu.util.deepSupplement({

                type: 'devs.Model',
                size: { width: 1, height: 1 },

                inPorts: [],
                outPorts: [],

                attrs: {
                    '.': { magnet: false },
                    '.body': {
                        width: 150, height: 250,
                        stroke: '#000000'
                    },
                    '.port-body': {
                        rx: 3,
                        ry:3,
                        width:10,
                        height:10,
                        magnet: true,
                        stroke: '#000000'
                    },
                    text: {
                        'pointer-events': 'none',
                    },
                    '.label': { 'font-size': 10,text: 'Model', 'ref-x': .5, 'ref-y': 10, ref: '.body', 'text-anchor': 'middle', fill: '#000000' },
                    '.inPorts .port-label': { x:-15, dy: 4, 'text-anchor': 'end', fill: '#000000' },
                    '.outPorts .port-label':{ x: 15, dy: 4, fill: '#000000' }
                }

            }, dedu.shape.basic.Generic.prototype.defaults),

            /**
             * get port css,it is called by {@link dedu.shape.basic.PortsModelInterface~updatePortsAttrs}
             * @param {String} portName - port name
             * @param {Number} index
             * @param {Number} total
             * @param {String} selector - '.inPorts','.outPorts'
             * @param {String} type - 'in','out'
             * @returns {Object}
             */
            getPortAttrs: function (portName,index,total,selector,type) {
                var attrs = {};

                var portClass = 'port'+index;
                var portSelector = selector + '>.' + portClass;
                var portLabelSelector = portSelector + '>.port-label';
                var portBodySelector = portSelector + '>.port-body';

                attrs[portBodySelector] = {port:{id:portName || _.uniqueId(type),type:type}};
                attrs[portSelector] = {ref:'.body','ref-y':(index + 0.5)*(1/total)*this.get('size').height-5};

                if(selector === '.outPorts'){
                    attrs[portSelector]['ref-dx'] = -5; //relative to the right edge of the element referenced to by the selector in ref attribute
                }else{
                    attrs[portSelector]['ref-x'] = -5;  //relative to the left edge of the element referenced to by the selector in ref attribute
                }
                return attrs;
            },

        }
    )
);

/**
 * `dedu.shape.devs.ModelView` 是 `dedu.shape.devs.Model`的view
 * @class
 * @augments dedu.ElementView
 */
dedu.shape.devs.ModelView = dedu.ElementView.extend(
    _.extend(
        {},
        dedu.shape.basic.PortsViewInterface,
        {
            focus: function () {
                this.vel.findOne('.body').addClass('selected');
            },
            unfocus:function(){
                this.vel.findOne('.body').removeClass('selected');
            }
        })
);
dedu.shape.node = {};
/**
 * @class
 * @augments dedu.shape.devs.Model
 */
dedu.shape.node.Model = dedu.shape.devs.Model.extend({
    defaults:dedu.util.deepSupplement({
        markup: '<g class="rotatable"><g class="scalable"><g class="body nodegroup"/></g><text class="label"/><g class="inPorts"/><g class="outPorts"/></g>',
        type:'node.Model',
        size:{
            width:120,
            height:28
        },
        attrs:{
            'rect.node': {'width': 140, height: 30},
            '.port-body': {
                r: 4,
                magnet: true,
                stroke: '#000000'
            },
            'rect.node_button_button_shadow':{'width': 32, height: 26},
            'rect.node_button_button':{'width': 16, height: 18},
            '.label': {'ref-x':.5, 'ref-y':.3, ref: '.node', 'text-anchor': 'middle', fill: '#000',style:{'font-weight':'normal'}},
        }

    },dedu.shape.devs.Model.prototype.defaults),
    initialize: function () {
        this.data = this.get('data');
        var outputs = [];
        var inputs = [];
        for (var i = 0; i < this.data.outputs; i++) {
            outputs[i] = 'out' + i;
        }
        for (i = 0; i < this.data.inputs; i++) {
            inputs[i] = 'in' + i;
        }
        this.set("outPorts", outputs);
        this.set("inPorts", inputs);
        this.attr(".label/text", this.data.type);
        dedu.shape.devs.Model.prototype.initialize.apply(this,arguments);
    }
});

/**
 * @class
 * @augments dedu.shape.devs.ModelView
 */
dedu.shape.node.ModelView = dedu.shape.devs.ModelView.extend({

    options:{},

    renderView: function () {

        var nodegroup = this.vel.findOne('.nodegroup');

        //获取绑定数据
        var data = this.model.data;
        var size = this.model.get('size');

        var allAttrs = this.model.get('attrs');
        var l = data._def.label;
        l = (typeof l === "function" ? l.call(data) : l)||"";
        allAttrs['.label'].text = l;

        //判断节点是否需要按钮
        if (data._def.button) {
            var nodeButtonGroup = V('g');
            nodegroup.append(nodeButtonGroup);
            nodeButtonGroup.attr("transform", function () {
                    return "translate(" + ((data._def.align == "right") ? 94 : -25) + ",2)";
                })
                .attr("class", function () {
                    return "node_button " + ((data._def.align == "right") ? "node_right_button" : "node_left_button");
                });
            nodeButtonGroup.append(V('rect')
                .attr("class", "node_button_button_shadow")
                .attr("rx", 5)
                .attr("ry", 5)
                .attr("fill", "#eee"));//function() { return d._def.color;}

            nodeButtonGroup.append(V('rect')
                .attr("class", "node_button_button")
                .attr("x",function () {
                    return data._def.align == "right" ? 11 : 5
                })
                .attr("y", 4)
                .attr("rx", 4)
                .attr("ry", 4)
                .attr("fill",function () {
                    return data._def.color;
                })
                .attr("cursor", "pointer"));
        }
        //var mainRect
        nodegroup.append(V('rect')
            .attr("class", "node")
            .toggleClass ("node_unknown", function () {
                return data.type == "unknown";
            })
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", function () {
                return data._def.color;
            })
            .attr('width',size.width)
            .attr('height',size.height));

        if (data._def.icon) {
            var icon_group = V('g')
                .attr("class", "node_icon_group")
                .attr("x", 0).attr("y", 0);
            nodegroup.append(icon_group);


            var icon_shade = V('rect')
                .attr("x", 0).attr("y", 0)
                .attr("class", "node_icon_shade")
                .attr("width", "30")
                .attr("stroke", "none")
                .attr("fill", "#000")
                .attr("fill-opacity", "0.05")
                .attr("height", function () {
                    return Math.min(50, size.height);
                });
            icon_group.append(icon_shade);

            var icon = V('image')
                .attr("xlink:href", "icons/" + data._def.icon)
                .attr("class", "node_icon")
                .attr("x", 0)
                .attr("width", "30")
                .attr("height", "30");
            icon_group.append(icon);

            var icon_shade_border = V('path')
                .attr("d", function () {
                    return "M 30 1 l 0 " + (size.height - 2)
                })
                .attr("class", "node_icon_shade_border")
                .attr("stroke-opacity", "0.1")
                .attr("stroke", "#000")
                .attr("stroke-width", "1");
            icon_group.append(icon_shade_border);


            if ("right" == data._def.align) {
                icon_group.attr('class', 'node_icon_group node_icon_group_' + data._def.align);
                icon_shade_border.attr("d", function () {
                    return "M 0 1 l 0 " + (size.height - 2)
                });
                //icon.attr('class','node_icon node_icon_'+d._def.align);
                //icon.attr('class','node_icon_shade node_icon_shade_'+d._def.align);
                //icon.attr('class','node_icon_shade_border node_icon_shade_border_'+d._def.align);
            }

            var img = new Image();
            img.src = "icons/" + data._def.icon;
            img.onload = function () {
                icon.attr("width", Math.min(img.width, 30));
                icon.attr("height", Math.min(img.height, 30));
                icon.attr("x", 15 - Math.min(img.width, 30) / 2);
                //if ("right" == d._def.align) {
                //    icon.attr("x",function(){return d.w-img.width-1-(d.outputs>0?5:0);});
                //    icon_shade.attr("x",function(){return d.w-30});
                //    icon_shade_border.attr("d",function(){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2);});
                //}
            }

            //icon.style("pointer-events","none");
            icon_group.attr("pointer-events", "none");
        }

        return this;
    },

    focus: function () {

        this.vel.findOne('.node').addClass('selected');
    },
    unfocus:function(){

        this.vel.findOne('.node').removeClass('selected');
    }
});

dedu.shape.simple = {};
/**
 * SuspendPort model interface
 * @class
 */
dedu.shape.simple.SuspendPortModelInterface = {
    initialize:function(){

    }
};

/**
 * SuspendPort view interface
 * @class
 */
dedu.shape.simple.SuspendPortViewInterface = {
    initialize:function(options){
        if(options.skip_render){
            return;
        }
        dedu.ElementView.prototype.initialize.apply(this, arguments);
        //this.listenTo(this, 'add:ports', this.update);
        //this.listenTo(this,'remove:ports',this.update);
        _.bindAll(this,"showSuspendPort","hideSuspendPort");
        this.$el.on('mouseenter',this.showSuspendPort);
        this.$el.on('mouseleave',this.hideSuspendPort);

        _.bindAll(this,"addTipMagnet","removeTipMagnet");

        this.on('cell:highlight',this.addTipMagnet);
        this.on('cell:unhighlight',this.removeTipMagnet);
        this.model.on('change:selected',function(){
            if(this.model.get("selected")){
                this.focus();
            }else{
                this.unfocus();
            }

        },this);
    },
    renderView:function(){
        //dedu.ElementView.prototype.render.apply(this, arguments);
        this.renderSuspendPort();
        //this.update();
    },
    /**
     * 渲染suspend port
     * @method renderSuspendPort
     * @memberof dedu.shape.simple.SuspendPortViewInterface
     */
    renderSuspendPort: function () {

        var suspendTemplate = _.template(this.model.suspendPortMarkup);

        this.up = V(suspendTemplate({dir:'up'})).attr("port",'up');
        this.right = V(suspendTemplate({dir:'right'})).attr("port",'right');
        this.down = V(suspendTemplate({dir:'down'})).attr("port",'down');
        this.left = V(suspendTemplate({dir:'left'})).attr("port",'left');
        this.rotatableNode.append(this.up);
        this.rotatableNode.append(this.right);
        this.rotatableNode.append(this.down);
        this.rotatableNode.append(this.left);

        var port_ref_position = this.model.get('port_ref_position');
        if(port_ref_position){
            this.model.attr({
                '.suspend':{ref:'.body',r:3,display:'none'},
                '.portup':{'ref-x':port_ref_position.portup['ref-x'],'ref-y':port_ref_position.portup['ref-y']},
                '.portright':{'ref-x':port_ref_position.portright['ref-x'],'ref-y':port_ref_position.portright['ref-y']},
                '.portdown':{'ref-x':port_ref_position.portdown['ref-x'],'ref-y':port_ref_position.portdown['ref-y']},
                '.portleft':{'ref-x':port_ref_position.portleft['ref-x'],'ref-y':port_ref_position.portleft['ref-y']}
            });
        }else{        
            this.model.attr({
                '.suspend':{ref:'.body',r:3,display:'none'},
                '.portup':{'ref-x':.5,'ref-y':0},
                '.portright':{'ref-x':'100%','ref-y':.5},
                '.portdown':{'ref-x':.5,'ref-y':'100%'},
                '.portleft':{'ref-y':.5,'ref-x':0}
            });
        }


        this.trigger('add:ports');
    },
    /**
     * show suspend port
     * method showSuspendPort
     * @memberof dedu.shape.simple.SuspendPortViewInterface
     */
    showSuspendPort: function () {
        this.up.attr('display','block');
        this.right.attr('display','block');
        this.down.attr('display','block');
        this.left.attr('display','block');
    },
    /**
     * hide suspend port
     * method hideSuspendPort
     * @memberof dedu.shape.simple.SuspendPortViewInterface
     */
    hideSuspendPort: function () {
        this.up.attr('display','none');
        this.right.attr('display','none');
        this.down.attr('display','none');
        this.left.attr('display','none');
    }
};

/**
 * A model class implements suspend port
 * @class
 * @augments dedu.shape.basic.Generic
 */
dedu.shape.simple.Generic = dedu.shape.basic.Generic.extend(
    _.extend(
        {},
        dedu.shape.basic.PortsModelInterface,
        {
            markup: '<g class="rotatable"><g class="scalable"><rect class="body"/></g><text class="label"/></g>',
            suspendPortMarkup:'<circle class="suspend port<%= dir %>"/>',
            defaults: dedu.util.deepSupplement({
                type: 'simple.Generic',
                size: {width: 1, height: 1},

                attrs: {
                    '.body': {
                        width: 150, height: 250,
                        stroke: '#000000'
                    },
                    '.suspend':{
                        magnet: true
                    },

                }
            }, dedu.shape.basic.Generic.prototype.defaults),
            /**
             * get relative position for port
             * @param portName
             * @param index
             * @param total
             * @param selector
             * @param type
             * @returns {{}}
             * @memberof dedu.shape.simple.Generic
             */
            getPortAttrs: function (portName,index,total,selector,type) {
                var attrs = {};

                var portClass = 'port'+index;
                var portSelector = selector + '>.' + portClass;
                var portLabelSelector = portSelector + '>.port-label';
                var portBodySelector = portSelector + '>.port-body';

                attrs[portBodySelector] = {port:{id:portName || _.uniqueId(type),type:type}};
                attrs[portSelector] = {ref:'.body','ref-y':(index + 0.5)*(1/total)};

                if(selector === '.outPorts'){attrs[portSelector]['ref-dx'] = 0;}
                return attrs;
            }
        })
);

/**
 * A view class implements suspend port
 * @class
 * @augments dedu.ElementView
 */
dedu.shape.simple.GenericView = dedu.ElementView.extend(
    _.extend({},dedu.shape.simple.SuspendPortViewInterface,{
        /**
         * 显示连接到port的提示
         * @param {DOMObject} el - port对应的domObject
         * @param {Object} [opt]
         */
        addTipMagnet: function (el, opt) {
            var port = V(el);
            if(port.attr('port') && !$(".tip-"+port.attr('port'),this.$el)[0]){
                var tip = V('circle',{class:"tip tip-"+port.attr('port'),transform:port.attr('transform'),r:15,fill:'black',opacity:0.3});
                this.rotatableNode.append(tip);
            }
            this.showSuspendPort(); // show four ports
        },
        /**
         * 移除提示
         * @param el
         * @param opt
         */
        removeTipMagnet: function (el, opt) {
            var port = V(el);
            if($(".tip-"+port.attr('port'),this.$el)[0]){
                $(".tip.tip-"+port.attr('port'),this.$el).remove();
            }
            this.hideSuspendPort(); // hide four ports
        },
        focus: function () {
            this.vel.findOne('.body').addClass('selected');
        },
        unfocus:function(){
            this.vel.findOne('.body').removeClass('selected');
            
        }
    })
);

/**
 * Created by lmz on 16/3/20.
 */

dedu.shape.uml = {
};

/**
 * `StartState`
 * @class
 * @augments dedu.shape.simple.Generic
 */
dedu.shape.uml.StartState = dedu.shape.simple.Generic.extend({
    markup:[
        '<g class="rotatable">',
        '<g class="scalable">',
        '<circle class="uml-start-state-body uml-state-body"/>',
        '</g>',
        '</g>'
    ].join(''),

    defaults: dedu.util.deepSupplement({
       type: 'uml.StartState',
       size: { width: 25, height: 25 },
       port_ref_position:{
            portup:{
                'ref-x':0,
                'ref-y':-.5,
            },
            portright:{
                'ref-x':.5,
                'ref-y':0
            },
            portdown:{
                'ref-x':0,
                'ref-y':.5
            },
            portleft:{
                'ref-x':-0.5,
                'ref-y':0
            }                        
       },
       attrs: {
           '.uml-start-state-body': {
               'r': 20,
               'stroke': '#333',
               'fill': '#444'
           }
       },
    }, dedu.shape.simple.Generic.prototype.defaults)
});

/**
 * @class
 * @augments dedu.shape.simple.Generic
 */
dedu.shape.uml.EndState = dedu.shape.simple.Generic.extend({
        markup: [
            '<g class="rotatable">',
            '<g class="scalable">',
            '<circle class="uml-end-state-body uml-state-body" />',
            '<circle class="uml-end-state-inner"/>',
            '</g>',
            '</g>'
        ].join(''),
        defaults: dedu.util.deepSupplement({
            type: 'uml.EndState',
            size: { width: 25, height: 25 },
            port_ref_position: {
                portup: {
                    'ref-x': 0,
                    'ref-y': -.5,
                },
                portright: {
                    'ref-x': .5,
                    'ref-y': 0
                },
                portdown: {
                    'ref-x': 0,
                    'ref-y': .5
                },
                portleft: {
                    'ref-x': -0.5,
                    'ref-y': 0
                }
            },

            attrs: {
               '.uml-end-state-body': {
                   'r': 20,
                   'stroke': '#333'
               },
                '.uml-end-state-inner': {
                   'r': 10,
                   'stroke': '#333'
               }
            }
       }, dedu.shape.simple.Generic.prototype.defaults)
});

/**
 * @class
 * @augments dedu.shape.simple.Generic.
 */
dedu.shape.uml.State = dedu.shape.simple.Generic.extend({
    markup: [
        '<g class="rotatable">',
        '<g class="scalable">',
        '<rect class="uml-state-body"/>',
        '</g>',
        '<path class="uml-state-separator"/>',
        '<text class="uml-state-name"/>',
        '<text class="uml-state-events"/>',
        '</g>'
    ].join(''),

    defaults: dedu.util.deepSupplement({

        type: 'uml.State',
        size: { width: 60, height: 40 },

        attrs: {
            '.uml-state-body': {
                'width': 200, 'height': 100, 'rx': 10, 'ry': 10,
                'fill': '#fff9ca', 'stroke': '#333', 'stroke-width': 1
            },
            '.uml-state-name': {
                'ref': '.uml-state-body', 'ref-x': .5, 'ref-y':0, 'text-anchor': 'middle',
                'fill': '#000000', 'font-family': 'Courier New', 'font-size': 12,
                'font-weight':'bold'
            },
            '.uml-state-separator': {
                'stroke': '#333', 'stroke-width': 2
            },
            '.uml-state-events': {
                'ref': '.uml-state-separator', 'ref-x': 5, 'ref-y': 5,
                'fill': '#000000', 'font-family': 'Courier New', 'font-size': 10,
                'display':'block'
            }
        },

        events: [],
        name: 'State'
    }, dedu.shape.simple.Generic.prototype.defaults)

});

dedu.shape.uml.StateView = dedu.shape.simple.GenericView.extend({

    initialize: function (options) {
        if(options.skip_render){
            return;
        }
        dedu.shape.simple.GenericView.prototype.initialize.apply(this,arguments);
        this.model.on('change:name', this.updateName,this);
        this.model.on('change:events', this.updateEvents,this);
        this.model.on('change:size', this.updatePath,this);
    },

    render:function(){
        dedu.shape.simple.GenericView.prototype.render.apply(this,arguments);
        this.originSize = this.model.get('size');
        this.updateName();
        this.updatePath();
        this.updateEvents();
    },

    updateEvents: function () {
        this.vel.findOne('.uml-state-events').text(this.model.get('events').join('\n'));
        var $text = $(".uml-state-events",this.$el);
        var textBbox = V($text[0]).bbox(true, this.$el);
        var size = this.originSize;
        this.model.set('size',{
            width:size.width,
            height:size.height+textBbox.height
        });
    },

    updateName: function () {
        this.vel.findOne('.uml-state-name').text(this.model.get('name'));
    },

    updatePath: function () {

        var $text = $(".uml-state-name",this.$el);
        var textBbox = V($text[0]).bbox(true, this.$el);

        var d = 'M 0 '+textBbox.height+' L ' + this.model.get('size').width + " "+textBbox.height;

        // We are using `silent: true` here because updatePath() is meant to be called
        // on resize and there's no need to to update the element twice (`change:size`
        // triggers also an update).
        this.vel.findOne('.uml-state-separator').attr('d', d);
    },

    focus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },

    unfocus:function(){
        this.vel.findOne('.uml-state-body').attr({
            fill:"#fff9ca"
        });
        this.hideSuspendPort();
    }
});

dedu.shape.uml.StartStateView  = dedu.shape.simple.GenericView.extend({

    focus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#444"
        });
        this.hideSuspendPort();
    }

});

dedu.shape.uml.EndStateView  = dedu.shape.simple.GenericView.extend({
    initialize: function (options) {
        this.circle_index  = 2;
        dedu.shape.simple.GenericView.prototype.initialize.apply(this,arguments);
    },
    focus: function () {
        this.vel.findOne('.uml-state-body').attr({
            fill:"#ffc21d"
        });
    },
    unfocus:function(){
        this.vel.findOne('.uml-state-body').attr({
            fill:"#fff9ca"
        });
        this.hideSuspendPort();
    }
});
/**
 * Created by lmz on 16/5/5.
 */

dedu.shape.uml.Class = dedu.shape.basic.Generic.extend({

    markup: [
        '<g class="rotatable">',
        '<g class="scalable">',
        '<rect class="uml-class-name-rect"/><rect class="uml-class-attrs-rect"/><rect class="uml-class-methods-rect"/>',
        '</g>',
        '<text class="uml-class-name-text"/><text class="uml-class-attrs-text"/><text class="uml-class-methods-text"/>',
        '</g>'
    ].join(''),

    defaults: dedu.util.deepSupplement({

        type: 'uml.Class',
        size:{
            width:60,
            height:100
        },
        attrs: {
            rect: { 'width': 200 },

            '.uml-class-name-rect': { 'stroke': 'black', 'stroke-width': 1, 'fill': '#fff9ca' },
            '.uml-class-attrs-rect': { 'stroke': 'black', 'stroke-width': 1, 'fill': '#fff9ca' },
            '.uml-class-methods-rect': { 'stroke': 'black', 'stroke-width': 1, 'fill': '#fff9ca' },

            '.uml-class-name-text': {
                'ref': '.uml-class-name-rect', 'ref-y': .5, 'ref-x': .5, 'text-anchor': 'middle', 'y-alignment': 'middle', 'font-weight': 'bold',
                'fill': 'black', 'font-size': 12,text:'xxx'
            },
            '.uml-class-attrs-text': {
                'ref': '.uml-class-attrs-rect', 'ref-y': 5, 'ref-x': 5,
                'fill': 'black', 'font-size': 12,
            },
            '.uml-class-methods-text': {
                'ref': '.uml-class-methods-rect', 'ref-y': 5, 'ref-x': 5,
                'fill': 'black', 'font-size': 12,
            }
        },

        name: [],
        attributes: [],
        methods: []

    }, dedu.shape.basic.Generic.prototype.defaults),

    initialize: function() {

        this.on('change:name change:attributes change:methods', function() {
            this.updateRectangles();
            this.trigger('uml-update');
        }, this);

        this.updateRectangles();

        dedu.shape.basic.Generic.prototype.initialize.apply(this, arguments);
    },

    getClassName: function() {
        return this.get('name');
    },

    updateRectangles: function() {

        var attrs = this.get('attrs');

        var rects = [
            { type: 'name', text: this.getClassName() },
            { type: 'attrs', text: this.get('attributes') },
            { type: 'methods', text: this.get('methods') }
        ];

        var offsetY = 0;
        var line_height = this.get('attrs')['.uml-class-name-text']['font-size'];
        //console.log(line_height);

        _.each(rects, function(rect) {

            var lines = _.isArray(rect.text) ? rect.text : [rect.text];
            var rectHeight = lines.length * line_height + line_height/2;

            attrs['.uml-class-' + rect.type + '-text'].text = lines.join('\n');
            attrs['.uml-class-' + rect.type + '-rect'].height = rectHeight;
            attrs['.uml-class-' + rect.type + '-rect'].transform = 'translate(0,' + offsetY + ')';

            offsetY += rectHeight;
        });
    }

});

dedu.shape.uml.ClassView = dedu.ElementView.extend({

    initialize: function() {

        dedu.ElementView.prototype.initialize.apply(this, arguments);

        this.listenTo(this.model, 'uml-update', function() {
            this.update();
            this.resize();
        });
    }
});

dedu.shape.uml.Abstract = dedu.shape.uml.Class.extend({

    defaults: dedu.util.deepSupplement({
        type: 'uml.Abstract',
        attrs: {
            '.uml-class-name-rect': { fill : '#e74c3c' },
            '.uml-class-attrs-rect': { fill : '#c0392b' },
            '.uml-class-methods-rect': { fill : '#c0392b' }
        }
    }, dedu.shape.uml.Class.prototype.defaults),

    getClassName: function() {
        return ['<<Abstract>>', this.get('name')];
    }

});
dedu.shape.uml.AbstractView = dedu.shape.uml.ClassView;

dedu.shape.uml.Interface = dedu.shape.uml.Class.extend({

    defaults: dedu.util.deepSupplement({
        type: 'uml.Interface',
        attrs: {
            '.uml-class-name-rect': { fill : '#f1c40f' },
            '.uml-class-attrs-rect': { fill : '#f39c12' },
            '.uml-class-methods-rect': { fill : '#f39c12' }
        }
    }, dedu.shape.uml.Class.prototype.defaults),

    getClassName: function() {
        return ['<<Interface>>', this.get('name')];
    }

});
dedu.shape.uml.InterfaceView = dedu.shape.uml.ClassView;

dedu.shape.uml.Generalization = dedu.Link.extend({
    defaults: {
        type: 'uml.Generalization',
        attrs: { '.marker-target': { d: 'M 20 0 L 0 10 L 20 20 z', fill: 'white' }}
    }
});

dedu.shape.uml.Implementation = dedu.Link.extend({
    defaults: {
        type: 'uml.Implementation',
        attrs: {
            '.marker-target': { d: 'M 20 0 L 0 10 L 20 20 z', fill: 'white' },
            '.connection': { 'stroke-dasharray': '3,3' }
        }
    }
});

dedu.shape.uml.Aggregation = dedu.Link.extend({
    defaults: {
        type: 'uml.Aggregation',
        attrs: { '.marker-target': { d: 'M 40 10 L 20 20 L 0 10 L 20 0 z', fill: 'white' }}
    }
});

dedu.shape.uml.Composition = dedu.Link.extend({
    defaults: {
        type: 'uml.Composition',
        attrs: { '.marker-target': { d: 'M 40 10 L 20 20 L 0 10 L 20 0 z', fill: 'black' }}
    }
});

dedu.shape.uml.Association = dedu.Link.extend({
    defaults: { type: 'uml.Association' }
});
/**
 * Created by lmz on 16/5/8.
 */
dedu.shape.node_red = {};
/**
 * `subflowportModel` for node-red
 * @class
 * @augments dedu.shape.devs.Model.
 */
dedu.shape.node_red.subflowportModel = dedu.shape.devs.Model.extend({
    defaults:dedu.util.deepSupplement({
        markup: '<g class="rotatable"><g class="scalable"><rect class="body"/></g><g class="inPorts"/><g class="outPorts"/><text class="port_label small_label"/><text class="port_label port_index"/></g>',
        type:'node_red.subflowportModel',
        size:{
            width:40,
            height:40
        },
        attrs:{
            'rect.body':{
                rx:'8',
                ry:'8',
                'stroke-dasharray': '5,5',
                fill: '#eee',
                stroke: '#999'
            },
            'text.small_label':{
                'stroke-width': 0,
                fill: '#888',
                style:{'font-size': 10},
                'alignment-baseline': 'middle',
                'text-anchor': 'middle',
                ref: '.body',
                'ref-x': 20, 'ref-y':8,
                text:'output'
            },
            'text.port_index':{
                ref: '.body',
                'ref-x': 20, 'ref-y':18,
                'text':1
            }

        }
    },dedu.shape.devs.Model.prototype.defaults),
    initialize: function (options) {
        this.set("outPorts", options.outputs);
        this.set("inPorts", options.inputs);
        this.get('attrs')['text.port_index'].text = options.index;
        dedu.shape.devs.Model.prototype.initialize.apply(this,arguments);
    }

});

dedu.shape.node_red.subflowportModelView = dedu.shape.devs.ModelView.extend({

    renderView: function () {

    }
});
/**
 * `dedu.Paper` 是{@link dedu.Graph}的view
 * @class
 * @augments Backbone.View
 */
dedu.Paper = Backbone.View.extend({
    /**
     * 渲染元素的class
     * @member {String}
     * @memberof dedu.Paper
     * @default
     */
    className: 'paper',

    /**
     * `dedu.Paper`的默认属性
     * @member {Object}
     * @memberof dedu.Paper
     */
    options: {

        /**
         * @property {Number} options.width=800 - 渲染区域的宽度
         */
        width: 800,
        /**
         * @property {Number} options.height=600 - 渲染区域的高度
         */
        height: 600,
        /**
         * @property {Object} options.origin={x:0,y:0} - x,y coordinates in top-left corner
         */
        origin: { x: 0, y: 0 }, // x,y coordinates in top-left corner

        /**
         * @property {Number} options.gridSize=1 - 网格大小
         */
        gridSize:1,
        perpendicularLinks: false,
        /**
         * @property {dedu.ElementView} options.elementView - 默认的elementView
         */
        elementView: dedu.ElementView,
        /**
         *  @property {dedu.LinkView} options.LinkView - 默认的LinkView
         */
        linkView: dedu.LinkView,

        /**
         * @property {Object} options.interactive - 哪些元素可以进行交互
         */
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
        defaultLink: new dedu.Link,

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
            return (end === 'target' ? cellViewT : cellViewS) instanceof dedu.ElementView;
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

        /**
         *  @property {dedu.shape} options.cellViewNamespace - 默认的cellViewNamespace
         */
        cellViewNamespace: dedu.shape
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
      "dblclick": "mousedblclick",
      "click": "mouseclick",

    },

    /**
     * render cell that be added to `dedu.Graph`
     * @method onCellAdded
     * @param {dedu.Cell} cell
     * @param graph
     * @param opt
     */
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


    /**
     * Find a view for a model `cell`. `cell` can also be a string representing a model `id`.
     * @param {dedu.Cell} cell
     * @returns {dedu.CellView}
     */
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

    /**
     * Find a cell, the id of which is equal to `id`
     * @param {String} id
     * @returns {dedu.Cell}
     */
    getModelById:function(id){

        return this.model.getCell(id);
    },

    /**
     * 渲染`cell`
     * @param {dedu.Cell} cell - the model cell to be rendered
     * @returns {dedu.CellView}
     */
    renderView:function(cell){
        var view = this._views[cell.id] = this.createViewForModel(cell);
        V(this.vis).append(view.el);
        view.paper = this;
        view.render();

        return view;
    },
    /**
     * Find the first view clibing up the DOM tree starting at element 'el'.Note that `el` can also be a selector or a jQuery object.
     * @param {String|JQueryObject} $el
     * @returns {*}
     */

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

        var namespaceViewClass = dedu.util.getByPath(namespace,type,".");

        if (cell.isLink()) {
            optionalViewClass = this.options.linkView;
            defaultViewClass = dedu.LinkView;
        } else {
            optionalViewClass = this.options.elementView;
            defaultViewClass = dedu.ElementView;
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

    /**
     * 更改原点
     * @param {Number} ox - 新原点的x坐标
     * @param {Number} oy - 新原点的y坐标
     * @memberof dedu.Paper
     */
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

    // Cell highlighting
    // -----------------
    onCellHighlight: function (cellView, el) {
        V(el).addClass('highlighted');
    },

    onCellUnhighlight: function (cellView, el) {
        V(el).removeClass('highlighted');
    },


    // Interaction.
    // ------------

    /**
     * 空白处 mouse down
     * @param {Event} evt
     * @param {Number} x
     * @param {Number} y
     * @memberof dedu.Paper
     */
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

    /**
     * 空白处 mouse move
     * @param {Event} evt
     * @param {Number} x
     * @param {Number} y
     * @memberof dedu.Paper
     */
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

    /**
     * 空白处 mouse up
     * @param {Event} evt
     * @param {Number} x
     * @param {Number} y
     * @memberof dedu.Paper
     */
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
                if(cellView instanceof dedu.LinkView){
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


    /**
     *  mouse down
     *  * 判断鼠标点击的位置
     *  1. 图元上,则调用该图元的事件处理函数
     *  2. 空白处,则调用 {@link dedu.Paper~blank_pointDown}
     * @param {Event} evt
     * @param {Number} x
     * @param {Number} y
     * @memberof dedu.Paper
     */
    canvasMouseDown:function(evt){

        evt.preventDefault();

        var evt = dedu.util.normalizeEvent(evt);
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

    /**
     *  mouse move
     *  * 判断鼠标点击的位置
     *  1. 图元上,则调用该图元的事件处理函数
     *  2. 空白处,则调用 {@link dedu.Paper~blank_pointMove}
     * @param {Event} evt
     * @param {Number} x
     * @param {Number} y
     * @memberof dedu.Paper
     */
    canvasMouseMove:function(evt){

        evt.preventDefault();
        evt = dedu.util.normalizeEvent(evt);
        var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });
        if(this.sourceView){
            if(this.sourceView instanceof dedu.LinkView){
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

    /**
     *  mouse up
     *  * 判断鼠标点击的位置
     *  1. 图元上,则调用该图元的事件处理函数
     *  2. 空白处,则调用 {@link dedu.Paper~blank_pointUp}
     * @param {Event} evt
     * @param {Number} x
     * @param {Number} y
     * @memberof dedu.Paper
     */
    canvasMouseUp:function(evt){
        evt = dedu.util.normalizeEvent(evt);

        var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });

        if (this.sourceView) {

            this.sourceView.pointerup(evt, localPoint.x, localPoint.y);

            //"delete sourceView" occasionally throws an error in chrome (illegal access exception)
            this.sourceView = null;

        } else {

            this.trigger('blank:pointerup', evt, localPoint.x, localPoint.y);
        }
    },

    /**
     * 双击事件
     * @param {Event} evt
     */
    mousedblclick: function(evt) {
        evt.preventDefault();
        evt = dedu.util.normalizeEvent(evt);

        var view = this.findView(evt.target);
        if (this.guard(evt, view)) return;

        var localPoint = this.snapToGrid({ x: evt.clientX, y: evt.clientY });

        if (view) {

            view.pointerdblclick(evt, localPoint.x, localPoint.y);

        } else {

            this.trigger('blank:pointerdblclick', evt, localPoint.x, localPoint.y);
        }
    },

    /**
     * 单击事件
     * @param {Event} evt
     */
    mouseclick: function(evt) {

        // Trigger event when mouse not moved.
        if (this._mousemoved <= this.options.clickThreshold) {

            evt = dedu.util.normalizeEvent(evt);

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

    cellMouseover:function(evt){

        evt = dedu.util.normalizeEvent(evt);
        var view = this.findView(evt.target);
        if(view){
            if(this.guard(evt,view)) return;
            view.mouseover(evt);
        }
    },

    // Guard guards the event received. If the event is not interesting, guard returns `true`.
    // Otherwise, it return `false`.
    guard: function(evt, view) {
        if(view && view.model && (view.model instanceof dedu.Cell)){
            return false;
        }else if (this.svg === evt.target || this.el === evt.target || $.contains(this.svg, evt.target)) {
            return false;
        }
        return true; //Event guarded. Paper should not react on it in any way.
    },

    /**
     * get default linkview {@link dedu.Paper~options.linkView}
     * @method getDefaultLink
     * @param cellView
     * @param magnet
     * @returns {*}
     */
    getDefaultLink: function (cellView, magnet) {

        return _.isFunction(this.options.defaultLink)
            // default link is a function producing link model
            ? this.options.defaultLink.call(this, cellView, magnet)
            // default link is the Backbone model
            : this.options.defaultLink.clone();
    }

});

/**
 * 添加svg的属性,主要为了和node-red~editor的兼容
 * @class
 * @augments dedu.Paper
 */
dedu.Chart = dedu.Paper.extend({
    options: dedu.util.supplement({
        tabindex: 1,
        style: {

        }
    }, dedu.Paper.prototype.options),
    initialize: function() {
        dedu.Paper.prototype.initialize.apply(this, arguments);

        V(this.svg).attr({ tabindex: this.options.tabindex });

        var style = "";
        _.each(this.options.style, function(value, key) {
            style += key + ":" + value + ";"
        });
        V(this.svg).attr({ style: style });
    }
});

/**
 * Created by lmz on 16/5/3.
 */


dedu.plugins = {};

dedu.plugins.PlainSvg = (function () {
    var namespace = dedu.shape;

    var defaultViewClass = dedu.ElementView;
    var tmp_chart = null;
    // $(function(){
    //     $('body').append($('<div id="tmp_chart"></div>'));
    //     tmp_chart = new dedu.Chart({
    //         el: $('#tmp_chart'),
    //         width: 36,
    //         height: 36,
    //         tabindex: 1,
    //         gridSize: 1,
    //         style: {}
    //     });
    // });


    function renderView(node_type, options) {
        var view = createViewForModel(node_type, options);
        V(tmp_chart.vis).append(view.el);
        view.paper = tmp_chart;
        view.render();

        return view;
    }

    function createViewForModel(node_type, options) {
        var view_type = node_type + "View";

        var namespaceViewClass = dedu.util.getByPath(namespace, view_type, ".");
        var namespaceClass = dedu.util.getByPath(namespace, node_type, ".");

        var ViewClass = namespaceViewClass || defaultViewClass;

        var cell = new namespaceClass(options);

        var view = new ViewClass({
            model: cell,
            skip_render: true,
            paper: tmp_chart
        });
        return view;
    }

    function getPaleteeSvg( node_type, options) {

        var $tmp_svg = $('<svg style="width: 36px; height: 36px; display: block; position: relative; overflow: hidden; cursor: move; "></svg>');

        var view = renderView(node_type, options);

        $tmp_svg.append($(view.el));


        //free memory
        delete view.model;
        delete view;

        return $tmp_svg;
        //console.log($tmp_a);
    }

    return {
        getPaleteeSvg:getPaleteeSvg
    }
})();

