// ## Sentences
Sentences = Backbone.Model.extend({

    initialize: function(){

    },
    
    urlRoot: function(){
        return "dbquery.php?sentences=" + this.get('articleId') + "&set=" + this.get('setId');
    },
    
    // Returns an Array containing all of the unique Section titles
    // It will be ordered based on the time of creation
    getSections: function(){
        var sections = new Array();
        _.each(this.get('revisions'), $.proxy(function(rev){
            _.each(rev, $.proxy(function(sec, sectText){
                sections[sectText] = true;
            }, this));
        }, this));
        return _.keys(sections);
    },

    defaults: {
        articleId: 0,
        setId: 0,
        revisions: {},
        sentences: {}, // Used for storing unique sentences so that duplicates are not in revisions wasting space
        users: {}, // Used for storing unique users so that duplicates are not in revisions wasting space
    }

});
