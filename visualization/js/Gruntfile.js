/*global module:false*/
module.exports = function(grunt) {

  var meta = {
    banner: 
      '//     <%= pkg.title || pkg.name %> <%= pkg.version %>' + '\n' +
      '//     (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>' + '\n' +
      '//     <%= pkg.homepage ? "" + pkg.homepage + "" : "" %>' + '\n' +
      '//     Released under <%= _.pluck(pkg.licenses, "type").join(", ") %> License' + '\n',
    pre: '\n(function(window, document, undefined){\n\n',
    post: '\n})(window,document);'
  };

  // Project configuration.
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
        src: [
          'src/Models/*.js',
          'src/Views/*.js',
          'src/helpers.js',
          'src/router.js'
        ],
        dest: 'build/<%= pkg.name %>.js'
      },
      options:{
        banner: meta.banner + meta.pre,
        footer: meta.post,
      }
    },
    uglify: {
      dist: {
        src: ['<%= concat.dist.dest %>'],
        dest: 'build/<%= pkg.name %>.min.js'
      },
      options: {
        banner: meta.banner,
        report: 'min'
      }
    },
    docco: {
      src: ['build/<%= pkg.name %>.js'],
      options: {
        output: 'docs/'
      }
    }
  });

  // Load tasks
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-docco2');

  // Default task.
  grunt.registerTask('build', ['concat', 'uglify', 'docco']);
  grunt.registerTask('default', ['build']);

};
