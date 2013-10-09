// ## WikiViz
WikiViz = Backbone.Model.extend({

    initialize: function(){
        // Create a fetch a new WikiVizData
        var data = null;
        if(this.get('user') != ""){
            data = new WikiVizData({user: this.get('user'), wikiviz: this});
        }
        else if(this.get('title') != ""){
            data = new WikiVizData({title: this.get('title'), wikiviz: this});
        }
        // The weights for computing the weighted-splitting of visualization bars.
        this.set('weights', {
            add: 60,
            remove: 60,
            edit: 20,
            reorganize: 40,
            vand: 10,
            unvand: 10,
            cite: 20,
            unclassified: 60
        });
        this.set('view', {});
        data.fetch();
        this.set('data', data);
        this.on("change:numDots", function(){
            // Make sure numDots is at least 1
            this.set('numDots', Math.max(1, this.get('numDots')));
        });
        this.on("change:numBars", function(){
            // Make sure numBars is at least 1
            this.set('numBars', Math.max(1, this.get('numBars')));
        });
    },
    
    // Get a list of the user's groups ('higher-level groups') at the present time.
    // So far, this will always return one group, but we can expand on this later.
    getGroupsByName: function(username) {
        var users = this.get('data').get('users');
        // If we don't have data for this user (for whatever reason), assume no groups.
        if(!users.hasOwnProperty(username)) return ['None'];
        if(!users[username].history[users[username].history.length-1]) return ['None'];
        return users[username].history[users[username].history.length-1].userclass;
    },
    
    // Get index of element in revision data, or -1 if it doesn't exist
    index: function(d){
        return d.id;
    },
    
    // Get index of element in talk page data, or -1 if it doesn't exist
    tIndex: function(d){
        return d.id;
    },
    
    // Determine the higher-level group that a given article-revision belongs to.
    getRevisionGroup: function(rev){
        // First, grab a list of our users.
        var users = this.get('data').get('users');
    
        // If the user is unknown, assume that the user is annonymous.
        if (!rev.user in users) return 'Anon';
    
        // Otherwise, we look up out user.
        var user = users[rev.user];
    
        // If we encountered an error reading the user, assume anon.
        if (!user) return 'Anon';
    
        // If the user is flagged, use result of most recent permission query throughout!
        if (user.flagged) {
            return user.history[user.history.length-1].userclass;
        }
    
        // If user has empty history array, assume anon.
        if (user.history.length < 1) { return 'Anon'; }
    
        // Find closest user permissions entry without going over the revision date
        var revDate = new Date(rev.timestamp);
    
        var i = 1;
    
        var lastEntry = user.history[0];
    
        while(i < user.history.length) {
            if (new Date(user.history[i].timestamp) > revDate) break;
            lastEntry = user.history[i];
            ++i;
        }
    
        // lastEntry now contains the relevant permission entry.
        // Return the userclass and we are done.
        return lastEntry.userclass;
    },
    
    timeX: d3.time.scale(),
    
    defaults: {
        title: "",
        user: "",
        data: null,
        // Width and height of view area
        width: 910,
        height: 500,
        // Default number of bars / screen to display in adjacent spacing mode
        numBars: 60,
        // Width of the mask for the y-axis labels
        maskWidth: 50,
        // UNUSED: Used to be used for generating "time offset" calues in data annotation.
        timeMultiplier: 1,
        isTimeSpaced: false,
        weights: null,
        mode: 'art',
        view: null,
    }

});

WikiVizData = Backbone.Model.extend({
    
    initialize: function(){
        this.on('sync', this.augment, this);
    },
    
    // Augment (or annotate) data with useful log(lev) and weighted classification data.
    // In short, this function generates and attaches additional descriptive data to the data downloaded from the DB.
    augment: function(){
        // Useful function to check if a string contain a substring.
        function strcontains(needle, haystack) {
            return haystack.indexOf(needle) != -1;
        }
    
        $.each(this.get('talk'), $.proxy(function(i, te) {
            te.date = new Date(te.timestamp);
            te.loglev = Math.log(te.lev + 1);
            te.user = te.contributor;
            te.type = 'talk';
            te.id = i;
            te.group = this.get('wikiviz').getRevisionGroup(te);
        }, this));
    
        // Loop over each revision, making annotations as necessary.
        $.each(this.get('revisions'), $.proxy(function(i, rev) {
            // Split up the edit by its classification and the classification weights
            // 
            // Will eventually hold the formatted info for drawing.
            var wclass = {    
                add: 0,
                remove: 0,
                edit: 0,
                reorganize: 0,
                cite: 0,
                vand: 0,
                unvand: 0,
                unsure: 0,
                unclassified: 0
            };
        
            // Perform a weighted-separation of our article revision edit distance.
            if (strcontains('a', rev['class'])) {
                wclass.edit += this.get('wikiviz').get('weights').edit;
            }
            if (strcontains('b', rev['class'])) {
                wclass.add += this.get('wikiviz').get('weights').add;
            }
            if (strcontains('c', rev['class'])) {
                wclass.remove += this.get('wikiviz').get('weights').remove;
            }
            if (strcontains('d', rev['class'])) {
                wclass.reorganize += this.get('wikiviz').get('weights').reorganize;
            }
            if (strcontains('e', rev['class'])) {
                wclass.cite += this.get('wikiviz').get('weights').cite;
            }
            if (strcontains('f', rev['class'])) {
                wclass.vand += this.get('wikiviz').get('weights').vand;
            }
            if (strcontains('g', rev['class'])) {
                wclass.unvand += this.get('wikiviz').get('weights').unvand;
            }
            if (strcontains('x', rev['class'])) {
                wclass.unclassified += this.get('wikiviz').get('weights').unclassified;
            }
        
            var wsum = 0;
            for (c in wclass) {
                wsum += wclass[c];
            }
            if (wsum != 0) {
                for (c in wclass) {
                    // NOTE: We NEED the '+' before rev.lev to convert it into a number (from a string!)
                    wclass[c] = wclass[c] * Math.log(+rev.lev+1) / wsum;
                }
            }
        
            if (wsum === 0) {
                wclass.unsure = Math.log(rev.lev + 1);
            }
            rev.revid = rev.rev_id;
        
            rev.wclass = wclass;
            rev.loglev = Math.log(+rev.lev + 1);
            rev.date = new Date(rev.timestamp);
        
            // Add the time-dependent user-class classification
            rev.group = this.get('wikiviz').getRevisionGroup(rev);
        
            rev.type='art';
        
            rev.id = i;
        }, this));
    },
    
    urlRoot: function(){
        if(this.get('title') != ""){
            return "dbquery.php?" + "lower=0&upper=10000&article=" + encodeURIComponent(this.get('title'));
        }
        else if(this.get('user') != ""){
            return "dbquery.php?" + "user=" + encodeURIComponent(this.get('user'));
        }
    },
    
    defaults: {
        title: "",
        user: "",
        wikiviz: null,
        users: [],
        revisions: []
    }
    
});
