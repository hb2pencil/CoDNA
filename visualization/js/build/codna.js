//     CoDNA 0.1.0
//     (c) 2013 Henry Brausen, David Turner
//     https://github.com/hb2pencil/CoDNA
//     Released under GPLv2 License

(function(window, document, undefined){

// ## Article
Article = Backbone.Model.extend({

    initialize: function(){
    
    },
    
    urlRoot: "",
    
    defaults: {
        title: "",
        rev_count: 0,
        set: 1,
        display: true
    }

});

// ## ArticleCollection
ArticleCollection = Backbone.Collection.extend({
    
    model: Article,
    
    url: function(){
        return "dbquery.php?list";
    }
    
});

// ## ArticleSet
ArticleSet = Backbone.Model.extend({

    initialize: function(){
    
    },
    
    urlRoot: "",
    
    defaults: {
        id: null,
        name: "",
        url: "",
        count: 0
    }

});

// ## ArticleSetCollection
ArticleSetCollection = Backbone.Collection.extend({
    
    model: ArticleSet,
    
    url: "dbquery.php?listArticleSets"
    
});

// ## TopTab
TopTab = Backbone.Model.extend({

    initialize: function(){
        this.on('change:selected', function(){
            if(topTabs.getSelected() == this){
                $("#content").html(this.content);
            }
            else{
                this.content = this.get('mainView').$el.detach();
            }
            // Close any dialogs which are open
            $(".ui-dialog-content").dialog('close');
        }, this);
        this.get('mainView').render();
    },
    
    defaults: {
        type: "tab",
        color: "#CFECAD",
        hoverColor: "#BDD99E",
        title: "",
        selected: false,
        x: Number.MAX_VALUE/2,
        mainView: null
    }

});

// ## NewTopTab 
// (used for a "+" button to create a new tab)
NewTopTab = TopTab.extend({

    initialize: function(){
        
    },
    
    defaults: {
        type: "new",
        color: "#EEEEEE",
        hoverColor: "#DDDDDD",
        title: "<b>&#10133;</b>",
        selected: false,
        x: Number.MAX_VALUE,
        mainView: null,
    }

});

// ## TopTabCollection
TopTabCollection = Backbone.Collection.extend({
    
    // Comparator is the x coordinate of the tab.
    // Tabs of type 'new' should be treates specially, and always be at the end
    comparator: function(tab){
        if(tab.get('type') == 'new'){
            return Number.MAX_VALUE;
        }
        return tab.get('x');
    },
    
    // Returns the currently selected tab
    getSelected: function(){
        return this.findWhere({'selected': true});
    },
    
    model: TopTab
    
});

// ## User
User = Backbone.Model.extend({

    initialize: function(){

    },
    
    urlRoot: function(){
        return "dbquery.php?users&id=" + this.get('id');
    },
    
    defaults: {
        id: 0,
        name: "",
        histid: "",
        flagged: 0,
        edits: 0,
        created: "",
        display: true
    }

});

// ## UserCollection
UserCollection = Backbone.Collection.extend({

    model: User,
    
    url: "dbquery.php?users"

});

// ## UserSet
UserSet = Backbone.Model.extend({

    initialize: function(){
    
    },
    
    urlRoot: "",
    
    defaults: {
        id: null,
        name: "",
        url: "",
        count: 0
    }

});

// ## UserSetCollection
UserSetCollection = Backbone.Collection.extend({
    
    model: UserSet,
    
    url: "dbquery.php?listUserSets"
    
});

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
        revisions: [],
        quality: [],
        events: [],
        google: []
    }
    
});

ArticleInfoView = Backbone.View.extend({

    initialize: function(options){
        this.article = options.article;
        this.listenTo(this.model, "sync", this.render);
        this.listenTo(this.model.get('data'), "sync", this.render);
        this.template = _.template($("#article_info_template").html());
    },
    
    render: function(){
        this.$el.html(this.template(_.extend(this.article.toJSON(), this.model.toJSON())));
        this.$el.attr('id', "article_info");
        return this.$el;
    }

});

// ## ArticleView
ArticleView = Backbone.View.extend({
    
    template: _.template($("#article_container_template").html()),
    wikiviz: null,
    navctl: null,
    
    initialize: function(){
        this.wikiviz = new WikiViz({title: this.model.get('title')});
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
        Backbone.Subviews.add(this);
    },
    
    subviewCreators : {
        "article_info": function(){
            return new ArticleInfoView({model: this.wikiviz, article: this.model});
        },
        "toolbar": function(){
            return new ToolbarView({model: {'buttons': ['select','sections','data','legend','deselect','talk']}, view: this});
        }
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.viz = new WikiVizView({model: this.wikiviz, view: this, el: this.el});
        this.viz.init(this.model.get('title'));
        return this.$el;
    }
    
});

// ## DialogView
DialogView = Backbone.View.extend({
    
    // Reference to the jQueryUI Dialog
    dialog: null,
    // Options object for the dialog
    options: null,
    // Function to be called after the dialog is created
    onCreate: function(){},
    firstRender: true,

    initialize: function(options){
        this.template = _.template($("#" + options.template).html());
        this.options = options.options;
        if(_.isFunction(options.onCreate)){
            this.onCreate = options.onCreate;
        }
    },
    
    // Displays the dialog
    open: function(){
        this.dialog.dialog('open');
    },
    
    // Closes the dialog
    close: function(){
        this.dialog.dialog('close');
    },
    
    render: function(){
        if(this.firstRender){
            this.$el.html(this.template());  
            this.dialog = this.$el.children().dialog(this.options);
            this.onCreate(this.dialog);
        }
        this.firstRender = false;
        return this.$el; 
    }

});

