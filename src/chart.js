/**
 * 添加svg的属性,主要为了和node-red~editor的兼容
 * @class
 * @augments org.dedu.draw.Paper
 */
org.dedu.draw.Chart = org.dedu.draw.Paper.extend({
    options: org.dedu.draw.util.supplement({
        tabindex: 1,
        style: {

        }
    }, org.dedu.draw.Paper.prototype.options),
    initialize: function () {
        org.dedu.draw.Paper.prototype.initialize.apply(this, arguments);

        V(this.svg).attr({ tabindex: this.options.tabindex });

        var style = "";
        _.each(this.options.style,function(value,key) {
            style+= key+":"+value+";"
        });
        V(this.svg).attr({style:style});
    }
});
