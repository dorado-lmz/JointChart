requirejs.config({
  baseUrl: '../../../',
  paths: {
    jquery: 'http://apps.bdimg.com/libs/jquery/2.1.4/jquery.min',
    'jquery.shortcuts': '/src/jquery.shortcuts',
    snap: 'https://cdn.bootcss.com/snap.svg/0.5.1/snap.svg-min',
    underscore: 'https://cdn.bootcss.com/underscore.js/1.8.3/underscore-min',
    backbone: 'https://cdn.bootcss.com/backbone.js/1.3.3/backbone-min',
    backboneRelation: 'https://cdn.bootcss.com/backbone-relational/0.10.0/backbone-relational',
    joint_chart: '/joint_chart',
    graphlib: 'http://shenmu.oschina.io/joint-chart/dist/graphlib.core',
    dagre: 'http://shenmu.oschina.io/joint-chart/dist/dagre.core',
    skanaar: '/lib/skanaar.svg',
    lodash: '/lib/lodash',
    StateJS: 'http://shenmu.oschina.io/statejs/state',
    text: 'https://cdn.bootcss.com/require-text/2.0.12/text',
    app: '/assets/app',
    react: 'https://cdn.bootcss.com/react/15.5.4/react.min',
    'react-dom':'https://cdn.bootcss.com/react/15.5.4/react-dom.min'
  },
  shim: {
    'jquery.shortcuts':['jquery'],
    'dagre':['graphlib','lodash'],
    backboneRelation: ['backbone'],

  }
});

require(['StateJS','react','react-dom',"./demo/draw.io/src/chart", 'jquery.shortcuts'],
  function (StateJS,React,ReactDOM,dedu) {
    window.React = React;
    window.ReactDOM = ReactDOM;
    window.dedu = dedu;
    window.StateJS = StateJS;
    require(["app"],function(){

  })
});