// ## NavCtlView
NavCtlView = Backbone.View.extend({

    article: null,

    initialize: function(options){
        this.viz = options.viz;
        this.listenTo(this.viz.model, "change:mode", this.changeMode);
        $(window).resize($.proxy(function(){
            if(this.viz.$("#navctl").width() > 0){
                this.init(this.viz.$("#navctl").width(), this.dim.h);
            }
        }, this));
    },
    
    // Adjust the slider when we switch to time-spaced mode.
    // Use a new time-spaced scale for display.
    toTimeSpaced: function() {
    
        var minDate = _.first(this.viz.model.get('data').get('revisions')).date;
    
        this.xscale = d3.time.scale();
        // Todo: domain of talk entries may exceed revisions
        this.xscale.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
            _.last(this.viz.model.get('data').get('revisions')).date]);
        this.xscale.rangeRound([0, this.dim.w - 2*this.handleWidth]);
    
        var that = this;
    
        this.bg.select('g.navbars').selectAll('rect.sd').data(this.viz.model.get('data').get('revisions'))
            .attr('x', function(d,i) { return that.xscale(d.date); })
            .attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
            .attr('width', function(d,i) { return that.spikewidth; })
            .attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
            .attr('class', 'sd');
        
        this.bg.select('g.navbars').selectAll('circle.tcircle').data(this.viz.model.get('data').get('talk'))
            .attr('cx', function(d) { return that.xscale(d.date); });
    
        this.onSlide();
        this.onScale();
    },

    // When we switch to adjacent-spaced mode, switch back to using a linear scale for display.
    toAdjacentSpaced: function() {
        this.xscale = d3.scale.linear();
        if (this.viz.model.get('mode') == 'talk')
            this.xscale.domain([0, this.viz.model.get('data').get('talk').length-1]);
        else
            this.xscale.domain([0, this.viz.model.get('data').get('revisions').length-1]);
        
        this.xscale.rangeRound([0, this.dim.w - 2*this.handleWidth]);
    
        var that = this;
    
        this.bg.select('g.navbars').selectAll('rect.sd').data(this.viz.model.get('data').get('revisions'))
            .attr('x', function(d,i) { return that.xscale(i); })
            .attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
            .attr('width', function(d,i) { return that.spikewidth; })
            .attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
            .attr('class', 'sd');
        
        this.bg.select('g.navbars').selectAll('circle').data(this.viz.model.get('data').get('talk'))
            .attr('cx', function(d, i) { return that.xscale(i); });
    
        this.onSlide();
        this.onScale();
    },
    
    // Change the apperance of the navctl based on the current mode
    changeMode: function(){
        if(this.viz.model.get('mode') == 'art'){
            this.bg.select('g.navbars').selectAll('.sd').attr('opacity', 1);
            this.bg.select('g.navbars').selectAll('circle.tcircle').attr('opacity', 0);
        }
        else if(this.viz.model.get('mode') == 'talk'){
            this.bg.select('g.navbars').selectAll('.sd').attr('opacity', 0);
            this.bg.select('g.navbars').selectAll('.tcircle').attr('opacity', 1);
        }
        else if(this.viz.model.get('mode') == 'hybrid'){
            this.bg.select('g.navbars').selectAll('.sd').attr('opacity', 1);
            this.bg.select('g.navbars').selectAll('.tcircle').attr('opacity', 1);
        }
        this.onScale();
    },

    // Slide the view when we slide the slider.
    onSlide: function() {
        d3.select(this.viz.$('g.body')[0]).attr('transform', 'translate(' + -Math.round(this.getPanOffset()) + ',0)');
        this.viz.repositionBar();
    },

    // Increase/Decrease the range of the chart
    onScale: function() {
        if (!this.viz.model.get('isTimeSpaced') && this.viz.model.get('mode') == 'art') {
            this.viz.model.set('numBars', this.getNumBars());
        }
        else if (!this.viz.model.get('isTimeSpaced') && this.viz.model.get('mode') == 'talk') {
            this.viz.model.set('numDots', this.getNumBars());
        }
        else if (this.viz.model.get('isTimeSpaced')) {
            var df = _.last(this.viz.model.get('data').get('revisions')).date;
            var d0 = _.first(this.viz.model.get('data').get('revisions')).date;
            var d1 = this.xscale.invert(this.sdim.x0);
            var d2 = this.xscale.invert(this.sdim.x0+this.sdim.w-this.handleWidth);
        
            // The multiplier 0.9 is a quick fix for getting the rightmost bars in TS mode visible.
            this.viz.model.timeX.rangeRound([0, 0.9*this.viz.model.get('width') * (df-d0) / (d2 - d1)]);
            this.viz.toTimeSpaced();
        }
    },

    // Map slider motion to an offset by which to pan the main view. Behaves differently for time and adjacent spaced modes.
    getPanOffset: function() {
        try{
            if (!this.viz.model.get('isTimeSpaced') && this.viz.model.get('mode') == 'art') {
                return ((this.sdim.x0) / (this.dim.w - 2*this.handleWidth))*(this.viz.model.get('data').get('revisions').length*this.viz.calcBarWidth());
            }
            else if (!this.viz.model.get('isTimeSpaced') && this.viz.model.get('mode') == 'talk') {
                return ((this.sdim.x0) / (this.dim.w - 2*this.handleWidth))*(this.viz.model.get('data').get('talk').length*this.viz.calcTalkWidth());
            }
            else if (this.viz.model.get('isTimeSpaced')) {
                return this.viz.model.timeX(this.xscale.invert(this.sdim.x0));
            }
        }
        catch(e){}
        return 0;
    },

    getNumBars: function() {
        return this.xscale.invert(this.sdim.x0+this.sdim.w-this.handleWidth) - this.xscale.invert(this.sdim.x0);
    },

    getTimeRange: function() {
    
    },
    
    init: function(sw, sh) {
        this.viz.$('#navctl').empty();
        // Scrollbar dimensions
        this.dim = {w: sw, h: sh};
    
        this.sdim = {x0: 0, w: 100};
    
        // Create the SVG element for the scrollbar
        this.svg = d3.select(this.viz.$('#navctl')[0]).append('svg').attr('width', this.dim.w).attr('height', this.dim.h);
        this.svg.attr("viewBox", "0 0 " + sw + " " + sh);
        // Make a background layer
        this.bg = this.svg.append('g').attr('class', 'bg');
        var handleWidth = this.dim.h/2;
        // Create handles (semi-circles)
        this.bg.append('path').attr('d','M' + handleWidth + ',0 A' + handleWidth + ',' + handleWidth + ' 0 0,0 ' + handleWidth + ',' + handleWidth * 2 ).attr('class', 'pad').attr('width', handleWidth).attr('height', this.dim.h);
        this.bg.append('path').attr('d','M0,0 A' + handleWidth + ',' + handleWidth + ' 0 0,1 0,' + handleWidth * 2).attr('class', 'pad').attr('width', handleWidth).attr('height', this.dim.h).attr('transform', 'translate('+ (this.dim.w - handleWidth) + ',0)');
    
        this.bg.append('g').attr('class', 'navbars').attr('x', handleWidth).attr('transform', 'translate(' + handleWidth + ',' + this.dim.h / 2 + ')scale(1,-1)');
    
        this.bg.select('g.navbars').append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', this.dim.w-2*handleWidth)
            .attr('y2', 0);

        this.bg.select('g.navbars').append('line')
            .attr('class','navctlborder')
            .attr('x1', 0)
            .attr('y1', handleWidth)
            .attr('x2', this.dim.w-2*handleWidth)
            .attr('y2', handleWidth);

        this.bg.select('g.navbars').append('line')
            .attr('class','navctlborder')
            .attr('x1', 0)
            .attr('y1', -handleWidth)
            .attr('x2', this.dim.w-2*handleWidth)
            .attr('y2', -handleWidth);
    
        // Slider group
        this.slider = this.svg.append('g').attr('class', 'slider');
        this.slider.append('rect').attr('class', 'chandle').attr('width', this.sdim.w-handleWidth).attr('height', this.dim.h).attr('x', this.sdim.x0 + handleWidth);
        this.slider.append('g').attr('class', 'lhandlegrp').attr('transform', 'translate(' + (this.sdim.x0) + ',0)').append('path').attr('d','M' + handleWidth + ',0 A' + handleWidth + ',' + handleWidth + ' 0 0,0 ' + handleWidth + ',' + handleWidth * 2 ).attr('class', 'lhandle').attr('width', handleWidth).attr('height', this.dim.h);
        this.slider.append('g').attr('class', 'rhandlegrp').attr('transform', 'translate(' + (this.sdim.x0 + this.sdim.w) + ',0)').append('path').attr('d','M0,0 A' + handleWidth + ',' + handleWidth + ' 0 0,1 0,' + handleWidth * 2).attr('class', 'rhandle').attr('width', handleWidth).attr('height', this.dim.h);
    
        this.xscale = d3.scale.linear();
        this.xscale.domain([0, this.viz.model.get('data').get('revisions').length-1]);
        this.xscale.rangeRound([0, this.dim.w - 2*handleWidth]);
    
        this.yscale = d3.scale.linear();
        this.yscale.domain(this.viz.model.get('view').y.domain());
        this.yscale.rangeRound([0, this.dim.h/2]);
    
        var that = this;
    
        this.spikewidth = (this.dim.w-2*handleWidth) / this.viz.model.get('data').get('revisions').length;
    
        this.spikes = this.bg.select('g.navbars').selectAll('rect.sd').data(this.viz.model.get('data').get('revisions'));
        this.spikes.enter().append('rect')
            .attr('x', function(d,i) { return that.xscale(i); })
            .attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
            .attr('width', function(d,i) { return that.spikewidth; })
            .attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
            .attr('class', 'sd');
        
        // Draw talk page entries, need to manually keep this in sync with appendCallout for now
    
        this.dots = this.bg.select('g.navbars').selectAll('circle.td').data(this.viz.model.get('data').get('talk')).enter().append('circle')
            .attr('class', 'td');

        // Max circle radius
        var maxR = 5;
        var fact = 0.6;

        // Append circle to our element. Cap the circle size and re-style the circle if it has reached the cap.
        this.dots.filter(function(d) { return Math.log(d.lev+1)*fact <= maxR; }).attr('r', function(d) { return Math.log(d.lev+1)*fact; }).attr('class', 'tcircle');
        this.dots.filter(function(d) { return Math.log(d.lev+1)*fact > maxR; }).attr('r', maxR).attr('class', 'tcircle_full');
    
        this.sd = { dx: 0 };
    
        // Event handlers for the slider
        // The slider "dragging" state is stored as a CSS class.
        this.viz.$('.chandle').mousedown(function(event) {
            $(this).addClass('dragging');
            that.sd.dx = event.pageX - that.sdim.x0;
            event.preventDefault();
        });
        this.viz.$('.lhandle').mousedown(function(event) {
            $(this).addClass('dragging');
            that.sd.dx = event.pageX - that.sdim.x0;
            event.preventDefault();
        });
        this.viz.$('.rhandle').mousedown(function(event) {
            $(this).addClass('dragging');
            that.sd.dx = event.pageX;
            event.preventDefault();
        });
    
        // More event handlers. These deal with dragging the slider.
        $(document).mousemove($.proxy(function(event) {
            if (this.viz.$('.rhandle').hasClass('dragging')) {
                var dw = (event.pageX - this.sd.dx);
                this.sd.dx = event.pageX;
                var newW = +this.sdim.w +dw;
            
                if (newW < handleWidth) newW = handleWidth;
                if (newW + this.sdim.x0 + handleWidth > this.dim.w) newW = this.dim.w-this.sdim.x0-handleWidth;
                this.sdim.w = newW;
                
                this.viz.$('.chandle').attr('width', this.sdim.w - handleWidth);
                this.viz.$('.rhandlegrp').attr('transform', 'translate(' + (+this.sdim.w) + ',0)')
                this.onScale();
                this.onSlide();
            }
            if (this.viz.$('.lhandle').hasClass('dragging')) {
                var newX0 = (event.pageX - this.sd.dx);
                if (newX0 < 0) newX0 = 0;
                if (newX0 > this.sdim.x0 + this.sdim.w - handleWidth) newX0 = this.sdim.x0 + this.sdim.w - handleWidth;
            
                var newW = +this.sdim.w - (+newX0 - +this.sdim.x0);
                if (newW < handleWidth) {
                    newW = handleWidth;
                }
            
                this.sdim.x0 = newX0;
                this.sdim.w = newW;
            
                this.viz.$('.slider').attr('transform', 'translate(' + (this.sdim.x0) + ',0)');
                this.viz.$('.chandle').attr('width', this.sdim.w - handleWidth);
                this.viz.$('.rhandlegrp').attr('transform', 'translate(' + (+this.sdim.w) + ',0)')
                this.onScale();
                this.onSlide();
            }
            if (this.viz.$('.chandle').hasClass('dragging')) {
                this.sdim.x0 = (event.pageX - this.sd.dx);
            
                if (this.sdim.x0 < 0) this.sdim.x0 = 0;
                if (this.sdim.x0 > this.dim.w - ((handleWidth) + this.sdim.w)) this.sdim.x0 = this.dim.w - ((handleWidth) + this.sdim.w);
                this.viz.$('.slider').attr('transform', 'translate(' + (this.sdim.x0) + ',0)');
                this.onSlide();
            }
        }, this));
        // Once the mouse is released, reset the slider "dragging" state.
        $(document).mouseup($.proxy(function() {
            this.viz.$('.chandle').removeClass('dragging');
            this.viz.$('.lhandle').removeClass('dragging');
            this.viz.$('.rhandle').removeClass('dragging');
        }, this));
    
        this.handleWidth = handleWidth;
    
        // Call these to update the slider for the first time.
        this.onSlide();
        this.onScale();
        this.changeMode();
    }
});

