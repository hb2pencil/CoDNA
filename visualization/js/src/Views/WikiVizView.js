// ## WikiVizView
WikiVizView = Backbone.View.extend({

    mouseX: 0,
    mouseY: 0,

    initialize: function(options){
        this.listenTo(this.model.get('data'), "sync", this.initViz);
        this.navctl = new NavCtlView({viz: this});
        this.sentences = new SentencesView({model: new Sentences({articleId: this.model.get('article_id'), setId: this.model.get('set')}), viz: this});
        this.view = options.view;
        this.listenTo(this.model, "change:width", $.proxy(function(){
            this.initViz();
            this.buildMonths();
            this.sentences.render();
        }, this));
        this.listenTo(this.model, "change:height", $.proxy(function(){
            this.initViz();
            this.buildMonths();
            this.sentences.render();
        }, this));
        this.listenTo(this.model, "change:numDots", this.updateDots);
        this.listenTo(this.model, "change:numBars", this.updateBars);
        this.listenTo(this.model, "change:mode", this.updateMode);
        this.listenTo(this.model, "change:isTimeSpaced", this.updateSpacing);
        this.$el.click($.proxy(function(e){
            if(!$(e.target).hasClass('quality') && !$(e.target).hasClass('event')){
                this.$(".tooltip").hide();
            }
        }, this));
        this.$("#view").mousemove($.proxy(function(e){
            this.mouseX = e.offsetX==undefined?e.originalEvent.layerX:e.offsetX;
            this.mouseY = e.offsetY==undefined?e.originalEvent.layerY:e.offsetY;
        }, this));
        $(window).resize($.proxy(function(){
            if(this.$("#view").width() > 0 || this.$("#ownershipvis").width() > 0){
                var width = Math.max(this.$("#view").width(), this.$("#ownershipvis").width());
                var height = Math.max(this.$("#view").height(), this.$("#ownershipvis").height());
                this.model.set('width', width);
                this.model.set('height', height);
            }
        }, this));
    },

    // Calculate bar width based on number of bars per screen
    calcBarWidth: function(){
        var w;
        if(this.model.get('mode') == 'ownership'){
            // When using the ownership visualization, there is no mask
            w = this.model.get('width')/((this.model.get('numBars')*(_.size(this.sentences.model.get('revisions'))/this.sentences.model.get('nRevisions')))*2 - 1);
        }
        else{
            // Consider the ymask when calculation the bar width
            w = (this.model.get('width') - this.model.get('maskWidth'))/(this.model.get('numBars'));
        }
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
        if (d.att !== 0 && d.att !== null) { ret += el_w; }
        if (d.crit !== 0 && d.crit !== null) { ret += el_w; }
        if (d.inf !== 0 && d.inf !== null) { ret += el_w; }
        if (d.perf !== 0 && d.perf !== null) { ret += el_w; }
        return ret;
    },
    
    // Generate an array of callout classification images based on the talk-page
    // entry that is represented by that callout.
    genCalloutImageSet: function(d){
        var imgs = [];
        if (d.att !== 0 && d.att !== null) { imgs.push('att'); }
        if (d.crit !== 0 && d.crit !== null) { imgs.push('crit'); }
        if (d.inf !== 0 && d.inf !== null) { imgs.push('inf'); }
        if (d.perf !== 0 && d.perf !== null) { imgs.push('perf'); }
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
    
    // Calls the correct update function depending on the current mode
    update: function(){
        if(this.model.get('mode') == 'art'){
            this.updateBars();
        }
        else if(this.model.get('mode') == 'talk'){
            this.updateDots();
        }
        else if(this.model.get('mode') == 'hybrid'){
            this.updateBars();
            this.updateDots();
        }
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
        if(this.model.get('mode') == 'ownership'){
            return false;
        }
        var barWidth = this.calcBarWidth();
        this.model.get('view').x.range([0, barWidth]);
        if(!this.model.get('isTimeSpaced')){
            this.model.get('view').data.selectAll('.datum')
                .attr('transform', $.proxy(function(d) { return 'translate(' + this.model.get('view').x(this.model.index(d)) + ', 0)'; }, this));
        }
        this.model.get('view').data.selectAll('.datum').selectAll('.bars rect').attr('width', barWidth);
        // Hide x labels that would overlap!
        try{
            // This can sometimes fail, so gracefully fail if it does
            /*this.model.get('view').data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width <= barWidth; })
                .attr('opacity', 1);
            this.model.get('view').data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width > barWidth; })
                .attr('opacity', 0);*/
        }
        catch (e){
        
        }
    
        // Need to update the month rectangles so that they use the new scale!
        this.buildMonths();
    },
    
    // Highlight those entries that were made by users in userlist.
    applyUserSelection: function(userlist) {
        // Clean up any previous selections!
        if(this.model.get('mode') != 'ownership'){
            this.clearAllSelections();
        }
    
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
        
        if(this.model.get('mode') == "art" || this.model.get('mode') == "hybrid"){
            // Apply selection to the main article contribution view
            this.model.get('view').data.selectAll('.datum').filter(function (d) { return jQuery.inArray(d.user, userlist) === -1; })
                                       .selectAll('.bars rect').transition().duration(500).attr('opacity', 0.2);
            // Apply selection to nav "spikes"
            this.navctl.spikes.filter(function(d) { return jQuery.inArray(d.user, userlist) === -1; }).transition().duration(500).attr('opacity', 0.4);
        }
        
        // Apply selection to the sentence ownership view
        this.sentences.applyUserSelection(userlist);
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
    
        if(this.model.get('mode') == 'art' || this.model.get('mode') == 'hybrid'){
            // Update the various views to reflect reset of all selections.
            this.model.get('view').data.selectAll('.bars rect').transition().duration(500).attr('opacity', 1);
            this.model.get('view').data.selectAll('.datum').transition().duration(500).attr('opacity', 1);
        
            // Update nav control spikes
            this.navctl.spikes.transition().duration(500).attr('opacity', 1);
        }
    
        // Clear the selection for the sentence ownership visualization
        this.sentences.clearAllSelections();
    
        // Re-enable any previously disabled selection controls
        $('#diag_legend input').prop('disabled', false);
        $('#d_select_groups_accordion input').prop('disabled', false);
    },
    
    // Switch visualization to time-spaced mode, or update time-spaced visualization
    // This is currently called by the slider element on a switch mode event.
    toTimeSpaced: function(options){
        options = options != undefined ? options : {};
        // Re-position all article revision elements using the x axis time scale.
        d3.selectAll('.datum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.model.timeX(d.date) + ',0)';}, this))
            .selectAll('.bars rect').attr('width', this.calcBarWidth());
    
        // Re-position talk page entry callouts using the x-axis time scale.
        d3.selectAll('.tdatum')
            .attr('transform', $.proxy(function(d) {return 'translate(' + this.model.timeX(d.date) + ',0)';}, this))
    
        // Update the month view.
        if(!options.silent){
            this.buildMonths();
        }
    
        // Show the month view if we are in TS talk page mode.
        // This is because the month view is hidden in adj-talk page mode, but we want it for TS anyway.
        if (this.model.get('mode') == "talk") {
            d3.selectAll('.month').attr('opacity', 1);
        }
    },
    
    // Switch visualization to adacent-spacing mode
    // Currently called by the slider element when a mode change event occurs.
    toAdjacentSpaced: function(options){
        options = options != undefined ? options : {};
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
        if(!options.silent){
            this.buildMonths();
        }
    },
    
    // Function to map revision data to rectangle groups that represent the data as a stacked bar graph.
    buildBars: function(barsGroup, barWidth){
        var posFields = new Backbone.Collection(classifications.filter(function(c){ return c.get('weight') >= 0; })).pluck('id');
        var negFields = new Backbone.Collection(classifications.filter(function(c){ return c.get('weight') < 0; })).pluck('id');
    
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
        var that = this;
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
            var qualities = this.model.get('data').get('quality');
            var events = this.model.get('data').get('events');
            var googles = this.model.get('data').get('google');
            var startq = 0;
            var starte = 0;
            var startg = 0;
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
                for(var q = startq; q < qualities.length; q++){
                    var quality = qualities[q];
                    var cutoff = new Date(quality.cutoff);
                    cutoff = new Date(cutoff.getTime() + (24 * 60 * 60 * 1000));
                    if((curDate >= cutoff || finalDate.valueOf() == curDate.valueOf())){
                        startq = q + 1;
                        qualityData[q] = {l: this.getOffset(i+0.5), 'q': quality};
                    }
                    else{
                        break;
                    }
                }
                for(var e = starte; e < events.length; e++){
                    var event = events[e];
                    var time = new Date(event.timestamp);
                    if(curDate >= time){
                        starte = e + 1;
                        eventsData[e] = {l: this.getOffset(i+0.5), 'e': event};
                    }
                    else{
                        break;
                    }
                }
                for(var g = startg; g < googles.length; g++){
                    var google = googles[g];
                    var time = new Date(google.timestamp);
                    if(curDate >= time || finalDate.valueOf() == curDate.valueOf()){
                        startg = g + 1;
                        googleData[g] = {l: this.getOffset(i+0.5), 'g': google};
                    }
                    else{
                        break;
                    }
                }
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
    
        var mts_e = bg.selectAll('.months').selectAll('.month').data(data).enter();
        var mts_g = mts_e.append('g').attr('class', 'month')
                                     .attr('transform', function(d) { return 'translate(' + d.l + ',0)'; });
        mts_g.append('rect').attr('height', String(this.model.get('height')))
                            .attr('width', function(d) { return (d.r-d.l); })
                            .attr('class', function(d, i) { return (i%2 === 0)?('m_odd'):('m_even');})
                            .attr('y', String(-this.model.get('height')/2));
        mts_g.append('text').attr('class', 'mtext')
                            .text(function(d) { return months[d.m]; })
                            .attr('transform', 'translate(5,' + (this.model.get('height')/2 - 15) + ')scale(1,-1)')
                            .attr('opacity', 1)
                            .filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;})
                            .attr('opacity', 0);
        mts_g.append('text').attr('class', 'ytext')
                            .text(function(d) { return String(d.y); })
                            .attr('transform', 'translate(5,' + (this.model.get('height')/2 - 30) + ')scale(1,-1)')
                            .attr('opacity', 1)
                            .filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;})
                            .attr('opacity', 0);
    
        mts = this.model.get('view').body.selectAll('.month').data(data);
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
        
        this.repositionBar();
        
        // Render Google Trend Data
        var lastX1 = 0;
        var lastY1 = -(this.model.get('height')/2);
        var bar_g = bg.selectAll('.bar').selectAll('.google').data(googleData).enter();
        var half_height = this.model.get('height')/2;
        bar_g.append('line')
             .attr('class', 'google');
        bg.selectAll('.google')
             .attr('x1', function(d){ var lastX = lastX1; lastX1 = d.l; return lastX;})
             .attr('y1', function(d){ var lastY = lastY1; lastY1 = -half_height + (35*(d.g.value/100)); return lastY;})
             .attr('x2', function(d){ return d.l; })
             .attr('y2', function(d){ return -half_height + (35*(d.g.value/100));});
        
        // Render Quality Data
        var r = 8;
        var bar_g = bg.selectAll('.bar').selectAll('.quality').data(qualityData).enter();
        bar_g.append('circle')
             .attr('class', 'quality');
        bg.selectAll('.quality')
          .attr('r', r)
          .attr('transform', function(d){ return 'translate(' + (d.l-r) + ',-' + (half_height - r*2) + ')'; })
          .attr('fill', '#2C5C7D')
          .on('click', function(d){
            var uid = 'quality-' + d.q.cuttoff;
            var clone = that.$("#" + uid);
            that.$(".tooltip").not(clone).hide();
            if(clone.length == 0){
                var text = "<table>";
                _.each(d.q.description, function(val, i){
                    text += "<tr><td align='right'>" + i + ":&nbsp;</td><td>" + val + "</td></tr>";
                });
                text += "<tr><td colspan='2'>" + Helper.formatDate(new Date(d.q.cutoff), false) + "</td></tr>"

                if(d.q.metric == 'CoDNA'){
                    text += "<tr><td colspan='2'><a style='float:right;' href='http://dl.acm.org/citation.cfm?id=2069609' target='_blank'>Source</a></td></tr>";
                }
                text += "</table>";
                var clone = $(_.template($("#tooltip_template").html())({
                    title: "CoDNA Ranking",
                    text: text,
                    uid: uid
                }));
                that.$('#view').append(clone);
                clone = that.$("#" + uid);
            }
            clone.toggle();
            var height = clone.outerHeight(true);
            var width = clone.outerWidth(true);
            clone.css('left', Math.floor((that.mouseX - width/2)/10)*10)
                 .css('top', Math.floor((that.mouseY - r*2 - height)/10)*10);
          });

        // Render Google Events Data
        var r = 8;
        var bar_g = bg.selectAll('.bar').selectAll('.event').data(eventsData).enter();
        bar_g.append('circle')
             .attr('class', 'event');
        bg.selectAll('.event')
          .attr('r', r)
          .attr('transform', function(d){ return 'translate(' + (d.l) + ',-' + (half_height - r*2) + ')'; })
          .attr('fill', '#8B2C0D')
          .on('click', function(d){
            var uid = 'event-' + d.e.cuttoff;
            var clone = that.$("#" + uid);
            that.$(".tooltip").not(clone).hide();
            if(clone.length == 0){
                var clone = $(_.template($("#tooltip_template").html(), {
                    title: d.e.title,
                    text: d.e.description + "<br />Date:&nbsp;" + Helper.formatDate(new Date(d.e.timestamp), false),
                    uid: uid
                }));
                that.$('#view').append(clone);
                clone = that.$("#" + uid);
            }
            clone.toggle();
            var height = clone.outerHeight(true);
            var width = clone.outerWidth(true);
            clone.css('left', Math.floor((that.mouseX - width/2)/10)*10)
                 .css('top', Math.floor((that.mouseY - r*2 - height)/10)*10);
          });
    
        var mts_x = mts.exit();
        mts_x.attr('opacity', 0).remove();
    },
    
    repositionBar: function(){
        if(this.model.get('mode') == 'ownership'){
            return false;
        }
        this.$(".tooltip").hide();
        var bg = this.model.get('view').body.select('.bg');
        var bar_g = bg.selectAll('.bar_bg');
        bar_g.attr('transform', 'translate(' + (-50 + this.navctl.getPanOffset()) + ',-' + (this.model.get('height')/2) + ')');
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
    
        var that = this;
        var filtered = parent.filter(function(d) { return that.genCalloutImageSet(d).length != 0; });
    
        // Generate the tooltip for this element.
        filtered.append('title').text(function(d) {
            return 'User: ' + d.contributor + '\n' + Helper.formatDate(d.date) + '\n' + 'Revision Categories: ' + Helper.toTalkClassString(d) + '\n' + 'Revision Size: ' + d.lev;
        });
    
        // Generate the path that defines the shape of the callout.
        
        var callout = filtered.append('path');
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
        var igroup = filtered.append('g').attr('class', 'igroup').attr('transform', 'translate(' + (ox+px) + ',' + (oy+py) +')scale(1,-1)').datum($.proxy(function(d) { return this.genCalloutImageSet(d); }, this));
        igroup.each(function (d) {
            d3.select(this).selectAll('image').data(d).enter().append('image').attr('xlink:href', function(dm) { return "img/" + dm + ".png"; }).attr('y', function(dm, i) { return -29*i-24; })
                .attr('width', 24).attr('height', 24).attr('x', 3).attr('class', function(dm) { return dm; } );
        });
    
        // Append to each callout an x-axis label corresponding to its ID.
        filtered.append('text').attr('class', 'xlabel').text($.proxy(function(d, i) { if(this.genCalloutImageSet(d).length == 0){ return "";} return i + 1; }, this))
            .attr('transform', function(d) { return 'translate(' + (ox+px/2) + ',' + (oy+py/2) + ')scale(1,-1)'; });
    },
    
    // Updates the view based on whether or not the view is set to time spaced or adjacent spaced
    updateSpacing: function(options){
        options = (options != undefined) ? options : {};
        if(this.model.get('isTimeSpaced')){
            this.navctl.toTimeSpaced();
            this.toTimeSpaced(options);
        } else {
            this.navctl.toAdjacentSpaced();
            this.toAdjacentSpaced(options);
        }
        if(!options.silent){
            this.update();
        }
    },
    
    // Updates the view based on the type of mode it is in
    updateMode: function(options){
        options = (options != undefined) ? options : {};
        if(this.model.get('mode') == 'art'){
            this.$('#view').appendTo(this.$('#artview'));
            this.model.get('view').data.selectAll('.datum').attr('opacity', 1);
            d3.selectAll('.sd').attr('opacity', 1);
            d3.selectAll('.tdatum').attr('opacity', 0);
            d3.selectAll('.tcircle').attr('opacity', 0);
        
            this.$('#t_sections').button('disable');
            this.$('#t_legend').button('enable');
            this.$('#t_talk').button('disable');
            
            this.view.$("#prev").prop('disabled', true);
            this.view.$("#showAll").prop('disabled', true);
            this.view.$("#next").prop('disabled', true);
        
            this.$('#toAdj').button('enable');
        
            d3.selectAll('.month').attr('opacity', 1);
        
            if (this.model.get('isTimeSpaced') === false) {
                this.$('#toAdj').button('disable');
                this.$('#toTime').button('enable');
                if(!options.silent){
                    this.navctl.toAdjacentSpaced();
                }
            } else {
                this.$('#toAdj').button('enable');
                this.$('#toTime').button('disable');
                if(!options.silent){
                    this.navctl.toTimeSpaced();
                }
            }
            
            if(!options.silent){
                this.navctl.onScale();
            }
        
            var dialog = this.view.subviews.toolbar.subviews.diag_data.dialog;
            $('#userselect', this.view.subviews.toolbar.subviews.diag_select.dialog).show();
            $('#userselect2', this.view.subviews.toolbar.subviews.diag_select.dialog).hide();
            $('.select_apply_div', this.view.subviews.toolbar.subviews.diag_select.dialog).show();
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
        
            this.$('#t_sections').button('disable');
            this.$('#t_legend').button('disable');
            this.$('#t_talk').button('enable');
            
            this.view.$("#prev").prop('disabled', true);
            this.view.$("#showAll").prop('disabled', true);
            this.view.$("#next").prop('disabled', true);
        
            if (this.model.get('isTimeSpaced') === false) {
                d3.selectAll('.month').attr('opacity', 0);
                this.$('#toAdj').button('disable');
                this.$('#toTime').button('enable');
                if(!options.silent){
                    this.navctl.toAdjacentSpaced();
                }
            } else {
                this.$('#toAdj').button('enable');
                this.$('#toTime').button('disable');
                if(!options.silent){
                    this.navctl.toTimeSpaced();
                }
            }
            
            if(!options.silent){
                this.navctl.onScale();
            }
        
            var dialog = this.view.subviews.toolbar.subviews.diag_data.dialog;
            $('#userselect', this.view.subviews.toolbar.subviews.diag_select.dialog).show();
            $('#userselect2', this.view.subviews.toolbar.subviews.diag_select.dialog).hide();
            $('.select_apply_div', this.view.subviews.toolbar.subviews.diag_select.dialog).show();
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
        
            this.$('#t_sections').button('disable');
            this.$('#toAdj').button('disable');
            this.$('#toTime').button('disable');
            
            this.view.$("#prev").prop('disabled', true);
            this.view.$("#showAll").prop('disabled', true);
            this.view.$("#next").prop('disabled', true);

            this.model.set('isTimeSpaced', true);
        
            d3.selectAll('.month').attr('opacity', 1);
        
            var dialog = this.view.subviews.toolbar.subviews.diag_data.dialog;
            $('#userselect', this.view.subviews.toolbar.subviews.diag_select.dialog).show();
            $('#userselect2', this.view.subviews.toolbar.subviews.diag_select.dialog).hide();
            $('.select_apply_div', this.view.subviews.toolbar.subviews.diag_select.dialog).show();
            $('.talkrow', dialog).removeClass('invisible');
            $('.defaultrow', dialog).removeClass('invisible');
        
            d3.select(this.$('.fg')[0]).attr('transform', 'translate(0, 0)');
            d3.selectAll('g.ylabel').attr('opacity', 1);
        }
        else if(this.model.get('mode') == 'ownership'){
            this.$('#t_legend').button('disable');
            this.$('#t_talk').button('disable');
            
            this.$('#t_sections').button('enable');
            
            this.sentences.updatePrevNext();
            
            this.model.set('isTimeSpaced', false);
            $('#userselect', this.view.subviews.toolbar.subviews.diag_select.dialog).hide();
            $('#userselect2', this.view.subviews.toolbar.subviews.diag_select.dialog).show();
            $('.select_apply_div', this.view.subviews.toolbar.subviews.diag_select.dialog).hide();
            this.sentences.updateSentences();
        }
        if(!options.silent){
            this.update();
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
        this.$('a[href=#ownershipview]').click($.proxy(function(event, ui) {
            this.model.set('mode', 'ownership');
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
        view.sview = view.svg.append('g').attr('width', this.model.get('width')).attr('transform', 'translate(' + (maskWidth) + ',' + (Math.floor(this.model.get('height')/2)) + ')scale(1,-1)');
    
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
        view.sview.append('g').attr('class', 'xaxis').append('line')
                                                     .attr('x2', this.model.get('width') + 50)
                                                     .attr('x1', -50);
    
        // Y-label and mask group
        var ylabel = view.sview.append('g').attr('class', 'ylabel');
        // Append mask for y-label
        ylabel.append('rect').attr('class', 'ymask').attr('width', maskWidth).attr('height', this.model.get('height')).attr('y', -Math.floor(this.model.get('height')/2)).attr('x', -maskWidth);
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
        
        body.selectAll('.bg').append('g').attr('class', 'months');
        var bar = body.selectAll('.bg').append('g').attr('class', 'bar');
            bar.append('rect').attr('class', 'bar_bg')
                              .attr('width', '100%')
                              .attr('height', 35)
                              .attr('fill', '#F2E4CB');
    
        // Create a group for the article revision datum elements.
        view.data = body.select('g.mid').append('g').attr('class', 'data');
        var data = view.data;
    
        var datum = data.selectAll('.datum').data(this.model.get('data').get('revisions')).enter().append('g').attr('class', 'datum').attr('transform', $.proxy(function(d) { return 'translate(' + view.x(this.model.index(d)) + ', 0)'; }, this)).attr('opacity', 1);
        datum.append('title').text(function(d) {
            return d.group + ': ' + d.user + '\n' + Helper.formatDate(new Date(d.timestamp)) + '\n' + 'Revision Categories: ' + Helper.toClassString(d.class) + '\n' + 'Revision Size: ' + d.lev;
        });
        var bars = datum.append('g').attr('class', 'bars');
        this.buildBars(bars, barWidth);
        /*datum.append('text').attr('class', 'xlabel').text($.proxy(function(d) { return 1+this.model.index(d); }, this))
            .attr('transform', function() { return 'translate(0,' + String(-7) + ')scale(1,-1)rotate(90,0,0)'; });*/
    
        // Group for talk page data entries
        view.tdata = body.select('g.fg').append('g').attr('class', 'tdata');
        var tentries = view.tdata.selectAll('.tdatum').data(this.model.get('data').get('talk')).enter()
            .append('g').attr('class', 'tdatum')
            .attr('transform', $.proxy(function(d) { return 'translate(' + view.x(this.model.index(d)) + ', 0)'; }, this)).attr('opacity', 0);
        this.appendCallout(tentries);
        
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
        headers.push(['Sections', 'sorttable_alpha']);
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
        rows.append('td').text(function (d) {
            if(d.sections == undefined){
                return "";
            }
            return d.sections.join("; ");
        });
        rows.attr('class', function (d) {
            if (d.type === 'talk') return 'data talkrow';
            else return 'data defaultrow';
        });
        
        // Get the sorttable library to make this table sortable!
        sorttable.makeSortable($('table.sortable', dialog).get(0));

        // In our default mode hide the talk page entries
        $('.talkrow', dialog).addClass('invisible');
        
        this.updateMode({silent:true});
        this.updateSpacing({silent:true});
    },
    
    render: function(){
        return this.$el;
    }

});
