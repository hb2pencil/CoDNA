CoDNA
=====

Wikipedia Collaboration Visualization

====

The goal of this project is to investigate collaboration in wiki environments.
Currently, we are developing tools to visualize and interact with the edit history of wikipedia articles.

Development Environment
=======================

CoDNA uses grunt.js as a task manager to automate the javascript building, as well as other tasks.
To get set up, make sure that http://nodejs.org/ is installed, and then in a terminal, navigate to ```visualization/js/``` and then run the following command:

```# npm install ```

NPM will automatically fetch all the necessary packages required for buildin the project (specified in package.json).

To build the project, you can run the following command:

```$ grunt```

This will create two files in the visualization/js/build/ directory, one which is the concatenated version of all the source javascript files, and the other is a minified version.  It also generates documentation in the visualization/js/docs folder, which can be viewed in a web browser.

You should also make sure that visualization/lib/config.inc.php has ```$environment``` set to ```'dev'```.  If you are running in a production environment, then you can set it to ```'prod'```