// ## NewArticleView
NewArticleView = Backbone.View.extend({    
    
    template: _.template($("#new_article_template").html()),
    views: new Array(),
    
    initialize: function(){
        this.articleSets = new ArticleSetCollection();
        this.userSets = new UserSetCollection();
        this.users = new UserCollection();
        this.articles = new ArticleCollection();
        
        $.when(this.users.fetch(),
               this.articles.fetch(),
               this.articleSets.fetch(),
               this.userSets.fetch()).then($.proxy(function(){this.render();}, this));
        
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
    },
    
    events: {
        "click #initiative .option:not(.disabled)": "clickInitiative",
        "click #set .option": "clickDataSet",
        "click #project .option": "clickProject",
        "click #analyse button": "clickAnalyse",
        "click #clearFilter": "clearFilter",
        "change #filter": "filter",
        "keyup #filter": "filter"
    },
    
    // Returns the selected Article/User, or null if nothing is selected
    getSelected: function(){
        var model = null;
        _.each(this.views, function(view){
            if(view.$el.hasClass('selected')){
                model = view.model;
            }
        });
        return model;
    },
    
    // Clears the contents of the filter
    clearFilter: function(){
        this.$("#filter").attr('value', "");
        this.filter();
    },
    
    // Triggered when one of the options in the initiative list is clicked
    clickInitiative: function(e){
        this.$("#initiative .option").not(e.currentTarget).removeClass('selected');
        $(e.currentTarget).toggleClass('selected');
        if(this.$("#set").css('display') == 'none' &&
           this.$("#initiative .option.selected").length > 0){
            this.renderDataSets();
            this.$("#set").show('slide', 400);
        }
        else if(this.$("#set").css('display') != 'none' && 
                this.$("#initiative .option.selected").length == 0){
            this.$("#set").hide('slide', 400);
            if(this.$("#project").css('display') != 'none'){
                this.$("#project").hide('slide', 400);
                if(this.$("#analyse").css('display') != 'none'){
                    this.$("#analyse").hide('slide', 400);
                }
            }
        }
    },
    
    // Triggered when one of the options in the initiative list is clicked
    clickDataSet: function(e){
        this.$("#set .option").not(e.currentTarget).removeClass('selected');
        $(e.currentTarget).toggleClass('selected');
        if(this.$("#set .option.selected").length > 0){
            var span = this.$("#set .option.selected span");
            if(span.parent().hasClass("article")){
                this.renderProjects(this.articles.where({'set': parseInt(span.attr('name'))}));
            }
            else if(span.parent().hasClass("contributor")){
                this.renderProjects(this.users.where({'set': parseInt(span.attr('name'))}));
            }
            if(this.$("#project").css('display') == 'none'){
                this.$("#project").show('slide', 400);
            }
        }
        else if(this.$("#project").css('display') != 'none' && 
                this.$("#set .option.selected").length == 0){
            this.$("#project").hide('slide', 400);
            if(this.$("#analyse").css('display') != 'none'){
                this.$("#analyse").hide('slide', 400);
            }
        }
    },
    
    // Triggered when one of the options in the project/contributor list is clicked
    clickProject: function(e){
        this.$("#project .option").not(e.currentTarget).removeClass('selected');
        $(e.currentTarget).toggleClass('selected');
        if(this.$("#analyse").css('display') == 'none' &&
           this.$("#project .option.selected").length > 0){
            this.$("#analyse").show('slide', 400);
        }
        else if(this.$("#analyse").css('display') != 'none' && 
                this.$("#project .option.selected").length == 0){
            this.$("#analyse").hide('slide', 400);
        }
    },
    
    // Triggered when the analyse button is clicked
    clickAnalyse: function(e){
        var selected = this.getSelected();
        var view = null;
        var title = "";
        var color = "";
        var hoverColor = "";
        if(selected instanceof Article){
            view = new ArticleView({model: selected});
            title = selected.get('title');
            color = "#ABD1EB";
            hoverColor = "#9EC0D9";
        }
        else if(selected instanceof User){
            view = new UserView({model: selected});
            title = selected.get('name');
            color = "#EEADAD";
            hoverColor = "#EE9898";
        }
        else {
            return;
        }
        topTabs.getSelected().set({
            'title': title,
            'mainView': view,
            'color': color, 
            'hoverColor': hoverColor
        });
        view.render();
        topTabsView.render();
        this.remove();
    },
    
    // Renders the initiatives list
    renderInitiatives: function(){
        if(_.size(this.articles.toJSON()) == 0){
            this.$("#initiative .select").html($("#big_throbber_template").html());
        }
        this.$("#initiative").tabs();
    },
    
    // Renders the projects/contributors data set list
    renderDataSets: function(){
        var artSets = document.createDocumentFragment();
        var userSets = document.createDocumentFragment();
        _.each(this.views, function(view){
            if(view instanceof DataSetView){
                view.remove();
            }
        });
        this.views = new Array();
        _.each(this.articleSets.models, function(article){
            var view = new DataSetView({model: article});
            this.views.push(view);
            artSets.appendChild(view.render()[0]);
        }, this);
        _.each(this.userSets.models, function(user){
            var view = new DataSetView({model: user});
            this.views.push(view);
            userSets.appendChild(view.render()[0]);
        }, this);
        this.$("#set #tabs-project .select").html(artSets);
        this.$("#set #tabs-contributor .select").html(userSets);
        this.$("#set").tabs();
    },
    
    // Renders the projects/contributors list
    renderProjects: function(set){
        var articles = document.createDocumentFragment();
        var users = document.createDocumentFragment();
        _.each(this.views, function(view){
            if(view instanceof ProjectView){
                view.remove();
            }
        });
        this.views = new Array();
        _.each(set, function(article){
            var view = new ProjectView({model: article});
            this.views.push(view);
            articles.appendChild(view.render()[0]);
        }, this);
        this.$("#project #tabs-item .select").html(articles);
        this.$("#project").tabs();
    },
    
    // Filters the options which appear in the selection list
    filter: function(){
        var filterVal = this.$("#filter").val().toLowerCase();
        _.each(this.articles.models, function(article){
            if(article.get('title').toLowerCase().indexOf(filterVal) != -1){
                article.set('display', true);
            }
            else{
                article.set('display', false);
            }
        });
        _.each(this.users.models, function(user){
            if(user.get('name').toLowerCase().indexOf(filterVal) != -1){
                user.set('display', true);
            }
            else{
                user.set('display', false);
            }
        });
    },
    
    render: function(){
        this.$el.html(this.template({'count': _.size(this.articles.toJSON())}));
        this.renderInitiatives();
	    return this.$el;
	}
});

// ## DataSetView
DataSetView = Backbone.View.extend({

    template: _.template($("#dataset_option_template").html()),

    initialize: function(){
        this.listenTo(this.model, 'change', this.render);
        this.$el.addClass("option");
        if(this.model instanceof UserSet){
            this.$el.addClass("contributor");
        }
        else if(this.model instanceof ArticleSet){
            this.$el.addClass("article");
        }
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        return this.$el;
    }

});

// ## ProjectView
ProjectView = Backbone.View.extend({

    article_template: _.template($("#article_option_template").html()),
    user_template: _.template($("#user_option_template").html()),

    initialize: function(){
        if(this.model instanceof Article){
            this.template = this.article_template;
        }
        else if(this.model instanceof User){
            this.template = this.user_template;
        }
        this.listenTo(this.model, 'change', this.render);
        this.$el.addClass("option");
    },
    
    render: function(){
        if(this.model.get('display')){
            this.$el.css('display', 'block');
            this.$el.html(this.template(this.model.toJSON()));
        }
        else{
            this.$el.css('display', 'none');
        }
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = "//www.google.ca/trends/embed.js?hl=en-US&q=Peter+Jackson&cmpt=q&content=1&cid=TIMESERIES_GRAPH_0&export=5&w=1000&h=330";
        this.$("#google").append(script);
        return this.$el;
    }

});

// ## ToolbarView
ToolbarView = Backbone.View.extend({

    initialize: function(options){
        this.template = _.template($("#toolbar_template").html());
        Backbone.Subviews.add(this);
        this.view = options.view;
    },
    
    subviewCreators:{
        "diag_cursor" : function(){
            return new DialogView({
                template: "diag_cursor_template",
                options: {
                    autoOpen: false,
                    width: 'auto',
                    resizable: false
                }
            });
        },
        "diag_options": function(){
            return new DialogView({
                template: "diag_options_template",
                options: {
                    autoOpen: false,
                    resizable: false
                }
            });
        },
        "diag_select": function(){
            var wikiviz = this.view.wikiviz;
            var article = this.view;
            return new DialogView({
                template: "diag_select_template",
                options: {
                    autoOpen: false,
                    width: 400,
                    resizable: false
                },
                onCreate: function(dialog){
                    $('#select_apply', dialog).button();
                    $('#d_select_tabs', dialog).tabs();
                    $('#d_select_groups_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // User group selection functionality.
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            var that = $(this);
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 1);
                            // Checkbox was unchecked
                            } else {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 0.2);
                            }
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                    // Bind functionality to the select users dialog
                    // Note that the "Select By Group" checkboxes make changes to the selection
                    // in the Select By User list, so we really only need to grab the input from the select
                    // by user list.
                    $('input[name=userclassselect]', dialog).each(function (i,e) {
                        $(e).change(function () {
                            // Gather choices
                            var filt = Array();
                            $('input[name=userclassselect]:checked', dialog).each(function(i, el) {
                                filt.push($(el).val());
                            });
                            // Use choices to generate selection in Select By User
                            // User names are stored in the "value" property of the options in the select element.
                            $('#userselect option', dialog).each(function(i, e) {
                                if (Helper.isSubset([wikiviz.getGroupsByName($(e).val())], filt)) {
                                    $(e).attr('selected', true);
                                } else {
                                    $(e).attr('selected', false);
                                }
                                // Force visual update on stubborn browsers (Chrome !!!)
                                $(e).addClass('invisible');
                                $(e).removeClass('invisible');
                            });
                        });
                    });
                    // Clicking "Apply User Selection"
                    $('#select_apply', dialog).click(function() {
                        var users = Array();
                        $('#userselect option:selected', dialog).each(function() { users.push($(this).val()); });
                        article.viz.applyUserSelection(users);
                    });
                }
            });
        },
        "diag_articles": function(){
            var wikiviz = this.view.wikiviz;
            var article = this.view;
            return new DialogView({
                template: "diag_articles_template",
                options: {
                    autoOpen: false,
                    width: 400,
                    resizable: false
                },
                onCreate: function(dialog){
                    $('#select_apply', dialog).button();
                    $('#d_select_tabs', dialog).tabs();
                    $('#d_select_groups_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // User group selection functionality.
                    $('#d_select_groups_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            var that = $(this);
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 1);
                            // Checkbox was unchecked
                            } else {
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 0.2);
                            }
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                    // Bind functionality to the select users dialog
                    // Note that the "Select By Group" checkboxes make changes to the selection
                    // in the Select By User list, so we really only need to grab the input from the select
                    // by user list.
                    $('input[name=userclassselect]', dialog).each(function (i,e) {
                        $(e).change(function () {
                            // Gather choices
                            var filt = Array();
                            $('input[name=userclassselect]:checked', dialog).each(function(i, el) {
                                filt.push($(el).val());
                            });
                            // Use choices to generate selection in Select By User
                            // User names are stored in the "value" property of the options in the select element.
                            $('#userselect option', dialog).each(function(i, e) {
                                if (Helper.isSubset([wikiviz.getGroupsByName($(e).val())], filt)) {
                                    $(e).attr('selected', true);
                                } else {
                                    $(e).attr('selected', false);
                                }
                                // Force visual update on stubborn browsers (Chrome !!!)
                                $(e).addClass('invisible');
                                $(e).removeClass('invisible');
                            });
                        });
                    });
                    // Clicking "Apply User Selection"
                    $('#select_apply', dialog).click(function() {
                        var users = Array();
                        $('#userselect option:selected', dialog).each(function() { users.push($(this).val()); });
                        article.viz.applyUserSelection(users);
                    });
                }
            });
        },
        "diag_sections": function(){
            return new DialogView({
                template: "diag_sections_template",
                options: {
                    autoOpen: false,
                    width: 400,
                    resizable: false
                }
            });
        },
        "diag_info": function(){
            return new DialogView({
                template: "diag_info_template",
                options: {
                    autoOpen: false,
                    resizable: false,
                    width: 400
                }
            });
        },
        "diag_data": function(){
            return new DialogView({
                template: "diag_data_template",
                options: {
                    autoOpen: false,
                    resizable: true,
                    width: 800,
                    height: 600
                }
            });
        },
        "diag_legend": function(){
            var wikiviz = this.view.wikiviz;
            var article = this.view;
            return new DialogView({
                template: "diag_legend_template",
                options: {
                    autoOpen: false,
                    resizable: false,
                    height: 'auto',
                    width: 400
                },
                onCreate: function(dialog){
                    $('#d_legend_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('.d_checkable h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // Mapping from checkbox value to visualization rectangle classes
                    var classMap = {
                        addrem: ['add', 'remove'],
                        edit: ['edit'],
                        reorganize: ['reorganize'],
                        cite: ['cite'],
                        unsure: ['unsure'],
                        vandunvand: ['vand', 'unvand']
                    };
                
                    // Legend selection functionality (by varyng opacity)
                    $('#d_legend_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                for (var i in classMap[$(this).val()]) {
                                    wikiviz.get('view').data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 1);
                                }
                            // Checkbox was unchecked
                            } else {
                                for (var i in classMap[$(this).val()]) {
                                    wikiviz.get('view').data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 0.2);
                                }
                            }
                        
                            var selected = new Array();
                            $('#d_legend_accordion input:checked', dialog).each(function(i, v) {
                                $.merge(selected, classMap[$(v).val()]);
                            });
                        
                            article.viz.navctl.bg.selectAll('rect').transition().duration(500).attr('opacity',
                                function(d) {
                                    var found = 0.2;
                                    $(selected).each(
                                        function(i, v) {
                                            if (d.wclass[v]) {
                                                found = 1;
                                                return 1;
                                            }
                                        }
                                    );
                                    return found;
                                }
                            );
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                }
            });
        },
        "diag_talk": function(){
            return new DialogView({
                template: "diag_talk_template",
                options: {
                    autoOpen: false,
                    resizable: false,
                    height: 'auto',
                    width: 400
                },
                onCreate: function(dialog){
                    $('#d_talk_accordion', dialog).accordion({
                        collapsible: true,
                        active: false,
                        autoHeight: false,
                        clearStyle: true
                    });
                    // Allow checkbox to capture click events (otherwise the accordion will do so)
                    $('.d_checkable h3', dialog).each(function (i, el) {
                        $(el).find('input').click(function(e) {
                            e.stopPropagation();
                        });
                    });
                    // Talk page revision selection functionality.
                    // TODO: Make the "callouts" fade out if all of the contained elements are faded out.
                    $('#d_talk_accordion h3', dialog).each(function (i, el) {
                        $(el).find('input').change(function(e) {
                            var that = $(this);
                            // If the event is the checking of a checkbox
                            if ($(this).attr('checked')) {
                                d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 1);
                            // Checkbox was unchecked
                            } else {
                                d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 0.2);
                            }
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                }
            });
        }
    },
    
    // Init the buttons on the toolbar.
    createToolbar: function() {
        $('#t_cursor').button({
            icons: {
                primary: 'ui-icon-arrow-1-ne'
            },
            text: false
        });
        $('#t_options').button({
            icons: {
                primary: 'ui-icon-gear'
            },
            text: false
        });
        this.$('#t_select').button({
            icons: {
                primary: 'icon-users'
            },
            text: false
        });
        this.$('#t_articles').button({
            icons: {
                primary: 'icon-articles'
            },
            text: false
        });
        this.$('#t_sections').button({
            icons: {
                primary: 'icon-sections'
            },
            text: false
        });
        $('#t_info').button({
            icons: {
                primary: 'ui-icon-info'
            },
            text: false
        });
        this.$('#t_data').button({
            icons: {
                primary: 'icon-table'
            },
            text: false
        });
        this.$('#t_legend').button({
            icons: {
                primary: 'icon-categories'
            },
            text: false
        });
        this.$('#t_deselect').button({
            icons: {
                primary: 'icon-deselect'
            },
            text: false,
            disabled: true
        });
    
        this.$('#t_talk').button({
            icons: {
                primary: 'icon-talk'
            },
            text: false,
            disabled: true
        });
    },
    
    events: {
        "click #t_cursor":  function(){this.subviews.diag_cursor.open();},
        "click #t_options": function(){this.subviews.diag_options.open();},
        "click #t_select":  function(){this.subviews.diag_select.open();},
        "click #t_articles":function(){this.subviews.diag_articles.open();},
        "click #t_sections":function(){this.subviews.diag_sections.open();},
        "click #t_info":    function(){this.subviews.diag_info.open();},
        "click #t_data":    function(){this.subviews.diag_data.open();},
        "click #t_legend":  function(){this.subviews.diag_legend.open();},
        "click #t_deselect":function(){this.view.viz.clearAllSelections(true);},
        "click #t_talk":    function(){this.subviews.diag_talk.open();}
    },
    
    render: function(){
        this.$el.html(this.template(this.model));
        this.createToolbar();
        return this.$el;
    }
});

