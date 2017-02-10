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

        Snap(this.svg).attr({ tabindex: this.options.tabindex });

        var style = "";
        _.each(this.options.style, function(value, key) {
            style += key + ":" + value + ";"
        });
        Snap(this.svg).attr({ style: style });
    }
});
