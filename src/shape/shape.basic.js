define(['../element'],function(dedu){
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
        // this.attr(attrs, { silent: true });
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

            $inPorts.append(Snap.fragment(portTemplate({ id: index, port: port })));
        });
        _.each(_.filter(this.model.ports, function(p) { return p.type === 'out'; }), function(port, index) {

            $outPorts.append(Snap.fragment(portTemplate({ id: index, port: port })));
        });

    }
};
  return dedu;
})
