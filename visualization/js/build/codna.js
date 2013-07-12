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
        'title': "",
        'rev_count': 0
    }

});

// ## ArticleCollection
ArticleCollection = Backbone.Collection.extend({
    
    model: Article,
    
    url: "dbquery.php?list"
    
});

// ## TopTab
TopTab = Backbone.Model.extend({

    initialize: function(){
        this.on('change:selected', function(){
            this.get('mainView').render();
        }, this);
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

// ## NewTopTab (used for a "+" button to create a new tab)
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

// ## WikiViz
WikiViz = Backbone.Model.extend({

    initialize: function(){
        // Create a fetch a new WikiVizData
        var data = new WikiVizData({title: this.get('title'), wikiviz: this});
        this.set('view', {	// View object is populated with more rendering-oriented variables.
		    timeX: d3.time.scale(),	// The time scale object for the TS X-axis
		    mode: 'art'	// Current viewing mode (article revision view by default)
	    });
	    this.set('weights', {	// The weights for computing the weighted-splitting of visualization bars.
		    add: 60,
		    remove: 60,
		    edit: 20,
		    reorganize: 40,
		    vand: 10,
		    unvand: 10,
		    cite: 20,
		    unclassified: 60
	    });
        data.fetch();
        this.set('data', data);
    },
    
    // Get a list of the user's groups ('higher-level groups') at the present time.
    // So far, this will always return one group, but we can expand on this later.
    getGroupsByName: function(username) {
        var users = this.get('data').get('users');
	    if(!users.hasOwnProperty(username)) return ['None'];	// If we don't have data for this user (for whatever reason), assume no groups.
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
	
	    while (i < user.history.length) {
		    if (new Date(user.history[i].timestamp) > revDate) break;
		    lastEntry = user.history[i];
		    ++i; 
	    }
	
	    // lastEntry now contains the relevant permission entry.
	    // Return the userclass and we are done.
	    return lastEntry.userclass;
    },
    
    defaults: {
        title: "",
        data: null,
        width: 910,	// Width and height of view area
	    height: 500,
	    numBars: 60,	// Default number of bars / screen to display in adjacent spacing mode
	    maskWidth: 50,	// Width of the mask for the y-axis labels
	    timeMultiplier: 1,	// UNUSED: Used to be used for generating "time offset" calues in data annotation.
	    isTimeSpaced: false,
	    weights: null,
	    view: null
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
		    var wclass = {	// Will eventually hold the formatted info for drawing.
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
        return "dbquery.php?" + "lower=0&upper=10000&article=" + this.get('title');
    },
    
    defaults: {
        title: "",
        wikiviz: null
    }
    
});

// ## ArticleView
ArticleView = Backbone.View.extend({
    
    template: _.template($("#main_container_template").html()),
    firstRender: true,
    wikiviz: null,
    navctl: null,
    
    initialize: function(){
        this.wikiviz = new WikiViz({title: this.model.get('title')});
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
        this.listenTo(this.wikiviz.get('data'), "sync", this.initViz);
        this.navctl = new NavCtlView({article: this});
        Backbone.Subviews.add(this);
    },
    
    subviewCreators : {
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
            var wikiviz = this.wikiviz;
            var article = this;
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
                            if ($(this).attr('checked')) {    // If the event is the checking of a checkbox
                                wikiviz.get('view').data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 1);
                            } else {    // Checkbox was unchecked
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
                        article.applyUserSelection(users);
                    });
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
            var wikiviz = this.wikiviz;
            var article = this;
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
                            if ($(this).attr('checked')) {    // If the event is the checking of a checkbox
                                for (var i in classMap[$(this).val()]) {
                                    wikiviz.get('view').data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 1);
                                }
                            } else {    // Checkbox was unchecked
                                for (var i in classMap[$(this).val()]) {
                                    wikiviz.get('view').data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 0.2);
                                }
                            }
                        
                            var selected = new Array();
                            $('#d_legend_accordion input:checked', dialog).each(function(i, v) {
                                $.merge(selected, classMap[$(v).val()]);
                            });
                        
                            article.navctl.bg.selectAll('rect').transition().duration(500).attr('opacity',
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
                            if ($(this).attr('checked')) {    // If the event is the checking of a checkbox
                                d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 1);
                            } else {    // Checkbox was unchecked
                                d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 0.2);
                            }
                            $('#t_deselect', dialog).button('enable');
                        });
                    });
                }
            });
        }
    },
    
    // Calculate bar width based on number of bars per screen
    calcBarWidth: function(){
        var w = (this.wikiviz.get('width') - this.wikiviz.get('maskWidth'))/(this.wikiviz.get('numBars'));
        if (this.wikiviz.get('isTimeSpaced')) { w = Math.min(w, 7); }
        return w;
    },
    
    // Calculate talk width based on number of talk entries per screen
    calcTalkWidth: function(){
        var w = (this.wikiviz.get('width') - this.wikiviz.get('maskWidth'))/(this.wikiviz.get('numDots'));
        return w;
    },

    getAdjacentTalkWidth: function(){
        return this.wikiviz.get('data').get('talk').length * 70; // width of one callout
    },
    
    // Get left edge of a given bar on the visualization
    getOffset: function(ind){
        if (!this.wikiviz.get('isTimeSpaced')) {
            return ind * this.calcBarWidth();
        } else {
            return this.wikiviz.get('data').get('revisions')[ind].dateOffset;
        }
    },
    
    // Calculate the inner width of a callout element based in its contents.
    getCalloutHeight: function(d){
        var ret = 0;
        var el_w = 29;    // Width of icon + padding
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
        this.wikiviz.get('view').body.select('.bg').selectAll('.month').data([]).exit().remove();
    },

    // Rescale x-axis based on the number of bars that should fit into a screen.
    setNumBars: function(numBars){
        if (numBars <= 0) return;    // Don't act on invalid values!
        this.wikiviz.set('numBars', numBars);
    
        this.wikiviz.get('view').x.range([0, this.calcBarWidth()]);
        if (!this.wikiviz.get('isTimeSpaced')){
            this.wikiviz.get('view').data.selectAll('.datum')
                .attr('transform', $.proxy(function(d) { return 'translate(' + this.wikiviz.get('view').x(this.wikiviz.index(d)) + ', 0)'; }, this));
        }
        var that = this;
        this.wikiviz.get('view').data.selectAll('.datum').selectAll('.bars rect').attr('width', this.calcBarWidth());
        // Hide x labels that would overlap!
        this.wikiviz.get('view').data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width <= that.calcBarWidth(); })
            .attr('opacity', 1);
        this.wikiviz.get('view').data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width > that.calcBarWidth(); })
            .attr('opacity', 0);
    
        // Need to update the month rectangles so that they use the new scale!
        this.buildMonths();
    },

    setNumDots: function(numDots){
        // Redraw dots here for talk page entries
        if (numDots <= 0) return;    // Don't act on invalid values!
        this.wikiviz.set('numDots', numDots);
    
        this.wikiviz.get('view').tx.range([0, this.calcTalkWidth()]);

        if (!this.wikiviz.get('isTimeSpaced')){
            this.wikiviz.get('view').tdata.selectAll('.tdatum')
                .attr('transform', $.proxy(function(d, i) { return 'translate(' + this.wikiviz.get('view').tx(i) + ', 0)'; }, this));
        }
        this.buildMonths();
    },
    
    // Highlight those entries that were made by users in userlist.
    // TODO: Apply selections to the scroll bar area and to the talk page contributions!
    applyUserSelection: function(userlist) {
        this.clearAllSelections();    // Clean up any previous selections!
    
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
            if (jQuery.inArray(this.wikiviz.getGroupsByName(userlist[i]), info['User Groups']) == -1) {
                info['User Groups'].push(this.wikiviz.getGroupsByName(userlist[i]));
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
        this.wikiviz.get('view').data.selectAll('.datum').filter(function (d) { return jQuery.inArray(d.user, userlist) === -1; }).selectAll('.bars rect').transition().duration(500).attr('opacity', 0.2);
    
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
        this.wikiviz.get('view').data.selectAll('.bars rect').transition().duration(500).attr('opacity', 1);
        this.wikiviz.get('view').data.selectAll('.datum').transition().duration(500).attr('opacity', 1);
    
        // Update nav control spikes
        this.navctl.spikes.transition().duration(500).attr('opacity', 1);
    
        // Re-enable any previously disabled selection controls
        this.$('#diag_legend input').removeAttr('disabled');
        this.$('#d_select_groups_accordion input').removeAttr('disabled');
    },
    
    // Switch visualization to time-spaced mode, or update time-spaced visualization
    // This is currently called by the slider element on a switch mode event.
    toTimeSpaced: function(){
        this.wikiviz.set('isTimeSpaced', true);
    
        // Re-position all article revision elements using the x axis time scale.
        d3.selectAll('.datum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.wikiviz.get('view').timeX(d.date) + ',0)';}, this))
            .selectAll('.bars rect').attr('width', this.calcBarWidth());
    
        // Re-position talk page entry callouts using the x-axis time scale.
        d3.selectAll('.tdatum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.wikiviz.get('view').timeX(d.date) + ',0)';}, this))
    
        // Update the month view.
        this.buildMonths();
    
        // Show the month view if we are in TS talk page mode.
        // This is because the month view is hidden in adj-talk page mode, but we want it for TS anyway.
        if (this.wikiviz.get('view').mode == "talk") {
            d3.selectAll('.month').attr('opacity', 1);
        }
    },
    
    // Switch visualization to adacent-spacing mode
    // Currently called by the slider element when a mode change event occurs.
    toAdjacentSpaced: function(){
        this.wikiviz.set('isTimeSpaced', false);
    
        // Hide the month view if we are in adjacent spacing talk-page mode.
        // (The month view does not make any sense in this mode)
        if (this.wikiviz.get('view').mode == "talk") {
            d3.selectAll('.month').attr('opacity', 0);
            this.wikiviz.get('view').tx.range([0, this.getAdjacentTalkWidth() ]);
        }

        // Re-position all article and talk-page contributions using adjacent-spacing parameters / axes.
        d3.selectAll('.datum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.wikiviz.get('view').x(this.wikiviz.index(d)) + ',0)';}, this))
            .selectAll('.bars rect').attr('width', this.calcBarWidth());
        
        d3.selectAll('.tdatum')
            .attr('transform', $.proxy(function(d, i) {return 'translate(' + this.wikiviz.get('view').tx(i) + ',0)';}, this));
        
        // Update the month view.
        this.buildMonths();
    },
    
    // Function to map revision data to rectangle groups that represent the data as a stacked bar graph.
    buildBars: function(barsGroup, barWidth){
        var posFields = ['add', 'unsure', 'reorganize', 'edit', 'cite', 'vand', 'unclassified'];
        var negFields = ['unvand', 'remove'];
    
        // For brevity
        var y = this.wikiviz.get('view').y;
        var index = this.wikiviz.index;
    
        // Make array to store partial sums of weighted attributes for each data element
        var sums = [];
        for (var i = 0; i < this.wikiviz.get('data').get('revisions').length; ++i) { sums[i] = 0; }    // Zero-out array
        _.each(posFields, function(v, i) {    // Build up the stacked bars. The sums array stores the sum of the last few stacked values' heights so that we can stack them properly
            barsGroup.filter(function (d) { return d.wclass[v] > 0.0001; }).append('rect').attr('y', function(d) { return y(sums[index(d)]); })
                .attr('width', barWidth).attr('height', function(d) { return y(d.wclass[v]); }).attr('class', v)
                .attr('desc', index).attr('opacity', 1);
            // Collect the sums of what we've seen so far so as to stack the bars properly
            for (var ind = 0; ind < this.wikiviz.get('data').get('revisions').length; ++ind) { sums[ind] += this.wikiviz.get('data').get('revisions')[ind].wclass[v]; }
        }, this);
    
        // The negatives are done the same way, but we have to change the role of the 'y' attribute.
        for (var i = 0; i < this.wikiviz.get('data').get('revisions').length; ++i) { sums[i] = 0; }    // Zero-out array
        _.each(negFields, function(v, i) {    // Build up the stacked bars. The sums array stores the sum of the last few stacked values' heights so that we can stack them properly
            barsGroup.filter(function (d) { return d.wclass[v] > 0.0001; }).append('rect').attr('y', function(d) { return -y(d.wclass[v]+sums[index(d)]); }).attr('width', barWidth)
                .attr('height', function(d) { return y(d.wclass[v]); }).attr('class', v).attr('desc', index).attr('opacity', 1);
            // Collect the sums of what we've seen so far so as to stack the bars properly
            for (var ind = 0; ind < this.wikiviz.get('data').get('revisions').length; ++ind) { sums[ind] += this.wikiviz.get('data').get('revisions')[ind].wclass[v]; }
        }, this);
    },
    
    // Create or Update month background rects.
    // These are the shaded rectangles in the background of the visualization that indicate periods of 1 month.
    // We need to build these to the correct scale so that they line up with the correct revisions.
    buildMonths: function (){
        var barWidth = this.calcBarWidth();
        var revdata = this.wikiviz.get('data').get('revisions');
        var blankThreshold = 10;    // Min. additional width of month box required to display text.
        //Helper.view.body.select('.bg').selectAll('.month').data([]).exit().remove();
        var data = [];
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
        // If the visualization is not time spaced, we need to go through our data, find month boundaries, and
        // build a list of the left and right offsets of the month rects on the visualization
        if (!this.wikiviz.get('isTimeSpaced')) {
            var lastDate = new Date(_.first(revdata).timestamp);
            var curDate;
            var lastIndex = 0;
            var lastRev = _.first(this.wikiviz.get('data').get('revisions'));
            for (var i = 1; i < revdata.length; ++i) {
                // We need to build width and offset positions for the various month groups
                // We do this by scanning through our bar graph data and appending to the month data as we go.
                curDate = new Date(revdata[i].timestamp);
                if (curDate.getMonth() !== lastDate.getMonth() || curDate.getYear() !== lastDate.getYear()) {
                    //var left = lastIndex * barWidth;
                    //var right = (i-1) * barWidth;
                    var left = this.getOffset(lastIndex);
                    var right = this.getOffset(i);
                    if (left === right) continue;
                    data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
                    lastDate = curDate;
                    lastIndex = i;
                }
            }
        
            var left = this.getOffset(lastIndex);
            var right = this.getOffset(revdata.length);
            data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
        } else {    // If we ARE in time-separated mode, we need to loop through all the months between the first and last edits
                // and add them all.
                // We use the timeX scale to find the left and right boundaries.
            var lastMonth;
            var first = true;
            var timeX = this.wikiviz.get('view').timeX;
            for (var m = _.first(this.wikiviz.get('data').get('revisions')).date.getMonth(),
                 y = _.first(this.wikiviz.get('data').get('revisions')).date.getFullYear();
                 m <= _.last(this.wikiviz.get('data').get('revisions')).date.getMonth() || y <= _.last(this.wikiviz.get('data').get('revisions')).date.getFullYear();
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
        }
    
        var mts_e = this.wikiviz.get('view').body.select('.bg').selectAll('.month').data(data, function(d, i) { return i; }).enter();
        var mts_g = mts_e.append('g').attr('class', 'month').attr('transform', function(d) { return 'translate(' + d.l + ',0)'; });
        mts_g.append('rect').attr('height', String(this.wikiviz.get('height'))).attr('width', function(d) { return (d.r-d.l); })
            .attr('class', function(d, i) { return (i%2 === 0)?('m_odd'):('m_even');}).attr('y', String(-this.wikiviz.get('height')/2));
        mts_g.append('text').attr('class', 'mtext').text(function(d) { return months[d.m]; }).attr('transform', $.proxy(function(d) { return 'translate(5,' + (this.wikiviz.get('height')/2 - 15) + ')scale(1,-1)';}, this)).attr('opacity', 1).filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
        mts_g.append('text').attr('class', 'ytext').text(function(d) { return String(d.y); }).attr('transform', $.proxy(function(d) { return 'translate(5,' + (this.wikiviz.get('height')/2 - 30) + ')scale(1,-1)';}, this)).attr('opacity', 1).filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
    
    
        mts = this.wikiviz.get('view').body.selectAll('.month').data(data, function(d, i) { return i; });
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
    
        var mts_x = mts.exit();
        mts_x.attr('opacity', 0).remove();
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
        var cr = 5;    // Corner radius in px
    
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
            ox, oy,    // Coords of left bottom of callout "box" rel. to "origin"
            this.getCalloutHeight(d) + 2*px - 2*cr,
            cr,    // Corner radius
            cw + 2*py - cr,
            this.getCalloutHeight(d) + 2*px - cr - 10,
            cw + 2*py - 2*cr    // Last number here is the width of the wide-end of the callout triangle
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
    
    // Init the buttons on the toolbar.
    createToolbar: function() {
        /*$('#t_cursor').button({
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
        });*/
        this.$('#t_select').button({
            icons: {
                primary: 'icon-users'
            },
            text: false
        });
        /*$('#t_info').button({
            icons: {
                primary: 'ui-icon-info'
            },
            text: false
        });*/
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
        
        this.$('#t_deselect').click($.proxy(function() { this.clearAllSelections(true); }, this));
    
        this.$('#t_talk').button({
            icons: {
                primary: 'icon-talk'
            },
            text: false,
            disabled: true
        });
    },
    
    // Bind the buttons to their respective actions.
    bindToolbar: function() {
        this.$('#t_cursor').click($.proxy(function() {
            this.subviews.diag_cursor.open();
        }, this));
        this.$('#t_options').click($.proxy(function() {
            this.subviews.diag_options.open();
        }, this));
        this.$('#t_select').click($.proxy(function() {
            this.subviews.diag_select.open();
        }, this));
        this.$('#t_info').click($.proxy(function() {
            this.subviews.diag_info.open();
        }, this));
        this.$('#t_data').click($.proxy(function() {
            this.subviews.diag_data.open();
        }, this));
        this.$('#t_legend').click($.proxy(function() {
            this.subviews.diag_legend.open();
        }, this));
        this.$('#t_talk').click($.proxy(function() {
            this.subviews.diag_talk.open();
        }, this));
    },
    
    // Init visualization with a given article.
    init: function(art_title) {
        // Create UI components
        this.createToolbar();
    
        this.$('#viewtabs').tabs();
    
        this.$('.spacing_wrapper').mouseenter(function() {
            $(this).css('opacity', 1);
        }).mouseleave(function() {
            $(this).css('opacity', 0.8);
        });
    
        // Bind UI components to functionality
        this.bindToolbar();
    
        this.wikiviz.set('isTimeSpaced', false);
    
        // TODO: Move this code to a more appropriate place?
    
        // Program the 'to adjacent spacing' and 'to time spacing' mode buttons with
        // appropriate functionality.
        this.$('#toAdj').button().attr('title', 'Adjacent Spacing');
        this.$('#toTime').button().attr('title', 'Time Spacing');
    
        this.$('#toAdj').click($.proxy(function() {
            this.navctl.toAdjacentSpaced();
            this.$('#toAdj').button('disable');
            this.$('#toTime').button('enable');
        }, this));
        this.$('#toTime').click($.proxy(function() {
            this.navctl.toTimeSpaced();
            this.$('#toAdj').button('enable');
            this.$('#toTime').button('disable');
        }, this));
    
        this.$('a[href=#artview]').click($.proxy(function(event, ui) {
            this.$('#view').appendTo(this.$('#artview'));
            this.wikiviz.get('view').data.selectAll('.datum').attr('opacity', 1);
            d3.selectAll('.sd').attr('opacity', 1);
            d3.selectAll('.tdatum').attr('opacity', 0);
            d3.selectAll('.tcircle').attr('opacity', 0);
        
            this.$('#t_legend').button('enable');
            this.$('#t_talk').button('disable');
        
            this.$('#toAdj').button('enable');
        
            d3.selectAll('.month').attr('opacity', 1);
        
            this.wikiviz.get('view').mode = 'art';
        
            if (this.wikiviz.get('isTimeSpaced') === false) {
                this.$('#toAdj').button('disable');
                this.$('#toTime').button('enable');
                this.navctl.toAdjacentSpaced();
            } else {
                this.$('#toAdj').button('enable');
                this.$('#toTime').button('disable');
                this.navctl.toTimeSpaced();
            }
        
            this.navctl.onScale();
        
            this.$('.talkrow').addClass('invisible');
            this.$('.defaultrow').removeClass('invisible');
        
            d3.select(this.$('.fg')[0]).attr('transform', 'translate(0, -500)');
        
            d3.selectAll('g.ylabel').attr('opacity', 1);
        }, this));
        this.$('a[href=#talkview]').click($.proxy(function(event, ui) {
            this.$('#view').appendTo(this.$('#talkview'));
            this.wikiviz.get('view').data.selectAll('.datum').attr('opacity', 0);
            d3.selectAll('.sd').attr('opacity', 0);
            d3.selectAll('.tdatum').attr('opacity', 1);
            d3.selectAll('.tcircle').attr('opacity', 1);
        
            $('#t_legend').button('disable');
            $('#t_talk').button('enable');
        
            this.wikiviz.get('view').mode = 'talk';
        
            if (this.wikiviz.get('isTimeSpaced') === false) {
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
        
            this.$('.talkrow').removeClass('invisible');
            this.$('.defaultrow').addClass('invisible');
        
            d3.select(this.$('.fg')[0]).attr('transform', 'translate(0, 0)');
        
            d3.selectAll('g.ylabel').attr('opacity', 0);
        }, this));
        this.$('a[href=#hybridview]').click($.proxy(function(event, ui) {
            this.$('#view').appendTo(this.$('#hybridview'));
            this.wikiviz.get('view').data.selectAll('.datum').attr('opacity', 1);
            d3.selectAll('.sd').attr('opacity', 1);
            d3.selectAll('.tdatum').attr('opacity', 1);
            d3.selectAll('.tcircle').attr('opacity', 1);

        
            this.$('#t_legend').button('enable');
            this.$('#t_talk').button('enable');
        
            this.$('#toAdj').button('disable');
            this.$('#toTime').button('disable');
        
            this.wikiviz.get('view').mode = 'hybrid';
            this.navctl.toTimeSpaced();
        
            d3.selectAll('.month').attr('opacity', 1);
        
            this.$('.talkrow').removeClass('invisible');
            this.$('.defaultrow').removeClass('invisible');
        
            d3.select(this.$('.fg')[0]).attr('transform', 'translate(0, 0)');
            d3.selectAll('g.ylabel').attr('opacity', 1);
        }, this));
    
        // In the default configuration, we are already in adjacent spacing mode, so we can disable the adjacent spacing button.
        this.$('#toAdj').button('disable');
    },
    
    // Initialize the visualization. Create SVG and elements correspondng to data.
    initViz: function(){
        // For brevity
        var maskWidth = this.wikiviz.get('maskWidth');  // Width of mask over which y label is written
        var view = this.wikiviz.get('view');
        
        view.svg = d3.select(this.$('#view')[0]).append('svg').attr('width', this.wikiviz.get('width')).attr('height', this.wikiviz.get('height'));
    
        // Re-arrange coordinate system by setting x=0 to the center of the SVG and flipping the y-axis values.
        // Also, set y=0 offset by maskWidth to the left to simplify math regarding the position of the y-axis title and masking rect.
        view.sview = view.svg.append('g').attr('width', this.wikiviz.get('width')).attr('transform', 'translate(' + (maskWidth) + ',' + (this.wikiviz.get('height')/2) + ')scale(1,-1)');
    
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
        view.y.range([0, this.wikiviz.get('height')/2 - 50]);    // Leave a little bit of room.
        view.y.domain([0, Helper.absMax(this.wikiviz.get('data').get('revisions'), function(elem) { return elem.loglev; })]);    // Y domain determined using largest magnitude y-value
    
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
        view.sview.append('g').attr('class', 'xaxis').append('line').attr('x2', this.wikiviz.get('width'));
    
        // Y-label and mask group
        var ylabel = view.sview.append('g').attr('class', 'ylabel');
        // Append mask for y-label
        ylabel.append('rect').attr('class', 'ymask').attr('width', maskWidth).attr('height', this.wikiviz.get('height')).attr('y', -this.wikiviz.get('height')/2).attr('x', -maskWidth);
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
    
        var datum = data.selectAll('.datum').data(this.wikiviz.get('data').get('revisions')).enter().append('g').attr('class', 'datum').attr('transform', $.proxy(function(d) { return 'translate(' + view.x(this.wikiviz.index(d)) + ', 0)'; }, this)).attr('opacity', 1);
        datum.append('title').text(function(d) {
            return d.group + ': ' + d.user + '\n' + Helper.formatDate(new Date(d.timestamp)) + '\n' + 'Revision Categories: ' + Helper.toClassString(d.class) + '\n' + 'Revision Size: ' + d.lev;
        });
        var bars = datum.append('g').attr('class', 'bars');
        this.buildBars(bars, barWidth);
        datum.append('text').attr('class', 'xlabel').text($.proxy(function(d) { return 1+this.wikiviz.index(d); }, this))
            .attr('transform', function() { return 'translate(0,' + String(-7) + ')scale(1,-1)rotate(90,0,0)'; });
        this.buildMonths();
    
    
        view.tdata = body.select('g.fg').append('g').attr('class', 'tdata');    // Group for talk page data entries
        var tentries = view.tdata.selectAll('.tdatum').data(this.wikiviz.get('data').get('talk')).enter().append('g').attr('class', 'tdatum')
            .attr('transform', $.proxy(function(d) { return 'translate(' + view.x(this.wikiviz.index(d)) + ', 0)'; }, this)).attr('opacity', 0);
        this.appendCallout(tentries);
    
        this.toAdjacentSpaced();
        
        // Init the timeX scale with the min and max dates
        var minDate = _.first(this.wikiviz.get('data').get('revisions')).date;
        this.wikiviz.get('view').timeX.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
                       _.last(this.wikiviz.get('data').get('revisions')).date]);
        
        // Apply default range to scale
        this.wikiviz.get('view').timeX.range([0, 5000]);
        
        // Remove "loading" message
        this.$('#view #view_loading').remove();
        
        // Init the navigation control
        this.navctl.init(920, 30);
        
        var dialog = this.subviews.diag_select.dialog;
        // Populate user list in the 'select users' dialog.
        var userMap = {};
        var revdata = this.wikiviz.get('data').get('revisions');
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
            return b[1]-a[1]; // Sort by contribution magnitude, descending
        });

        // Use d3 to populate the select element in the select users dialog with option elements
        d3.select($('#userselect', dialog)[0]).selectAll('option').data(users).enter().append('option').attr('value', function(d) { return d[0]; }).text(function(d) {
            var percent = d[1]*100;
            return d[0] + " (" + percent.toFixed(2).toString() + "%)";
        });
        // Clicking on one of the option elements should deselect all checkboxes
        $('#userselect option', dialog).click(function() {
            $('input[name=userclassselect]', dialog).each(function() {
	            $(this).attr('checked', false);
            });
        });
        
        dialog = this.subviews.diag_data.dialog;
        // Use d3 to populate the "Content Details" dialog
        var dtable = d3.select(dialog[0]).append('table').attr('class', 'sortable');
        dtable.append('thead').append('tr').selectAll('th').data([	// Need to specify CSS classes for sorttable
            ['Rev. Type', 'sorttable_alpha'],
            ['ID', 'sorttable_numeric'],
            ['User', 'sorttable_alpha'],
            ['User Group', 'sorttable_alpha'],
            ['Revision Date', 'sorttable_alpha'],
            ['Revision Size', 'sorttable_numeric'],
            ['Revision Categories', 'sorttable_alpha'],
            ])
            .enter().append('th').text(function (d) { return d[0]; }).attr('class', function (d) { return d[1]; });

        // Merge article and talk page revision data for the table.
        var i=0;
        var j=0;
        var revs = this.wikiviz.get('data').get('revisions');
        var tlk = this.wikiviz.get('data').get('talk');
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
        rows.append('td').text(function(d) {
            return (d.type === 'art')?('A'):('TP');
        });
        rows.append('td').text(function(d) { return 1+d.id; });
        rows.append('td').text(function (d) { return d.user; });
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
    },
    
    render: function(){
        //this.container = this.$("#maincontainer");
        if(topTabs.getSelected() != null && topTabs.getSelected().get('mainView') == this){
            this.$el.html(this.contents);
        }
        else{
            this.contents = this.$el.children().detach();
        }
        if(this.firstRender){
            this.$el.html(this.template());
            this.init(this.model.get('title'));
            // TODO: Remove this when everything is working:
            // Helper.init(this.model.get('title'));
        }
        this.firstRender = false;
        return this.$el;
    }
    
});

