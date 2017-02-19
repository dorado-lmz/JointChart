/**
 * Created by y50-70 on 3/4/2016.
 */


dedu.connectors.normal = function(sourcePoint, targetPoint, vertices) {
    // Construct the `d` attribute of the `<path>` element.

    var d;
    if (vertices && vertices.length > 0) {
        d = ['M', vertices[0].x, vertices[0].y, "L"];
        _.each(vertices, function(vertex) {
            d.push(vertex.x, vertex.y);
        });
        return d.join(' ');
    } else {
        d = ['M', sourcePoint.x, sourcePoint.y, "L"];
        // var midPointX = Math.abs(sourcePoint.x - targetPoint.x),midPointY = Math.abs(sourcePoint.y - targetPoint.y),midPoint;
        // if(midPointX>midPointY){
        //   midPoint = {
        //     x: sourcePoint.x > targetPoint.x
        //   }
        // }else{

        // }
        // midPoint = {
        //     x: sourcePoint.x ,
        //     y: targetPoint.y
        // }
        // d.push(midPoint.x, midPoint.y);
        d.push(targetPoint.x, targetPoint.y);
        return d.join(' ');
    }
    // var d = ['M',sourcePoint.x,sourcePoint.y,"L"];
    // var d = ['M',vertices[0].x,vertices[0].y,"L"];






    var midPointX = Math.abs(sourcePoint.x - targetPoint.x);

    // d.push(sourcePoint.x+midPointX/2,sourcePoint.y);
    // d.push(targetPoint.x-midPointX/2,targetPoint.y);

    if (vertices && vertices.length > 0) {

    } else {
        d.push(targetPoint.x, targetPoint.y);
    }
    // d.push(targetPoint.x,targetPoint.y);

    return d.join(' ');
};
