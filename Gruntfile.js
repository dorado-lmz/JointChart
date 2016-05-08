module.exports = function(grunt){
    var js = {
        core:[
            'src/vectorizer.js',
            'src/geometry.js',
            'src/core.js',
            'src/cell.js',
            'src/element.js',
            'src/link.js',
            'src/graph.js',

            'src/shape/shape.basic.js',
            'src/connectors/connectors.normal.js',

            'src/shape/shape.devs.js',
            'src/shape/shape.node.js',
            'src/shape/shape.simple.js',
            'src/shape/shape.uml.state.js',

            'src/paper.js',
            'src/chart.js',

            'src/plugins/plugins.PlainSvg.js'
        ],
        plugins:{
            'shape.devs':['src/shape/shape.devs.js'],
            'shape.node':['src/shape/shape.node.js'],
            'shape.simple':['src/shape/shape.simple.js'],
            'shape.uml.state':['src/shape/shape.uml.state']
        }
    }

    grunt.initConfig({
        sass:{
            dist:{
                options:{
                    style:'expanded'
                },
                files:{
                    'dist/style.css':"sass/style.scss"
                }
            }
        },
        concat:{
            dist:{
                files:{
                   'dist/joint_chart.js':js.core
                }
            },
            debug:{
                files:{
                    '../node-red/public/vendor/joint_chart/dist/joint_chart.js':js.core,
                }
            }
        },
        uglify:{
            build:{
                src:'dist/joint_chart.js',
                dest:'dist/joint_chart.min.js'
            }
        }
    });



    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');


    grunt.registerTask('default', ['concat']);
    grunt.registerTask('build', ['concat']);
};