// ## DialogView
DialogView = Backbone.View.extend({
    
    dialog: null, // Reference to the jQueryUI Dialog
    options: null, // Options object for the dialog
    onCreate: function(){}, // Function to be called after the dialog is created
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
        this.article = options.article;
    },
    
    // Adjust the slider when we switch to time-spaced mode.
    // Use a new time-spaced scale for display.
    toTimeSpaced: function() {
	
	    var minDate = _.first(this.article.wikiviz.get('data').get('revisions')).date;
	
	    this.xscale = d3.time.scale();
	    // Todo: domain of talk entries may exceed revisions
	    this.xscale.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
		    _.last(this.article.wikiviz.get('data').get('revisions')).date]);
	    this.xscale.range([0, this.dim.w - 2*this.handleWidth]);
	
	    var that = this;
	
	    this.bg.select('g.navbars').selectAll('rect.sd').data(this.article.wikiviz.get('data').get('revisions'))
		    .attr('x', function(d,i) { return that.xscale(d.date); })
		    .attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
		    .attr('width', function(d,i) { return that.spikewidth; })
		    .attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
		    .attr('class', 'sd');
		
	    this.bg.select('g.navbars').selectAll('circle.tcircle').data(this.article.wikiviz.get('data').get('talk'))
		    .attr('cx', function(d) { return that.xscale(d.date); });
			
	    this.mode = 'time';
	
	    this.article.toTimeSpaced();
	
	    this.onSlide();
	    this.onScale();
    },

    // When we switch to adjacent-spaced mode, switch back to using a linear scale for display.
    toAdjacentSpaced: function() {
	
	    this.xscale = d3.scale.linear();
	
	    if (this.article.wikiviz.get('view').mode == 'talk')
		    this.xscale.domain([0, this.article.wikiviz.get('data').get('talk').length-1]);
	    else
		    this.xscale.domain([0, this.article.wikiviz.get('data').get('revisions').length-1]);
		
	    this.xscale.range([0, this.dim.w - 2*this.handleWidth]);
	
	    var that = this;
	
	    this.bg.select('g.navbars').selectAll('rect.sd').data(this.article.wikiviz.get('data').get('revisions'))
		    .attr('x', function(d,i) { return that.xscale(i); })
		    .attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
		    .attr('width', function(d,i) { return that.spikewidth; })
		    .attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
		    .attr('class', 'sd');
	
	    this.bg.select('g.navbars').selectAll('circle').data(this.article.wikiviz.get('data').get('talk'))
		    .attr('cx', function(d, i) { return that.xscale(i); });
	
	    this.mode = 'adj';
	
	    this.article.toAdjacentSpaced();
	
	    this.onSlide();
	    this.onScale();
    },

    // Slide the view when we slide the slider.
    onSlide: function() {
	    d3.select(this.article.$('g.body')[0]).attr('transform', 'translate(' + -this.getPanOffset() + ',0)')
    },

    onScale: function() {
	    if (this.mode == 'adj' && this.article.wikiviz.get('view').mode == 'art') { this.article.setNumBars(this.getNumBars()); }
	    else if (this.mode == 'adj' && this.article.wikiviz.get('view').mode == 'talk') { this.article.setNumDots(this.getNumBars()); }
	    else if (this.mode == 'time') {
		    var df = _.last(this.article.wikiviz.get('data').get('revisions')).date;
		    var d0 = _.first(this.article.wikiviz.get('data').get('revisions')).date;
		    var d1 = this.xscale.invert(this.sdim.x0);
		    var d2 = this.xscale.invert(this.sdim.x0+this.sdim.w-this.handleWidth);
		
		    // The multiplier 0.9 is a quick fix for getting the rightmost bars in TS mode visible.
		    this.article.wikiviz.get('view').timeX.range([0, 0.9*this.article.wikiviz.get('width') * (df-d0) / (d2 - d1)]);
		    this.article.toTimeSpaced();
	    }
    },

    // Map slider motion to an offset by which to pan the main view. Behaves differently for time and adjacent spaced modes.
    getPanOffset: function() {
	    if (this.mode == 'adj' && this.article.wikiviz.get('view').mode == 'art') {
		    return ((this.sdim.x0) / (this.dim.w - 2*this.handleWidth))*(this.article.wikiviz.get('data').get('revisions').length*this.article.calcBarWidth());
	    }
	    else if (this.mode == 'adj' && this.article.wikiviz.get('view').mode == 'talk') {
		    return ((this.sdim.x0) / (this.dim.w - 2*this.handleWidth))*(this.article.wikiviz.get('data').get('talk').length*this.article.calcTalkWidth());
	    }
	    else if (this.mode == 'time') {
		    return this.article.wikiviz.get('view').timeX(this.xscale.invert(this.sdim.x0));
	    }
	    return 0;
    },

    getNumBars: function() {
	    return this.xscale.invert(this.sdim.x0+this.sdim.w-this.handleWidth) - this.xscale.invert(this.sdim.x0);
    },

    getTimeRange: function() {
	
    },
    
    init: function(sw, sh) {
	    // Scrollbar dimensions
	    this.dim = {w: sw, h: sh};
	
	    this.sdim = {x0: 0, w: 100};
	
	    // Create the SVG element for the scrollbar
	    this.svg = d3.select(this.article.$('#navctl')[0]).append('svg').attr('width', this.dim.w).attr('height', this.dim.h);
	    this.bg = this.svg.append('g').attr('class', 'bg');	// Make a background layer
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
	    this.xscale.domain([0, this.article.wikiviz.get('data').get('revisions').length-1]);
	    this.xscale.range([0, this.dim.w - 2*handleWidth]);
	
	    this.yscale = d3.scale.linear();
	    this.yscale.domain(this.article.wikiviz.get('view').y.domain());
	    this.yscale.range([0, this.dim.h/2]);
	
	    var that = this;
	
	    this.spikewidth = (this.dim.w-2*handleWidth) / this.article.wikiviz.get('data').get('revisions').length;
	
	    this.spikes = this.bg.select('g.navbars').selectAll('rect.sd').data(this.article.wikiviz.get('data').get('revisions'));
	    this.spikes.enter().append('rect')
		    .attr('x', function(d,i) { return that.xscale(i); })
		    .attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
		    .attr('width', function(d,i) { return that.spikewidth; })
		    .attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
		    .attr('class', 'sd');
		
	    // Draw talk page entries, need to manually keep this in sync with appendCallout for now
	
	    this.dots = this.bg.select('g.navbars').selectAll('circle.td').data(this.article.wikiviz.get('data').get('talk')).enter().append('circle')
		    .attr('class', 'td');

	    // Max circle radius
	    var maxR = 5;
	    var fact = 0.6;

	    // Append circle to our element. Cap the circle size and re-style the circle if it has reached the cap.
	    this.dots.filter(function(d) { return Math.log(d.lev+1)*fact <= maxR; }).attr('r', function(d) { return Math.log(d.lev+1)*fact; }).attr('class', 'tcircle');
	    this.dots.filter(function(d) { return Math.log(d.lev+1)*fact > maxR; }).attr('r', maxR).attr('class', 'tcircle_full');
	
	    this.mode = 'adj';
	
	    this.sd = { dx: 0 };
	
	    // Event handlers for the slider
	    // The slider "dragging" state is stored as a CSS class.
	    this.article.$('.chandle').mousedown(function(event) {
		    $(this).addClass('dragging');
		    that.sd.dx = event.pageX - that.sdim.x0;
		    event.preventDefault();
	    });
	    this.article.$('.lhandle').mousedown(function(event) {
		    $(this).addClass('dragging');
		    that.sd.dx = event.pageX - that.sdim.x0;
		    event.preventDefault();
	    });
	    this.article.$('.rhandle').mousedown(function(event) {
		    $(this).addClass('dragging');
		    that.sd.dx = event.pageX;
		    event.preventDefault();
	    });
	
	    // More event handlers. These deal with dragging the slider.
	    $(document).mousemove($.proxy(function(event) {
		    if (this.article.$('.rhandle').hasClass('dragging')) {
			    var dw = (event.pageX - this.sd.dx);
			    this.sd.dx = event.pageX;
			    var newW = +this.sdim.w +dw;
			
			    if (newW < handleWidth) newW = handleWidth;
			    if (newW + this.sdim.x0 + handleWidth > this.dim.w) newW = this.dim.w-this.sdim.x0-handleWidth;
			    this.sdim.w = newW;
			    
			    this.article.$('.chandle').attr('width', this.sdim.w - handleWidth);
			    this.article.$('.rhandlegrp').attr('transform', 'translate(' + (+this.sdim.w) + ',0)')
			    this.onScale();
			    this.onSlide();
		    }
		    if (this.article.$('.lhandle').hasClass('dragging')) {
			    var newX0 = (event.pageX - this.sd.dx);
			    if (newX0 < 0) newX0 = 0;
			    if (newX0 > this.sdim.x0 + this.sdim.w - handleWidth) newX0 = this.sdim.x0 + this.sdim.w - handleWidth;
			
			    var newW = +this.sdim.w - (+newX0 - +this.sdim.x0);
			    if (newW < handleWidth) {
				    newW = handleWidth;
			    }
			
			    this.sdim.x0 = newX0;
			    this.sdim.w = newW;
			
			    this.article.$('.slider').attr('transform', 'translate(' + (this.sdim.x0) + ',0)');
			    this.article.$('.chandle').attr('width', this.sdim.w - handleWidth);
			    this.article.$('.rhandlegrp').attr('transform', 'translate(' + (+this.sdim.w) + ',0)')
			    this.onScale();
			    this.onSlide();
		    }
		    if (this.article.$('.chandle').hasClass('dragging')) {
			    this.sdim.x0 = (event.pageX - this.sd.dx);
			
			    if (this.sdim.x0 < 0) this.sdim.x0 = 0;
			    if (this.sdim.x0 > this.dim.w - ((handleWidth) + this.sdim.w)) this.sdim.x0 = this.dim.w - ((handleWidth) + this.sdim.w);
			    this.article.$('.slider').attr('transform', 'translate(' + (this.sdim.x0) + ',0)');
			    this.onSlide();
		    }
	    }, this));
	    // Once the mouse is released, reset the slider "dragging" state.
	    $(document).mouseup($.proxy(function() {
		    this.article.$('.chandle').removeClass('dragging');
		    this.article.$('.lhandle').removeClass('dragging');
		    this.article.$('.rhandle').removeClass('dragging');
	    }, this));
	
	    this.handleWidth = handleWidth;
	
	    // Call these to update the slider for the first time.
	    this.onSlide();
	    this.onScale();
    }
});

