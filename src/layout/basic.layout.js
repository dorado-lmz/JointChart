var userStyles = null;
var vm = skanaar.vector;
var d = {};

var config = {
    arrowSize: +d.arrowSize || 1,
    bendSize: +d.bendSize || 0.3,
    direction: { down: 'TB', right: 'LR' }[d.direction] || 'TB',
    gutter: +d.gutter || 5,
    edgeMargin: (+d.edgeMargin) || 0,
    edges: { hard: 'hard', rounded: 'rounded' }[d.edges] || 'rounded',
    fill: (d.fill || '#eee8d5;#fdf6e3;#eee8d5;#fdf6e3').split(';'),
    fillArrows: 'true',
    font: d.font || 'Calibri',
    fontSize: (+d.fontSize) || 12,
    leading: (+d.leading) || 1.25,
    lineWidth: (+d.lineWidth) || 3,
    padding: (+d.padding) || 8,
    spacing: (+d.spacing) || 40,
    stroke: d.stroke || '#33322E',
    title: d.title || 'nomnoml',
    zoom: +d.zoom || 1,
    styles: userStyles
};

var measurer = {
    setFont: function(a, b, c) { setFont(a, b, c, skCanvas); },
    textWidth: function(s) {
        return skCanvas.measureText(s).width
    },
    textHeight: function() {
        return config.leading * config.fontSize
    }
};


var skCanvas = skanaar.Svg('')

skanaar.sum = function sum(list, plucker) {
    var transform = {
        'undefined': _.identity,
        'string': function(obj) {
            return obj[plucker]
        },
        'number': function(obj) {
            return obj[plucker]
        },
        'function': plucker
    }[typeof plucker]
    for (var i = 0, summation = 0, len = list.length; i < len; i++)
        summation += transform(list[i])
    return summation
}

skanaar.hasSubstring = function hasSubstring(haystack, needle) {
    if (needle === '') return true
    if (!haystack) return false
    return haystack.indexOf(needle) !== -1
}

skanaar.format = function format(template /* variadic params */ ) {
    var parts = Array.prototype.slice.call(arguments, 1)
    return _.flatten(_.zip(template.split('#'), parts)).join('')
}

function setFont(config, isBold, isItalic) {
    var style = (isBold === 'bold' ? 'bold' : '')
    if (isItalic) style = 'italic ' + style
    var defFont = 'Helvetica, sans-serif'
    var template = 'font-weight:#; font-size:#pt; font-family:\'#\', #'
    var font = skanaar.format(template, style, config.fontSize, config.font, defFont)
    skCanvas.font(font)
}


function rectIntersection(p1, p2, rect) {
    if (rect.width || rect.height) {
        var xBound = rect.width / 2 + config.edgeMargin;
        var yBound = rect.height / 2 + config.edgeMargin;
        var delta = vm.diff(p1, p2);
        var t;
        if (delta.x && delta.y) {
            t = Math.min(Math.abs(xBound / delta.x), Math.abs(yBound / delta.y));
        } else {
            t = Math.abs(delta.x ? xBound / delta.x : yBound / delta.y);
        }
        return vm.add(p2, vm.mult(delta, t));
    }
    return p2;
}

function layoutCellFullFormat(cell) {
    if (cell.regions) {

        cell.compartments = [{ lines: [cell.get('name')] }];
        _.each(cell.compartments, function(compartment, i) {
            var textSize = measureLines(compartment.lines, i ? 'normal' : 'bold')
            compartment.width = textSize.width;
            compartment.height = textSize.height - 2 * config.padding;
        });

        for (var regionName in cell.regions) {
            var cells = cell.regions[regionName];
            layoutCell(cells, {
                debug: true,
                level: true
            });
            cell.compartments.push({
                cells: cells,
                width: cells.width,
                height: cells.height
            });
        }
        cell.width = _.max(_.pluck(cell.compartments, 'width'));
        cell.height = skanaar.sum(cell.compartments, 'height');
        cell.debug = true;
        if (cell instanceof dedu.shape.uml.State) {
            var radio = Math.round(cell.compartments[0].height / 4),
                dy = Math.round(cell.compartments[0].height * .5);
            cell.compoundUI(true, {
                'body': {
                    rx: radio,
                    ry: radio,
                },
                'name': {
                    dy: dy
                }
            });
        }
    }
}

