requirejs.config({
  packages: ["src/shape"]
});

define(["src/shape","src/graph","src/chart"],function(dedu){
  console.log(dedu.Chart)
  return dedu;
});
