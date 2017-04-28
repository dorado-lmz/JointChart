define(['./Cell'], function (Cell) {
 /**
 * source or target
 * @typeof {Object} Link~Vertex
 * @property {String} id - vertex'id
 * @property {String} redID - vertex'redID
 * @property {Selector} selector - css
 * @property {String} port - port'name
 */
 /**
 * `Link` 是所有link的父类
 * Properties source and target determine to which elements the link is connected to. Both objects are of the form<Link~Vertex>:
 *
 * {
 *   id: <id of an element>,
 *   selector: <CSS selector>,
 *   port: <id of a port>
 * }
 *
 * @class
 * @augments Cell
 */
  Link = Cell.extend({
    /**
     * The default markup for links.
     * @member {Array}
     * @memberof Link
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
     * @memberof Link
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
     * @memberof Link
     */
    arrowheadMarkup: [
      '<g class="marker-arrowhead-group marker-arrowhead-group-<%= end %>">',
      '<path class="marker-arrowhead" end="<%= end %>" d="M 26 0 L 0 13 L 26 26 z" />',
      '</g>'
    ].join(''),

    /**
     * @member {Object} defaults - 默认属性
     * @property {String} defaults.type='link'
     * @property {Link~Vertex} source
     * @property {Link~Vertex} target
     * @property {Object} labels
     * @property {Object} attrs
     * @override
     * @memberof Link
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
    * }
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
     * @returns {*|Cell|null}
     */
    getSourceElement: function () {

      var source = this.get('source');

      return (source && source.id && this.graph && this.graph.getCell(source.id)) || null;
    },

    /**
     * Return the target element of the link or null if there is none.
     * @returns {*|Cell|null}
     */
    getTargetElement: function () {

      var target = this.get('target');

      return (target && target.id && this.graph && this.graph.getCell(target.id)) || null;
    },
    /**
     * 返回true
     * @override
     * @returns {boolean}
     * @memberof Link
     */
    isLink: function () {
      return true;
    }
  });
  return Link;
});