function splitCells(cells) {
    var elements = {},
        links = {},sum_elements=0,sum_links=0;
    _.each(cells, function(cell) {
        if (cell.isLink()) {
            links[cell.get('source').id+cell.get('target').id] = cell;
            sum_links++;
        } else {
            elements[cell.id] = cell;
            sum_elements++;
        }
    });
    Object.defineProperty(elements,'length',{
      value: sum_elements,
      enumerable: false
    });
    Object.defineProperty(links,'length',{
      value: sum_links,
      enumerable: false
    })
    return {
        elements: elements,
        links: links
    }
}

function layoutCell(_cells, opt) {
    //分离元素和连线
    var cells = splitCells(_cells);
    var elems = cells.elements,
        links = cells.links;
    if (elems.length <= 0)
        return;

    //两种模式下的layout
    if (opt.debug) {
        _.each(_cells, layoutCellFullFormat);
    } else {
        _.each(_.values(elems), function(_elem) {
            _elem.width && (_elem.width = 0);
            _elem.height && (_elem.height = 0);
            _elem.debug && (_elem.debug = false);
            _elem.compoundUI(false);
        })
    }

    //配置graph对象属性
    var g = new dagre.graphlib.Graph();
    if (opt.level) {
        g.setGraph({
            marginx: 10,
            marginy: 10
        });
    } else {
        g.setGraph({
            marginx: config.spacing,
            marginy: config.spacing
        });
    }

    g.setDefaultEdgeLabel(function() {
        return {};
    });

    //计算元素最合适的尺寸
    for (var id in elems) {
        layoutClassifier(elems[id]);
        g.setNode(id, { width: elems[id].width, height: elems[id].height });
    }

    for (var id in links) {
        g.setEdge(links[id].get('source').id, links[id].get('target').id);
    }

    //布局计算
    dagre.layout(g);

    _.each(g.nodes(), function(index) {

        if (!index) {
            return;
        }

        var elem = elems[index];
        var node = g.node(index);

        elem.set('position', {
            x: Math.round(node.x - node.width / 2),
            y: Math.round(node.y - node.height / 2)
        }, { silent: true });

        elem.x = elem.get('position').x;
        elem.y = elem.get('position').y;

        if (node.width && node.height) {
            elem.set('size', {
                width: node.width,
                height: node.height
            }, { silent: true })
        }
    });

    _.each(g.edges(), function(e) {

        var edge = g.edge(e),
            path = edge.points;
        var link = links[e.v + e.w],
            startNode = g.node(e.v),
            endNode = g.node(e.w);
        path.unshift({
            x: startNode.x,
            y: startNode.y
        });
        path.push({
            x: endNode.x,
            y: endNode.y
        });

        var start = rectIntersection(path[1], _.first(path), startNode);
        var end = rectIntersection(path[path.length - 2], _.last(path), endNode);
        if (!isEqual(start, path[1])) {
            path.splice(0, 1, start);
        } else {
            path.splice(0, 1);
        }

        if (!isEqual(end, path[path.length - 2])) {
            path.splice(path.length - 1, 1, end);
        } else {
            path.splice(path.length - 1, 1);
        }

        link.set('vertices', path, { silent: true });

    });

    var graphHeight = g._label.height,
        graphWidth = g._label.width;

    _cells.width = graphWidth + 2 * config.padding;
    _cells.height = graphHeight + config.padding;
}

function isEqual(pointA, pointB) {
    if (pointA.x === pointB.x && pointB.y === pointB.y)
        return true;
    else
        return false;
}


function layoutClassifier(cell) {
    if (cell instanceof dedu.Element) {
        // _.each(cell.children.models, layoutCell)
        if (cell.get('text')) {
            var size = measureLines([cell.get('text')]);
            cell.width = _.max([size.width, cell.width || 0]);
            cell.height = _.max([size.height, cell.height || 0]);
        } else {
            cell.width = _.max([cell.get('size').width, cell.width || 0]);
            cell.height = _.max([cell.get('size').height, cell.height || 0]);
        }
    }
}

function measureLines(lines) {
    return {
        width: Math.round(_.max(_.map(lines, measurer.textWidth)) + 2 * config.padding),
        height: Math.round(measurer.textHeight() * lines.length + 2 * config.padding)
    }
}
