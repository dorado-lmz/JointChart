define(["backbone","joint_chart"], function (Backbone,JointChart) {
  var core = JointChart.core,
      Paper = JointChart.Paper,
      shape = JointChart.shape,
      util = core.util;
  /**
   * 添加svg的属性,主要为了和node-red~editor的兼容
   * @class
   * @augments Paper
   */
  Chart = Paper.extend({
    options: util.supplement({
      tabindex: 1,
      style: {

      },
      cellViewNamespace:shape
    }, Paper.prototype.options),
    initialize: function () {
      Paper.prototype.initialize.apply(this, arguments);

      Snap(this.svg).attr({
        tabindex: this.options.tabindex
      });

      var style = "";
      _.each(this.options.style, function (value, key) {
        style += key + ":" + value + ";"
      });
      Snap(this.svg).attr({
        style: style
      });
    }
  });

  return Chart;
})
