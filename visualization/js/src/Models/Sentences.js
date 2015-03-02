var defaultLimit = 200;

// ## Sentences
Sentences = Backbone.Model.extend({

    initialize: function(){

    },
    
    urlRoot: function(){
        return "dbquery.php?sentences=" + this.get('articleId') + 
               "&set=" + this.get('setId') + 
               "&start=" + this.get('start') + 
               "&limit=" + this.get('limit');
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
    
    // Zooms in the y-axis
    zoomIn: function(amount){
        this.set('zoomLevel', Math.min(10, this.get('zoomLevel')*amount));
    },
    
    // Zooms out the y-axis
    zoomOut: function(amount){
        this.set('zoomLevel', Math.max(1, this.get('zoomLevel')*amount));
    },
    
    // Loads the previous 'limit' revisions
    prev: function(){
        this.set('limit', defaultLimit);
        this.set('start', Math.max(0, this.get('start') - this.get('limit')));
        this.trigger("changePos");
        this.fetch();
    },
    
    // Loads all of the revisions
    showAll: function(){
        this.set('start', 0);
        this.set('limit', this.get('nRevisions'));
        this.trigger("changePos");
        this.fetch();
    },
    
    // Loads the next 'limit' revisions
    next: function(){
        this.set('limit', defaultLimit);
        this.set('start', Math.min(this.get('nRevisions') - this.get('limit'), this.get('start') + this.get('limit')));
        this.trigger("changePos");
        this.fetch();
    },

    defaults: {
        articleId: 0,
        nRevisions: 0,
        setId: 0,
        start: 0,
        limit: defaultLimit,
        revisions: {},
        sentences: {}, // Used for storing unique sentences so that duplicates are not in revisions wasting space
        users: {}, // Used for storing unique users so that duplicates are not in revisions wasting space
        revUsers: {}, // The users who edited each revision
        dates: {}, // Dates when the revisions occured
        zoomLevel: 1 // Y-Scale zoom
    }

});
