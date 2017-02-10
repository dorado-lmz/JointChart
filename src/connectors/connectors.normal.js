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