// ## TopTabsView
TopTabsView = Backbone.View.extend({

    views: new Array(),

    initialize: function(){
        this.listenTo(this.model, 'add', this.render);
        this.listenTo(this.model, 'remove', this.render);
        $(window).resize($.proxy(this.render, this));
    },
    
    // Orders each tab and spacing them correctly.
    // 
    // First the tabs are sorted based on their x position,
    // then they are spaced and rerendered.
    order: function(){
        this.model.sort();
        var startX = TopTabsView.leftMargin;
        var widthEstimate = (($("#content").outerWidth()-30-30-TopTabsView.spacing)/(this.model.length-1)) - 25 - 10 - TopTabsView.spacing;
        var widthSum = 0;
        var actualSum = 0;
        this.model.each(function(tab, index){
            var before = tab.get('x');
            tab.set('x', startX, {silent: true});
            var extraWidth = 0;
            if(tab.get('type') != 'new'){
                widthSum += widthEstimate + 25 + 10 + 5;
                actualSum += Math.max(5, Math.min(150, Math.round(widthEstimate))) + 25 + 10 + 5;
                var diff = widthSum - actualSum;
                actualSum += diff;
                // TODO: This isn't perfect, some rounding problems still exist
                this.$("#tab_" + tab.cid).css('max-width', Math.max(5, Math.min(150, Math.round(widthEstimate) + diff)));
            }
            startX += Math.round(this.$("#tab_" + tab.cid).outerWidth()) + TopTabsView.spacing;
            if(before != tab.get('x')){
                this.views[index].updatePosition();
            }
        }, this);
    },
    
    render: function(){
        _.each(this.views, function(view){
            view.remove();
        });
        this.views = new Array();
        this.$el.empty();
        this.model.each(function(tab){
            var tabView = new TopTabView({model: tab});
            this.$el.append(tabView.render());
            if(tab.get('type') == 'tab'){
                tabView.$el.draggable({
                    axis: "x",
                    start: $.proxy(function(e, ui){
                        tabView.$el.css('z-index', 1000);
                    }, this),
                    drag: $.proxy(function(e, ui){
                        tab.set('x', parseInt(tabView.$el.css('left')), {silent: true});
                        this.order();
                    }, this),
                    stop: $.proxy(function(){
                        tabView.$el.css('z-index', 0);
                        this.order();
                        this.render();
                    }, this)
                });
            }
            this.views.push(tabView);
        }, this);
        this.order();
        return this.$el;
    },

});

// Left margin for first tab
TopTabsView.leftMargin = 15;
// Spacing between tabs
TopTabsView.spacing = 5;

// ## TopTabView
TopTabView = Backbone.View.extend({

    template: _.template($("#top_tab_template").html()),

    initialize: function(){
        this.listenTo(this.model, 'change', this.render);
    },
    
    events: {
        "mouseover": "hover",
        "mouseout": "unhover",
        "click .x": "close",
        "click": "click"
    },
    
    // Triggered when the tab is hovered.  Change hover color etc.
    hover: function(){
        if(this.model.get('selected')){
            this.$el.css('border-bottom', '1px solid #FFFFFF');
        }
        this.$el.css('background-color', this.model.get('hoverColor'));
    },
    
    unhover: function(){
        if(this.model.get('selected')){
            this.$el.css('border-bottom', '1px solid #FFFFFF');
        }
        else{
            this.$el.css('border-bottom', '1px solid #AAAAAA');
        }
        this.$el.css('background-color', this.model.get('color'));
    },
    
    // Triggered when a tab is clicked (clicking the 'x' doesn't count)
    // 
    // If a '+' tab was clicked, then a new tab is created and selected, otherwise
    // the clicked tab is selected, and the previously selected tab is unselected
    click: function(e){
        if(this.model.get('type') == 'new'){
            var tab = new TopTab({title: "New Tab", mainView: new NewArticleView({model: articles})});
            var beforeX = _.last(topTabsView.views).model.get('x');
            topTabs.add(tab);
            topTabsView.order();
            var selected = topTabs.getSelected();
            if(selected != null && selected != this.model){
                selected.set('selected', false);
            }
            tab.set('selected', true);
            $("#tab_" + tab.cid).css('display', 'none');
            $("#tab_" + tab.cid).show('slide', 200);
            _.last(topTabsView.views).$el.css('left', beforeX);
            _.last(topTabsView.views).$el.animate({
                'left': tab.get('x') + $("#tab_" + tab.cid).outerWidth() + TopTabsView.spacing
            }, 200);
        }
        else{
            if(!$(e.target).hasClass('x')){
                var selected = topTabs.getSelected();
                if(selected != null && selected != this.model){
                    selected.set('selected', false);
                }
                if(!this.model.get('selected')){
                    this.model.set('selected', true);
                }
            }
        }
    },
    
    // Closes this tab and removes it.  The last tab is then selected
    close: function(){
        var found = false;
        _.each(topTabsView.views, function(tab){
            if(found){
                tab.$el.animate({
                    'left': tab.model.get('x') - this.$el.outerWidth() - TopTabsView.spacing
                }, 200);
            }
            if(tab == this){
                found = true;
            }
        }, this);
        this.model.set('selected', false);
        this.model.get('mainView').remove();
        this.$el.hide('slide', 200, $.proxy(function(){
            topTabs.remove(this.model);
            if(topTabs.at(topTabs.length-2)){
                topTabs.at(topTabs.length-2).set('selected', true);
            }
        }, this));
    },
    
    // Updates the left coordinate of the tab
    updatePosition: function(){
        this.$el.css('left', this.model.get('x'));
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        if(this.model.get('type') == 'new'){
            this.$el.addClass('tab_new');
        }
        this.$el.addClass("tab");
        this.$el.stop();
        this.updatePosition();
        this.$el.attr('id', "tab_" + this.model.cid);
        if(this.model.get('selected')){
            this.$el.addClass('selected');
            this.$el.css('border-bottom', '1px solid #FFFFFF');
        }
        else{
            this.$el.removeClass('selected');
            this.$el.css('border-bottom', '1px solid #AAAAAA');
        }
        this.$el.css('background-color', this.model.get('color'));
        return this.$el;
    }

});

UserInfoView = Backbone.View.extend({

    initialize: function(options){
        this.user = options.user;
        this.listenTo(this.model, "sync", this.render);
        this.listenTo(this.model.get('data'), "sync", this.render);
        this.template = _.template($("#user_info_template").html());
    },
    
    render: function(){
        this.$el.html(this.template(_.extend(this.user.toJSON(), this.model.toJSON())));
        this.$el.attr('id', "article_info");
        return this.$el;
    }

});

// ## UserView
UserView = Backbone.View.extend({
    
    template: _.template($("#user_container_template").html()),
    wikiviz: null,
    navctl: null,
    
    initialize: function(){
        this.wikiviz = new WikiViz({user: this.model.get('name')});
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
        Backbone.Subviews.add(this);
    },
    
    subviewCreators : {
        "user_info": function(){
            return new UserInfoView({model: this.wikiviz, user: this.model});
        },
        "toolbar": function(){
            return new ToolbarView({model: {'buttons': ['articles','data','legend','deselect','talk']}, view: this});
        }
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.viz = new WikiVizView({model: this.wikiviz, view: this, el: this.el});
        this.viz.init(this.model.get('title'));
        return this.$el;
    }
    
});

