/**
 * Created by lmz on 16/5/3.
 */


dedu.plugins = {};

dedu.plugins.PlainSvg = (function () {
    var namespace = dedu.shape;

    var defaultViewClass = dedu.ElementView;
    var tmp_chart = null;
    $(function(){
        $('body').append($('<div id="tmp_chart"></div>'));
        tmp_chart = new dedu.Chart({
            el: $('#tmp_chart'),
            width: 36,
            height: 36,
            tabindex: 1,
            gridSize: 1,
            style: {}
        });
    });

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