// ## NewArticleView
NewArticleView = Backbone.View.extend({    
    
    template: _.template($("#new_article_template").html()),
    firstRender: true,
    
    initialize: function(){
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
        this.listenTo(this.model, 'sync', this.render);
    },
    
    events: {
        "click #initiative .option": "clickInitiative",
        "click #project .option": "clickProject",
        "click #analyse button": "clickAnalyse"
    },
    
    // Triggered when one of the options in the initiative list is clicked
    clickInitiative: function(e){
        this.$("#initiative .option").not(e.currentTarget).removeClass('selected');
        $(e.currentTarget).toggleClass('selected');
        this.renderProjects();
        if(this.$("#project").css('display') == 'none' &&
           this.$("#initiative .option.selected").length > 0){
            this.$("#project").show('slide', 400);
        }
        else if(this.$("#project").css('display') != 'none' && 
                this.$("#initiative .option.selected").length == 0){
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
        var title = this.$("#project .option.selected .label").text();
        var articleView = new ArticleView({model: this.model.findWhere({'title': title})});
        topTabs.getSelected().set({
            'title': title,
            'mainView': articleView,
            'color': "#ABD1EB", 
            'hoverColor':"#9EC0D9"
        });
        articleView.render();
        topTabsView.render();
        this.remove();
    },
    
    // Renders the initiatives list
    renderInitiatives: function(){
        this.$("#initiative").tabs();
    },
    
    // Renders the projects/contributors list
    renderProjects: function(){
        this.$("#project #tabs-project .select").empty();
        this.model.each(function(article){
            this.$("#project #tabs-project .select").append("<div class='option'><span class='label'>" + article.get('title') + "</span><span class='count'>(" + article.get('rev_count') + " edits)</span></div>");
        });
        this.$("#project").tabs();
    },
    
    render: function(){
        if(topTabs.getSelected() != null && topTabs.getSelected().get('mainView') == this){
            this.$el.css('display', 'block');
        }
        else{
            this.$el.css('display', 'none');
        }
        if(this.firstRender){
            this.$el.html(this.template(this.model.toJSON()));
            this.renderInitiatives();
            this.renderProjects();
        }
        this.firstRender = false;
	    return this.$el;
	}
});

// ## TopTabsView
TopTabsView = Backbone.View.extend({

    views: new Array(),

    initialize: function(){
        this.listenTo(this.model, 'add', this.render);
        this.listenTo(this.model, 'remove', this.render);
    },
    
    // Orders each tab and spacing them correctly.
    // 
    // First the tabs are sorted based on their x position,
    // then they are spaced and rerendered.
    order: function(){
        this.model.sort();
        var startX = TopTabsView.leftMargin;
        var widthEstimate = ((1000-30-30-TopTabsView.spacing)/(this.model.length-1)) - 25 - 10 - TopTabsView.spacing;
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
                console.log(widthSum, actualSum);
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

TopTabsView.leftMargin = 15; // Left margin for first tab
TopTabsView.spacing = 5; // Spacing between tabs

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
Helper.formatDate = function(dt) {
	return ['January', 'February', 'March',
		'April', 'May', 'June',
		'July', 'August', 'September',
		'October', 'November', 'December'][dt.getMonth()] +
		' ' + dt.getDate() + ', ' + dt.getFullYear() + '   ' +
		('0'+dt.getHours()).substr(-2,2) + ':' +
		('0'+dt.getMinutes()).substr(-2,2);	// Thanks to http://stackoverflow.com/questions/5250244/jquery-date-formatting
							// for the quick fix for hours, minutes and seconds!
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

$.ajaxSetup({ cache: false });

articles = new ArticleCollection(); // TODO: Change this.  This should be in NewArticleView, not globally defined
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