// ## WikiVizView
WikiVizView = Backbone.View.extend({

    mouseX: 0,
    mouseY: 0,

    initialize: function(options){
        this.listenTo(this.model.get('data'), "sync", this.initViz);
        this.navctl = new NavCtlView({viz: this});
        this.view = options.view;
        this.listenTo(this.model, "change:width", this.initViz);
        this.listenTo(this.model, "change:height", this.initViz);
        this.listenTo(this.model, "change:numDots", this.updateDots);
        this.listenTo(this.model, "change:numBars", this.updateBars);
        this.listenTo(this.model, "change:mode", this.updateMode);
        this.listenTo(this.model, "change:isTimeSpaced", this.updateSpacing);
        this.$el.click($.proxy(function(e){
            if($(e.target).closest(".tooltip").length == 0){
                this.$(".tooltip").hide();
            }
        }, this));
        this.$("#view").mousemove($.proxy(function(e){
            this.mouseX = e.offsetX;
            this.mouseY = e.offsetY;
        }, this));
        $(window).resize($.proxy(function(){
            if(this.$("#view").width() > 0){
                this.model.set('width', this.$("#view").width());
                this.model.set('height', this.$("#view").height());
            }
        }, this));
    },

    // Calculate bar width based on number of bars per screen
    calcBarWidth: function(){
        var w = (this.model.get('width') - this.model.get('maskWidth'))/(this.model.get('numBars'));
        if (this.model.get('isTimeSpaced')) { w = Math.min(w, 7); }
        return w;
    },
    
    // Calculate talk width based on number of talk entries per screen
    calcTalkWidth: function(){
        var w = (this.model.get('width') - this.model.get('maskWidth'))/(this.model.get('numDots'));
        return w;
    },

    getAdjacentTalkWidth: function(){
        // width of one callout
        return this.model.get('data').get('talk').length * 70;
    },
    
    // Get left edge of a given bar on the visualization
    getOffset: function(ind){
        if (!this.model.get('isTimeSpaced')) {
            return ind * this.calcBarWidth();
        } else {
            return this.model.get('data').get('revisions')[ind].dateOffset;
        }
    },
    
    // Calculate the inner width of a callout element based in its contents.
    getCalloutHeight: function(d){
        var ret = 0;
        // Width of icon + padding
        var el_w = 29;
        if (d.att !== 0) { ret += el_w; }
        if (d.crit !== 0) { ret += el_w; }
        if (d.inf !== 0) { ret += el_w; }
        if (d.perf !== 0) { ret += el_w; }
        return ret;
    },
    
    // Generate an array of callout classification images based on the talk-page
    // entry that is represented by that callout.
    genCalloutImageSet: function(d){
        var imgs = [];
        if (d.att !== 0) { imgs.push('att'); }
        if (d.crit !== 0) { imgs.push('crit'); }
        if (d.inf !== 0) { imgs.push('inf'); }
        if (d.perf !== 0) { imgs.push('perf'); }
        return imgs;
    },
    
    // Update the info box using an object composed of prop=>val pairs.
    // UNUSED for now, but may be able to be adapted into something later.
    updateInfo: function(properties) {
        // Update the content of the info box.
        // First, hide the default 'no selection' message.
        this.$('#d_info_noselection').addClass('invisible');
    
        // Clear any data inside the info div.
        this.$('#d_info_selection').empty();
    
        var numProps = 0;
    
        this.$('#d_info_selection').append($('<table>'));
    
        for (p in properties) {
            if (!properties.hasOwnProperty(p)) continue;
            ++numProps;
            this.$('#d_info_selection table').append($('<tr>').append($('<td>').text(p)).append($('<td>').text(properties[p].toString())));
        }
    
        // If there is no data, display 'no selection' message.
        if (numProps == 0) {
            this.$('#d_info_selection').empty();
            this.$('#d_info_noselection').removeClass('invisible');
        }
    },
    
    // Deletes all of the month rects.
    clearMonths: function() {
        this.model.get('view').body.select('.bg').selectAll('.month').data([]).exit().remove();
    },
    
    // Redraw dots here for talk page entries after changing numDots
    updateDots: function(){
        this.model.get('view').tx.range([0, this.calcTalkWidth()]);
        if (!this.model.get('isTimeSpaced')){
            this.model.get('view').tdata.selectAll('.tdatum')
                .attr('transform', $.proxy(function(d, i) { return 'translate(' + this.model.get('view').tx(i) + ', 0)'; }, this));
        }
        this.buildMonths();
    },
    
    // Rescale x-axis based on the number of bars that should fit into a screen after changing numBars
    updateBars: function(){
        this.model.get('view').x.range([0, this.calcBarWidth()]);
        if (!this.model.get('isTimeSpaced')){
            this.model.get('view').data.selectAll('.datum')
                .attr('transform', $.proxy(function(d) { return 'translate(' + this.model.get('view').x(this.model.index(d)) + ', 0)'; }, this));
        }
        var that = this;
        this.model.get('view').data.selectAll('.datum').selectAll('.bars rect').attr('width', this.calcBarWidth());
        // Hide x labels that would overlap!
        this.model.get('view').data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width <= that.calcBarWidth(); })
            .attr('opacity', 1);
        this.model.get('view').data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width > that.calcBarWidth(); })
            .attr('opacity', 0);
    
        // Need to update the month rectangles so that they use the new scale!
        this.buildMonths();
    },
    
    // Highlight those entries that were made by users in userlist.
    // TODO: Apply selections to the scroll bar area and to the talk page contributions!
    applyUserSelection: function(userlist) {
        // Clean up any previous selections!
        this.clearAllSelections();
    
        // Enable the deselect button if there is an active selection
        if (userlist.length > 0) {
            this.$('#t_deselect').button('enable');
        } else {
            this.clearAllSelections();
            return;
        }
    
        // Disable the legend selection mechanism
        $('#diag_legend input').attr('disabled', 'disabled');
        // Disable groups selection
        $('#d_select_groups_accordion input').attr('disabled', 'disabled');
    
        // Update info box.
        var info = {};
    
        info['Number of Selected Users'] = userlist.length;
        info['User Groups'] = [];
        for (var i = 0 ; i < userlist.length; ++i) {
            if (jQuery.inArray(this.model.getGroupsByName(userlist[i]), info['User Groups']) == -1) {
                info['User Groups'].push(this.model.getGroupsByName(userlist[i]));
            }
        }
        this.updateInfo(info);
    
        // Apply selection to 'Content Details' table.
        $('#diag_data table tbody').children('tr').each(function (i, elem) {
            $(elem).removeClass('rowselect');
            if (jQuery.inArray($(elem).children(':eq(2)').text(), userlist) != -1) {
                $(elem).addClass('rowselect');
            }
        });
    
        // Apply selection to the main article contribution view
        this.model.get('view').data.selectAll('.datum').filter(function (d) { return jQuery.inArray(d.user, userlist) === -1; }).selectAll('.bars rect').transition().duration(500).attr('opacity', 0.2);
    
        // Apply selection to nav "spikes"
        this.navctl.spikes.filter(function(d) { return jQuery.inArray(d.user, userlist) === -1; }).transition().duration(500).attr('opacity', 0.4);
    
        return;
    },
    
    // This is the action that is taken when the user clicks on the "reset selections" button in the toolbar.
    // It should reset all selection tools to their default states, and enable previously disabled selection tools as necessary.
    clearAllSelections: function() {
    
        // Disable the deselect button
        this.$('#t_deselect').button('disable');
    
        // Update the info box (UNUSED)
        this.updateInfo({});
    
        // Clear all selections made in the table view.
        this.$('#diag_data table tbody tr').each(function (i, elem) { $(elem).removeClass('rowselect'); });
    
        // Pre-check all edit category and user group selection boxes.
        this.$('#d_legend_accordion input').attr('checked', 'checked');
        $('#d_select_groups_accordion input').attr('checked', 'checked');
    
        // Update the various views to reflect reset of all selections.
        this.model.get('view').data.selectAll('.bars rect').transition().duration(500).attr('opacity', 1);
        this.model.get('view').data.selectAll('.datum').transition().duration(500).attr('opacity', 1);
    
        // Update nav control spikes
        this.navctl.spikes.transition().duration(500).attr('opacity', 1);
    
        // Re-enable any previously disabled selection controls
        this.$('#diag_legend input').removeAttr('disabled');
        this.$('#d_select_groups_accordion input').removeAttr('disabled');
    },
    
    // Switch visualization to time-spaced mode, or update time-spaced visualization
    // This is currently called by the slider element on a switch mode event.
    toTimeSpaced: function(){
        // Re-position all article revision elements using the x axis time scale.
        d3.selectAll('.datum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.model.timeX(d.date) + ',0)';}, this))
            .selectAll('.bars rect').attr('width', this.calcBarWidth());
    
        // Re-position talk page entry callouts using the x-axis time scale.
        d3.selectAll('.tdatum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.model.timeX(d.date) + ',0)';}, this))
    
        // Update the month view.
        this.buildMonths();
    
        // Show the month view if we are in TS talk page mode.
        // This is because the month view is hidden in adj-talk page mode, but we want it for TS anyway.
        if (this.model.get('mode') == "talk") {
            d3.selectAll('.month').attr('opacity', 1);
        }
    },
    
    // Switch visualization to adacent-spacing mode
    // Currently called by the slider element when a mode change event occurs.
    toAdjacentSpaced: function(){
        // Hide the month view if we are in adjacent spacing talk-page mode.
        // (The month view does not make any sense in this mode)
        if (this.model.get('mode') == "talk") {
            d3.selectAll('.month').attr('opacity', 0);
        }

        // Re-position all article and talk-page contributions using adjacent-spacing parameters / axes.
        d3.selectAll('.datum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.model.get('view').x(this.model.index(d)) + ',0)';}, this))
            .selectAll('.bars rect').attr('width', this.calcBarWidth());
        
        d3.selectAll('.tdatum')
            .attr('transform', $.proxy(function(d, i) {return 'translate(' + this.model.get('view').tx(i) + ',0)';}, this));
        
        // Update the month view.
        this.buildMonths();
    },
    
    // Function to map revision data to rectangle groups that represent the data as a stacked bar graph.
    buildBars: function(barsGroup, barWidth){
        var posFields = ['add', 'unsure', 'reorganize', 'edit', 'cite', 'vand', 'unclassified'];
        var negFields = ['unvand', 'remove'];
    
        // For brevity
        var y = this.model.get('view').y;
        var index = this.model.index;
    
        // Make array to store partial sums of weighted attributes for each data element
        var sums = [];
        // Zero-out array
        for (var i = 0; i < this.model.get('data').get('revisions').length; ++i) { sums[i] = 0; }
        // Build up the stacked bars. The sums array stores the sum of the last few stacked values' heights so that we can stack them properly
        _.each(posFields, function(v, i) {
            barsGroup.filter(function (d) { return d.wclass[v] > 0.0001; }).append('rect').attr('y', function(d) { return y(sums[index(d)])*0.80; })
                .attr('width', barWidth).attr('height', function(d) { return y(d.wclass[v])*0.80; }).attr('class', v)
                .attr('desc', index).attr('opacity', 1);
            // Collect the sums of what we've seen so far so as to stack the bars properly
            for (var ind = 0; ind < this.model.get('data').get('revisions').length; ++ind) { sums[ind] += this.model.get('data').get('revisions')[ind].wclass[v]; }
        }, this);
    
        // The negatives are done the same way, but we have to change the role of the 'y' attribute.
        //
        // Zero-out array
        for (var i = 0; i < this.model.get('data').get('revisions').length; ++i) { sums[i] = 0; }
        // Build up the stacked bars. The sums array stores the sum of the last few stacked values' heights so that we can stack them properly
        _.each(negFields, function(v, i) {
            barsGroup.filter(function (d) { return d.wclass[v] > 0.0001; }).append('rect').attr('y', function(d) { return -y(d.wclass[v]+sums[index(d)])*0.80; }).attr('width', barWidth)
                .attr('height', function(d) { return y(d.wclass[v])*0.80; }).attr('class', v).attr('desc', index).attr('opacity', 1);
            // Collect the sums of what we've seen so far so as to stack the bars properly
            for (var ind = 0; ind < this.model.get('data').get('revisions').length; ++ind) { sums[ind] += this.model.get('data').get('revisions')[ind].wclass[v]; }
        }, this);
    },
    
    // Create or Update month background rects.
    // These are the shaded rectangles in the background of the visualization that indicate periods of 1 month.
    // We need to build these to the correct scale so that they line up with the correct revisions.
    buildMonths: function (){
        var barWidth = this.calcBarWidth();
        var revdata = this.model.get('data').get('revisions');
        var qualityData = Array();
        var eventsData = Array();
        var googleData = Array();
        // Min. additional width of month box required to display text.
        var blankThreshold = 10;
        //Helper.view.body.select('.bg').selectAll('.month').data([]).exit().remove();
        var data = [];
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
        // If the visualization is not time spaced, we need to go through our data, find month boundaries, and
        // build a list of the left and right offsets of the month rects on the visualization
        if (!this.model.get('isTimeSpaced')) {
            var finalDate = new Date(_.last(revdata).timestamp);
            var lastDate = new Date(_.first(revdata).timestamp);
            var curDate;
            var lastIndex = 0;
            var lastRev = _.first(this.model.get('data').get('revisions'));
            for (var i = 1; i < revdata.length; ++i) {
                // We need to build width and offset positions for the various month groups
                // We do this by scanning through our bar graph data and appending to the month data as we go.
                curDate = new Date(revdata[i].timestamp);
                
                if (curDate.getMonth() !== lastDate.getMonth() || curDate.getYear() !== lastDate.getYear()) {
                    var left = this.getOffset(lastIndex);
                    var right = this.getOffset(i);
                    if (left === right) continue;
                    data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
                    lastDate = curDate;
                    lastIndex = i;
                }
                _.each(this.model.get('data').get('quality'), $.proxy(function(quality, ind){
                    var cutoff = new Date(quality.cutoff);
                    cutoff = new Date(cutoff.getTime() + (24 * 60 * 60 * 1000));
                    if((curDate >= cutoff || finalDate.valueOf() == curDate.valueOf()) && qualityData[ind] == undefined){
                        qualityData[ind] = {l: this.getOffset(i+0.5), q: quality};
                    }
                }, this));
                _.each(this.model.get('data').get('events'), $.proxy(function(event, ind){
                    var time = new Date(event.timestamp);
                    if(curDate >= time && eventsData[ind] == undefined){
                        eventsData[ind] = {l: this.getOffset(i+0.5), e: event};
                    }
                }, this));
                _.each(this.model.get('data').get('google'), $.proxy(function(google, ind){
                    var time = new Date(google.timestamp);
                    if(curDate >= time && googleData[ind] == undefined){
                        googleData[ind] = {l: this.getOffset(i+0.5), g: google};
                    }
                }, this));
            }
        
            var left = this.getOffset(lastIndex);
            var right = this.getOffset(revdata.length);
            data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
        } else {
                // If we ARE in time-separated mode, we need to loop through all the months between the first and last edits
                // and add them all.
                // We use the timeX scale to find the left and right boundaries.
            var lastMonth;
            var first = true;
            var timeX = this.model.timeX;
            for (var m = _.first(this.model.get('data').get('revisions')).date.getMonth(),
                 y = _.first(this.model.get('data').get('revisions')).date.getFullYear();
                 m <= _.last(this.model.get('data').get('revisions')).date.getMonth() || y <= _.last(this.model.get('data').get('revisions')).date.getFullYear();
                 ++m) {
                if (m > 11) { m = 0; ++y;}
                if (first) {
                    if (m == 0) lastMonth = new Date(y - 1, 0, 1);
                    else lastMonth = new Date(y, m - 1, 1);
                    first = false;
                }
                var curMonth = new Date(y, m, 1);
                data.push({l: timeX(lastMonth), r: timeX(curMonth), m: lastMonth.getMonth(), y: lastMonth.getFullYear()});
                lastMonth = curMonth;
            }
            
            _.each(this.model.get('data').get('quality'), function(quality){
                var cutoff = new Date(quality.cutoff);
                cutoff = new Date(cutoff.getTime() + (24 * 60 * 60 * 1000));
                qualityData.push({l: timeX(cutoff), q: quality});
            });
            _.each(this.model.get('data').get('events'), function(event){
                var time = new Date(event.timestamp);
                eventsData.push({l: timeX(time), e: event});
            });
            _.each(this.model.get('data').get('google'), function(google){
                var time = new Date(google.timestamp);
                googleData.push({l: timeX(time), g: google});
            });
        }
    
        var bg = this.model.get('view').body.select('.bg');
    
        var mts_e = bg.selectAll('.month').data(data, function(d, i) { return i; }).enter();
        var mts_g = mts_e.append('g').attr('class', 'month').attr('transform', function(d) { return 'translate(' + d.l + ',0)'; });
        mts_g.append('rect').attr('height', String(this.model.get('height'))).attr('width', function(d) { return (d.r-d.l); })
            .attr('class', function(d, i) { return (i%2 === 0)?('m_odd'):('m_even');}).attr('y', String(-this.model.get('height')/2));
        mts_g.append('text').attr('class', 'mtext').text(function(d) { return months[d.m]; }).attr('transform', $.proxy(function(d) { return 'translate(5,' + (this.model.get('height')/2 - 15) + ')scale(1,-1)';}, this)).attr('opacity', 1).filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
        mts_g.append('text').attr('class', 'ytext').text(function(d) { return String(d.y); }).attr('transform', $.proxy(function(d) { return 'translate(5,' + (this.model.get('height')/2 - 30) + ')scale(1,-1)';}, this)).attr('opacity', 1).filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
    
        mts = this.model.get('view').body.selectAll('.month').data(data, function(d, i) { return i; });
        var mts_t = mts;
        mts_t.attr('transform', function(d) { return 'translate(' + d.l + ',0)'; });
        mts_t.select('rect').attr('width', function(d) { return (d.r-d.l); });;
        mts.select('text.mtext').text(function(d) { return months[d.m]; });
        mts.select('text.ytext').text(function(d) { return String(d.y); });
        mts_t.select('rect').attr('class', function(d, i) { return (i%2 === 0)?('m_odd'):('m_even');});
        mts.select('text.mtext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
        mts.select('text.mtext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) >= blankThreshold;}).attr('opacity', 1);
        mts.select('text.ytext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
        mts.select('text.ytext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) >= blankThreshold;}).attr('opacity', 1);
    
        bg.selectAll('.bar').remove();
        var bar_g = bg.append('g').attr('class', 'bar');
        bar_g.append('rect').attr('class', 'bar_bg')
                            .attr('width', '100%')
                            .attr('height', 35)
                            .attr('fill', '#F2E4CB');
        this.repositionBar();
        var lastX = 0;
        var lastY = -(this.model.get('height')/2);
        _.each(googleData, $.proxy(function(d){
            var newX = d.l;
            var newY = -(this.model.get('height')/2) + (35*(d.g.value/100));
            bar_g.append('line')
                .attr('x1', lastX)
                .attr('y1', lastY)
                .attr('x2', newX)
                .attr('y2', newY)
                .attr('class', 'google');
            lastX = newX;
            lastY = newY;
        }, this));
        var r = 8;
        _.each(qualityData, $.proxy(function(d){
            var text = "<table>";
            _.each(d.q.description, function(val, i){
                text += "<tr><td align='right'>" + i + ":&nbsp;</td><td>" + val + "</td></tr>";
            });
            text += "<tr><td colspan='2'>" + Helper.formatDate(new Date(d.q.cutoff), false) + "</td></tr>"
            
            if(d.q.metric == 'CoDNA'){
                text += "<tr><td colspan='2'><a style='float:right;' href='http://dl.acm.org/citation.cfm?id=2069609' target='_blank'>Source</a></td></tr>";
            }
            text += "</table>";
            var clone = $(_.template($("#tooltip_template").html(), {
                title: d.q.metric + " Ranking",
                text: text
            }));
            this.$('#view').append(clone);
            bar_g.append('circle').attr('r', r)
                                  .attr('transform', 'translate(' + (d.l) + ',-' + (this.model.get('height')/2 - r*2) + ')')
                                  .attr('fill', '#2C5C7D');
            $(".bar circle").last().click($.proxy(function(){
                _.defer($.proxy(function(){
                    $(".tooltip").not(clone).fadeOut();
                    clone.fadeToggle();
                    var height = $(clone[1]).outerHeight();
                    var width = $(clone[1]).outerWidth();
                    clone.css('left', this.mouseX - width/2)
                         .css('top', this.mouseY - r*2 - height);
                }, this));
            }, this));
        }, this));
        _.each(eventsData, $.proxy(function(d){
            var clone = $(_.template($("#tooltip_template").html(), {
                title: d.e.title,
                text: d.e.description + "<br />Date:&nbsp;" + Helper.formatDate(new Date(d.e.timestamp), false),
            }));
            this.$('#view').append(clone);
            bar_g.append('circle').attr('r', r)
                                  .attr('transform', 'translate(' + (d.l) + ',-' + (this.model.get('height')/2 - r*2) + ')')
                                  .attr('fill', '#8B2C0D');
            $(".bar circle").last().click($.proxy(function(){
                _.defer($.proxy(function(){
                    $(".tooltip").not(clone).fadeOut();
                    clone.fadeToggle();
                    var height = $(clone[1]).outerHeight();
                    var width = $(clone[1]).outerWidth();
                    clone.css('left', this.mouseX - width/2)
                         .css('top', this.mouseY - r*2 - height);
                }, this));
            }, this));
        }, this));
    
        var mts_x = mts.exit();
        mts_x.attr('opacity', 0).remove();
    },
    
    repositionBar: function(){
        this.$(".tooltip").hide();
        var bg = this.model.get('view').body.select('.bg');
        var bar_g = bg.selectAll('.bar_bg');
        bar_g.attr('transform', 'translate(' + this.navctl.getPanOffset() + ',-' + (this.model.get('height')/2) + ')');
    },
    
    // Append the callouts that correspond to the talk-page entries for our article to the given element.
    // Note that the argument 'parent' should be a d3 selection.
    appendCallout: function(parent){
        var cw = 24;
        // Padding around content
        var px = 10;
        var py = 10;
        var ox = 10;
        var oy = 10;
        // Corner radius in px
        var cr = 5;
    
        // Max circle radius
        var maxR = 10;
        var fact = 1.2;
    
        // Append circle to our element. Cap the circle size and re-style the circle if it has reached the cap.
        parent.filter(function(d) { return Math.log(d.lev+1)*fact <= maxR; }).append('circle').attr('r', function(d) { return Math.log(d.lev+1)*fact; }).attr('class', 'tcircle');
        parent.filter(function(d) { return Math.log(d.lev+1)*fact > maxR; }).append('circle').attr('r', maxR).attr('class', 'tcircle_full');
    
        // Generate the tooltip for this element.
        parent.append('title').text(function(d) {
            return 'User: ' + d.contributor + '\n' + Helper.formatDate(d.date) + '\n' + 'Revision Categories: ' + Helper.toTalkClassString(d) + '\n' + 'Revision Size: ' + d.lev;
        });
    
        // Generate the path that defines the shape of the callout.
        var callout = parent.append('path');
        callout.attr('d', $.proxy(function(d) { return "M 0 0 l {0} {1} l 0 {2} a {3} {3} 0 0 0 {3} {3} l {4} 0 a {3} {3} 0 0 0 {3} -{3} l 0 -{5} a {3} {3} 0 0 0 -{3} -{3} l -{6} 0 z".format(
            // Coords of left bottom of callout "box" rel. to "origin"
            ox, oy,
            this.getCalloutHeight(d) + 2*px - 2*cr,
            // Corner radius
            cr,
            cw + 2*py - cr,
            this.getCalloutHeight(d) + 2*px - cr - 10,
            // Last number here is the width of the wide-end of the callout triangle
            cw + 2*py - 2*cr
        )}, this));
        callout.attr('class', 'callout');
    
        // Generate the x-offset for each callout incrementally.
        // This is used in adjacent spacing of callouts.
        var x = 0;
    
        // Create image groups based on talk-page classifications and append these image groups to their respective callouts.
        var igroup = parent.append('g').attr('class', 'igroup').attr('transform', 'translate(' + (ox+px) + ',' + (oy+py) +')scale(1,-1)').datum($.proxy(function(d) { return this.genCalloutImageSet(d); }, this));
        igroup.each(function (d) {
            d3.select(this).selectAll('image').data(d).enter().append('image').attr('xlink:href', function(dm) { return "img/" + dm + ".png"; }).attr('y', function(dm, i) { return -29*i-24; })
                .attr('width', 24).attr('height', 24).attr('x', 3).attr('class', function(dm) { return dm; } );
        });
    
        // Append to each callout an x-axis label corresponding to its ID.
        parent.append('text').attr('class', 'xlabel').text(function(d, i) { return i + 1; })
            .attr('transform', function(d) { return 'translate(' + (ox+px/2) + ',' + (oy+py/2) + ')scale(1,-1)'; });
    },
    
    // Updates the view based on whether or not the view is set to time spaced or adjacent spaced
    updateSpacing: function(){
        if(this.model.get('isTimeSpaced')){
            this.navctl.toTimeSpaced();
            this.toTimeSpaced();
        } else {
            this.navctl.toAdjacentSpaced();
            this.toAdjacentSpaced();
        }
    },
    
    // Updates the view based on the type of mode it is in
    updateMode: function(){
        if(this.model.get('mode') == 'art'){
            this.$('#view').appendTo(this.$('#artview'));
            this.model.get('view').data.selectAll('.datum').attr('opacity', 1);
            d3.selectAll('.sd').attr('opacity', 1);
            d3.selectAll('.tdatum').attr('opacity', 0);
            d3.selectAll('.tcircle').attr('opacity', 0);
        
            this.$('#t_legend').button('enable');
            this.$('#t_talk').button('disable');
        
            this.$('#toAdj').button('enable');
        
            d3.selectAll('.month').attr('opacity', 1);
        
            if (this.model.get('isTimeSpaced') === false) {
                this.$('#toAdj').button('disable');
                this.$('#toTime').button('enable');
                this.navctl.toAdjacentSpaced();
            } else {
                this.$('#toAdj').button('enable');
                this.$('#toTime').button('disable');
                this.navctl.toTimeSpaced();
            }
            
            this.navctl.onScale();
        
            var dialog = this.view.subviews.toolbar.subviews.diag_data.dialog;
            $('.talkrow', dialog).addClass('invisible');
            $('.defaultrow', dialog).removeClass('invisible');
        
            d3.select(this.$('.fg')[0]).attr('transform', 'translate(0, -500)');
        
            d3.selectAll('g.ylabel').attr('opacity', 1);
        }
        else if(this.model.get('mode') == 'talk'){
            this.$('#view').appendTo(this.$('#talkview'));
            this.model.get('view').data.selectAll('.datum').attr('opacity', 0);
            d3.selectAll('.sd').attr('opacity', 0);
            d3.selectAll('.tdatum').attr('opacity', 1);
            d3.selectAll('.tcircle').attr('opacity', 1);
        
            $('#t_legend').button('disable');
            $('#t_talk').button('enable');
        
            if (this.model.get('isTimeSpaced') === false) {
                d3.selectAll('.month').attr('opacity', 0);
                this.$('#toAdj').button('disable');
                this.$('#toTime').button('enable');
                this.navctl.toAdjacentSpaced();
            } else {
                this.$('#toAdj').button('enable');
                this.$('#toTime').button('disable');
                this.navctl.toTimeSpaced();
            }
        
            this.navctl.onScale();
        
            var dialog = this.view.subviews.toolbar.subviews.diag_data.dialog;
            $('.talkrow', dialog).removeClass('invisible');
            $('.defaultrow', dialog).addClass('invisible');
        
            d3.select(this.$('.fg')[0]).attr('transform', 'translate(0, 0)');
        
            d3.selectAll('g.ylabel').attr('opacity', 0);
        }
        else if(this.model.get('mode') == 'hybrid'){
            this.$('#view').appendTo(this.$('#hybridview'));
            this.model.get('view').data.selectAll('.datum').attr('opacity', 1);
            d3.selectAll('.sd').attr('opacity', 1);
            d3.selectAll('.tdatum').attr('opacity', 1);
            d3.selectAll('.tcircle').attr('opacity', 1);
        
            this.$('#t_legend').button('enable');
            this.$('#t_talk').button('enable');
        
            this.$('#toAdj').button('disable');
            this.$('#toTime').button('disable');

            this.model.set('isTimeSpaced', true);
        
            d3.selectAll('.month').attr('opacity', 1);
        
            var dialog = this.view.subviews.toolbar.subviews.diag_data.dialog;
            $('.talkrow', dialog).removeClass('invisible');
            $('.defaultrow', dialog).removeClass('invisible');
        
            d3.select(this.$('.fg')[0]).attr('transform', 'translate(0, 0)');
            d3.selectAll('g.ylabel').attr('opacity', 1);
        }
    },
    
    // Init visualization with a given article.
    init: function(art_title) {
        this.$('#viewtabs').tabs();
        this.model.set('width', this.$("#view").width(), {silent: true});
        this.model.set('height', this.$("#view").height(), {silent: true});
        this.$('.spacing_wrapper').mouseenter(function() {
            $(this).css('opacity', 1);
        }).mouseleave(function() {
            $(this).css('opacity', 0.8);
        });
    
        this.model.set('isTimeSpaced', false);
    
        // TODO: Move this code to a more appropriate place?
    
        // Program the 'to adjacent spacing' and 'to time spacing' mode buttons with
        // appropriate functionality.
        this.$('#toAdj').button().attr('title', 'Adjacent Spacing');
        this.$('#toTime').button().attr('title', 'Time Spacing');
    
        this.$('#toAdj').click($.proxy(function() {
            this.model.set('isTimeSpaced', false);
            this.$('#toAdj').button('disable');
            this.$('#toTime').button('enable');
        }, this));
        this.$('#toTime').click($.proxy(function() {
            this.model.set('isTimeSpaced', true);
            this.$('#toAdj').button('enable');
            this.$('#toTime').button('disable');
        }, this));
    
        this.$('a[href=#artview]').click($.proxy(function(event, ui) {
            this.model.set('mode', 'art');
        }, this));
        this.$('a[href=#talkview]').click($.proxy(function(event, ui) {
            this.model.set('mode', 'talk');
        }, this));
        this.$('a[href=#hybridview]').click($.proxy(function(event, ui) {
            this.model.set('mode', 'hybrid');
        }, this));
    
        // In the default configuration, we are already in adjacent spacing mode, so we can disable the adjacent spacing button.
        this.$('#toAdj').button('disable');
    },
    
    // Initialize the visualization. Create SVG and elements correspondng to data.
    initViz: function(){
        this.$('#view svg').remove();
        if(this.model.get('title') == "" && this.model.get('user') == ""){
            // Entry doesn't exist, don't go any further otherwise things will break
            return;
        }
        /*var title = "";
        if(this.model.get('title') != ""){
            title = this.model.get('title');
        }
        else if(this.model.get('user') != ""){
            title = this.model.get('user');
        }*/
        // For brevity
        //
        // Width of mask over which y label is written
        var maskWidth = this.model.get('maskWidth');
        var view = this.model.get('view');
        view.svg = d3.select(this.$('#view')[0]).append('svg').attr('width', this.model.get('width')).attr('height', this.model.get('height'));
    
        // Re-arrange coordinate system by setting x=0 to the center of the SVG and flipping the y-axis values.
        // Also, set y=0 offset by maskWidth to the left to simplify math regarding the position of the y-axis title and masking rect.
        view.sview = view.svg.append('g').attr('width', this.model.get('width')).attr('transform', 'translate(' + (maskWidth) + ',' + (this.model.get('height')/2) + ')scale(1,-1)');
    
        // Init the x and y scale objects.
        view.x = d3.scale.linear();
        view.y = d3.scale.linear();
    
        // For adjancent talk pages.
        view.tx = d3.scale.linear();
        view.ty = d3.scale.linear();
    
        // Must take into account the mask width here!
        var barWidth = this.calcBarWidth();
    
        // Set up x and y ranges for the visualization. The x-range is designed so that x(n) gives the x-position of the nth bar's left edge.
        view.x.range([0, barWidth]);
        // Leave a little bit of room.
        view.y.range([0, this.model.get('height')/2 - 50]);
        // Y domain determined using largest magnitude y-value
        view.y.domain([0, Helper.absMax(this.model.get('data').get('revisions'), function(elem) { return elem.loglev; })]);
    
        // Group to contain horizontal rules for the visualization
        view.rules = view.sview.append('g').attr('class', 'rules');
    
        // Positive and negative horizontal rules groups.
        var posrules = view.rules.append('g').attr('class', 'posrules');
        var negrules = view.rules.append('g').attr('class', 'negrules');
    
        // Generate actual rules
        posrules.selectAll('g.rule').data(view.y.ticks(5)).enter().append('g').attr('class', 'rule').attr('transform', function(d) { return 'translate(0,' + view.y(d) + ')'; });
        negrules.selectAll('g.rule').data(view.y.ticks(5)).enter().append('g').attr('class', 'rule').attr('transform', function(d) { return 'translate(0,' + (-view.y(d)) + ')'; });
    
        // Append lines to rules (i.e. visual representation of rules)
        view.rules.selectAll('.rule').append('line').attr('x2', Helper.width);
    
        // Append visualization body group. This group contains the actual visualization. By transforming this group, we transform all the bars and annotations of the visualization.
        view.body = view.sview.append('g').attr('class', 'body').attr('transform', 'translate(0,0)');
    
        var body = view.body;
        // Append x-axis
        view.sview.append('g').attr('class', 'xaxis').append('line').attr('x2', this.model.get('width'));
    
        // Y-label and mask group
        var ylabel = view.sview.append('g').attr('class', 'ylabel');
        // Append mask for y-label
        ylabel.append('rect').attr('class', 'ymask').attr('width', maskWidth).attr('height', this.model.get('height')).attr('y', -this.model.get('height')/2).attr('x', -maskWidth);
        // Append y-label string
        ylabel.append('text').attr('transform', 'translate(' + -(maskWidth-10) + ', 0)rotate(90, 0, 0)scale(1, -1)').text('Revision Size');
        var poslabels = ylabel.append('g');
        poslabels.selectAll('.yl').data(view.y.ticks(5)).enter().append('text').attr('class', 'yl')
            .attr('transform', function(d, i) { return 'translate(-8,' + (view.y(d)) + ')scale(1,-1)' }).text(function(d, i) {return (Math.exp(d)-1).toPrecision(3);});
        var neglabels = ylabel.append('g');
        neglabels.selectAll('.yl').data(view.y.ticks(5)).enter().append('text').attr('class', 'yl')
            .attr('transform', function(d, i) { return 'translate(-8,' + (-view.y(d)) + ')scale(1,-1)' }).text(function(d, i) {return (-Math.exp(d)+1).toPrecision(3);});
    
    
        // Set up layers for the body
        body.append('g').attr('class', 'bg');
        body.append('g').attr('class', 'mid');
        body.append('g').attr('class', 'fg');
    
        // Create a group for the article revision datum elements.
        view.data = body.select('g.mid').append('g').attr('class', 'data');
        var data = view.data;
    
        var datum = data.selectAll('.datum').data(this.model.get('data').get('revisions')).enter().append('g').attr('class', 'datum').attr('transform', $.proxy(function(d) { return 'translate(' + view.x(this.model.index(d)) + ', 0)'; }, this)).attr('opacity', 1);
        datum.append('title').text(function(d) {
            return d.group + ': ' + d.user + '\n' + Helper.formatDate(new Date(d.timestamp)) + '\n' + 'Revision Categories: ' + Helper.toClassString(d.class) + '\n' + 'Revision Size: ' + d.lev;
        });
        var bars = datum.append('g').attr('class', 'bars');
        this.buildBars(bars, barWidth);
        datum.append('text').attr('class', 'xlabel').text($.proxy(function(d) { return 1+this.model.index(d); }, this))
            .attr('transform', function() { return 'translate(0,' + String(-7) + ')scale(1,-1)rotate(90,0,0)'; });
        this.buildMonths();
    
        // Group for talk page data entries
        view.tdata = body.select('g.fg').append('g').attr('class', 'tdata');
        var tentries = view.tdata.selectAll('.tdatum').data(this.model.get('data').get('talk')).enter().append('g').attr('class', 'tdatum')
            .attr('transform', $.proxy(function(d) { return 'translate(' + view.x(this.model.index(d)) + ', 0)'; }, this)).attr('opacity', 0);
        this.appendCallout(tentries);
    
        //this.model.set('isTimeSpaced', false);
        
        // Init the timeX scale with the min and max dates
        var minDate = _.first(this.model.get('data').get('revisions')).date;
        this.model.timeX.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
                       _.last(this.model.get('data').get('revisions')).date]);
        
        // Apply default range to scale
        this.model.timeX.range([0, 5000]);
        
        // Remove "loading" message
        this.$('#view #view_loading').remove();
        
        // Init the navigation control
        this.navctl.init(this.$('#navctl').width(), 30);
        
        var dialog = null;
        if(this.view.subviews.toolbar.subviews.diag_select != undefined){
            dialog = this.view.subviews.toolbar.subviews.diag_select.dialog;
            // Populate user list in the 'select users' dialog.
            // TODO: Use the values from ownership_results instead
            var userMap = {};
            var revdata = this.model.get('data').get('revisions');
            var totalLev = 0;
            for (var i = 0; i < revdata.length; ++i) {
                if (!userMap.hasOwnProperty(revdata[i].user)) userMap[revdata[i].user] = 0;
                userMap[revdata[i].user] += parseInt(revdata[i].lev);
                totalLev += parseInt(revdata[i].lev);
            }
            var users = Array();
            for (u in userMap) {
                if (!userMap.hasOwnProperty(u)) continue;
                users.push([u, userMap[u] / totalLev]);
            }

            users.sort(function(a, b) {
                // Sort by contribution magnitude, descending
                return b[1]-a[1];
            });
            // Use d3 to populate the select element in the select users dialog with option elements
            d3.select($('#userselect', dialog)[0]).selectAll('option').data(users).enter().append('option').attr('value', function(d) { return d[0]; }).text(function(d) {
                var percent = d[1]*100;
                return d[0] + " (" + percent.toFixed(2).toString() + "%)";
            });
        }
        else if(this.view.subviews.toolbar.subviews.diag_articles != undefined){
            dialog = this.view.subviews.toolbar.subviews.diag_articles.dialog;
            var articles = this.model.get('data').get('articles');
            d3.select($('#userselect', dialog)[0]).selectAll('option').data(articles).enter().append('option').attr('value', function(d) { return d; }).text(function(d) {
                return d;
            });
        }

        
        // Clicking on one of the option elements should deselect all checkboxes
        $('#userselect option', dialog).click(function() {
            $('input[name=userclassselect]', dialog).each(function() {
                $(this).attr('checked', false);
            });
        });
        
        dialog = this.view.subviews.toolbar.subviews.diag_data.dialog;
        $(dialog).empty();
        // Use d3 to populate the "Content Details" dialog
        var dtable = d3.select(dialog[0]).append('table').attr('class', 'sortable');
        // Need to specify CSS classes for sorttable
        var headers = Array();
        if(this.model.get('data').get('user') != ""){
            headers.push(['Article Title', 'sorttable_alpha']);
        }
        headers.push(['Rev. Type', 'sorttable_alpha']);
        headers.push(['Revision Id', 'sorttable_numeric']);
        if(this.model.get('data').get('title') != ""){
            headers.push(['User', 'sorttable_alpha']);
        }
        headers.push(['User Group', 'sorttable_alpha']);
        headers.push(['Revision Date', 'sorttable_alpha']);
        headers.push(['Revision Size', 'sorttable_numeric']);
        headers.push(['Revision Categories', 'sorttable_alpha']);
        dtable.append('thead').append('tr').selectAll('th').data(headers)
            .enter().append('th').text(function (d) { return d[0]; }).attr('class', function (d) { return d[1]; });

        // Merge article and talk page revision data for the table.
        var i=0;
        var j=0;
        var revs = this.model.get('data').get('revisions');
        var tlk = this.model.get('data').get('talk');
        tlk = tlk.sort(function (l,r) {
            if (l.date == r.date) return 0;
            return (l.date > r.date)? 1:-1;
        });
        revs = revs.sort(function (l,r) {
            if (l.date == r.date) return 0;
            return (l.date > r.date)? 1:-1;
        });
        var mdata = [];
        while (i < revs.length && j < tlk.length) {
            if (revs[i].date < tlk[j].date) {
                mdata.push(revs[i]);
                ++i;
            } else {
                mdata.push(tlk[j]);
                ++j;
            }
        }
        if (i < revs.length) {
            mdata = mdata.concat(revs.slice(i));
        }
        if (j < tlk.length) {
            mdata = mdata.concat(tlk.slice(j));
        }
        
        var rows = dtable.append('tbody').selectAll('tr.data').data(mdata).enter().append('tr');
        if(this.model.get('data').get('user') != ""){
            rows.append('td').text(function (d) { return d.page_title; });
        }
        rows.append('td').text(function(d) {
            return (d.type === 'art')?('A'):('TP');
        });
        rows.append('td').text(function (d) { return d.revid; });
        if(this.model.get('data').get('title') != ""){
            rows.append('td').text(function (d) { return d.user; });
        }
        rows.append('td').text(function (d) { return d.group; });
        rows.append('td').text(function (d) { return Helper.formatDate(d.date); })
            .attr('sorttable_customkey', function(d) { return Helper.getDateSortKey(d.date); });
        rows.append('td').text(function (d) { return d.lev; });
        rows.append('td').text(function (d) {
            if (d.type === 'art') {
                return Helper.toClassString(d.class);
            } else if (d.type === 'talk') {
                return Helper.toTalkClassString(d);
            } else {
                return 'Undefined';
            }
        });
        rows.attr('class', function (d) {
            if (d.type === 'talk') return 'data talkrow';
            else return 'data defaultrow';
        });
        
        // Get the sorttable library to make this table sortable!
        sorttable.makeSortable($('table.sortable', dialog).get(0));

        // In our default mode hide the talk page entries
        $('.talkrow', dialog).addClass('invisible');
        
        this.updateMode();
        this.updateSpacing();
    },
    
    render: function(){
        return this.$el;
    }

});

