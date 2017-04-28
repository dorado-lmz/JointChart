requirejs.config({
  packages: ["src/shape"]
});

define(["./src/shape","./src/graph","./src/paper","./src/core"],function(Shape,Graph,Chart,core){
  return {
    shape: Shape,
    Graph: Graph,
    Paper: Paper,
    core: core
  };
});
