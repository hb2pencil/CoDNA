// ## Sentences
Sentences = Backbone.Model.extend({

    initialize: function(){

    },
    
    urlRoot: function(){
        return "dbquery.php?sentences=" + this.get('articleId') + "&set=" + this.get('setId');
    },

    defaults: {
        articleId: 0,
        setId: 0,
        revisions: {},
        sentences: {}, // Used for storing unique sentences so that duplicates are not in revisions wasting space
        users: {}, // Used for storing unique users so that duplicates are not in revisions wasting space
    }

});