subview = function(subviewName){
    return "<div data-subview='" + subviewName + "'></div>";
};

// From http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format
// Sort of like Python's new string formatting method. Handy when one wants to do some large string substitutions.
String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};

// ## Helper
Helper = function() {};

// Takes in a javascript date object and pretty-prints it to a string which is returned.
Helper.formatDate = function(dt, time) {
    if(time == undefined) time = true;
    var string = ['January', 'February', 'March',
        'April', 'May', 'June',
        'July', 'August', 'September',
        'October', 'November', 'December'][dt.getMonth()] +
        ' ' + dt.getDate() + ', ' + dt.getFullYear();
    if(time){
        // Thanks to http://stackoverflow.com/questions/5250244/jquery-date-formatting
        // for the quick fix for hours, minutes and seconds
        string += '   ' +
        ('0'+dt.getHours()).substr(-2,2) + ':' +
        ('0'+dt.getMinutes()).substr(-2,2);
    }
    return string;
};

// Build a sorting key for the sorttable library to sort the date field used in the table view.
Helper.getDateSortKey = function(dt) {
    return String(dt.getFullYear()) + ('0'+dt.getMonth()).substr(-2, 2) +
        ('0'+dt.getDate()).substr(-2, 2) + ('0'+dt.getHours()).substr(-2,2) +
        ('0'+dt.getMinutes()).substr(-2,2)+('0'+dt.getSeconds()).substr(-2,2);
};

