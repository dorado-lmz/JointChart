
org.dedu.draw.shape.devs = {};

/**
 * `org.dedu.draw.shape.devs.Model` extends `org.dedu.draw.shape.basic.Generic` and `org.dedu.draw.shape.basic.PortsModelInterface`
 * @class
 * @augments org.dedu.draw.shape.basic.Generic
 */
org.dedu.draw.shape.devs.Model = org.dedu.draw.shape.basic.Generic.extend(
    _.extend(
        {},
        org.dedu.draw.shape.basic.PortsModelInterface,
        {
            markup: '<g class="rotatable"><g class="scalable"><rect class="body"/></g><text class="label"/><g class="inPorts"/><g class="outPorts"/></g>',
            portMarkup: '<g class="port port<%= id %>"><rect class="port-body"/><text class="port-label"/></g>',

            defaults: org.dedu.draw.util.deepSupplement({

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

            }, org.dedu.draw.shape.basic.Generic.prototype.defaults),

            /**
             * get port css,it is called by {@link org.dedu.draw.shape.basic.PortsModelInterface~updatePortsAttrs}
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
 * `org.dedu.draw.shape.devs.ModelView` 是 `org.dedu.draw.shape.devs.Model`的view
 * @class
 * @augments org.dedu.draw.ElementView
 */
org.dedu.draw.shape.devs.ModelView = org.dedu.draw.ElementView.extend(
    _.extend(
        {},
        org.dedu.draw.shape.basic.PortsViewInterface,
        {
            focus: function () {
                this.vel.findOne('.body').addClass('selected');
            },
            unfocus:function(){
                this.vel.findOne('.body').removeClass('selected');
            }
        })
);