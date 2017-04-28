/**
 * Created by y50-70 on 3/4/2016.
 */

define(["underscore", "../core"],function(_, core){
core.connectors.normal = function(sourcePoint, targetPoint, vertices) {
    // Construct the `d` attribute of the `<path>` element.

    var d = ['M', sourcePoint.x, sourcePoint.y];

    _.each(vertices, function(vertex) {

        d.push(vertex.x, vertex.y);
    });

    d.push(targetPoint.x, targetPoint.y);

    return d.join(' ');
};
return core.connectors.normal;
});