// Take two lists, interpret as sets, and return true if subset_l is a subset of superset_l
Helper.isSubset = function(subset_l, superset_l) {
    var superset = {};
    for (var i = 0; i < superset_l.length; ++i) {
        superset[superset_l[i]] = true;
    }
    for (var i = 0; i < subset_l.length; ++i) {
        if (!superset.hasOwnProperty(subset_l[i])) {
            return false;
        }
    }
    return true;
};

// Generate a string describing a given article revisions' edit categories
Helper.toClassString = function(rc){
    return rc.split(';').map(function(c) { return ({
            'a': 'edit',
            'b': 'add',
            'c': 'remove',
            'd': 'reorganize',
            'e': 'cite',
            'f': 'vandalize',
            'g': 'unvandalize',
            'x': 'unclassified'
        })[c]; }).join(', ');
};

// Generate a string describing a given talk page revision entry's revision categories.
Helper.toTalkClassString = function(d) {
    var ret = "";
    if (d.att) ret += "attitude, ";
    if (d.crit) ret += "criticism, ";
    if (d.inf) ret += "informative, ";
    if (d.perf) ret += "performative, ";
    return ret.substring(0,ret.length-2);
};

// Return absolute max (disregarding sign) of func(arr[i])
Helper.absMax = function(arr, func){
    if (!(arr instanceof Array) || (arr.length < 1)) return undefined;
    var max = func(arr[0]);
    for (var i = 1; i < arr.length; ++i) {
        max = Math.max(max, Math.abs(func(arr[i])));
    }
    return max;
};

// ## router.js
$.ajaxSetup({ cache: false });

articles = new ArticleCollection();
articles.fetch();
topTabs = new TopTabCollection();
topTabsView = new TopTabsView({model: topTabs, el: "#topTabs"});

PageRouter = Backbone.Router.extend({
    routes: {
        "test": "testRoute",
        "*actions": "defaultRoute"
    },
    
    defaultRoute: function(actions){
        var newArticleView = new NewArticleView({model: articles});
        topTabsView.render();
        topTabs.add(new TopTab({title: "New Tab", mainView: newArticleView, selected: true}));
        topTabs.add(new NewTopTab());
    }
    
});

// Initiate the router
pageRouter = new PageRouter();

// Start Backbone history a necessary step for bookmarkable URL's
Backbone.history.start();

})(window,document);