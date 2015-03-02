// ## SentencesView
SentencesView = Backbone.View.extend({

    initialize: function(options){
        this.viz = options.viz;
        this.listenTo(this.model, "changePos", this.showLoading);
        this.listenTo(this.model, "sync", this.render);
        this.model.fetch();
    },
    
    // Returns the number of sentences in the largest revision
    getMaxSentences: function(){
        return Helper.absMax(_.values(this.model.get('revisions')), function(elem){ return _.reduce(_.values(elem), function(sum, e){return sum += e.length; }, 0); });
    },
    
    // Returns the number of sections in the largest revision
    getMaxSections: function(){
        return Helper.absMax(_.values(this.model.get('revisions')), function(elem){ return _.values(elem).length; });
    },
    
    // Calculates the width of each sentence
    calcBarWidth: function(){
        return this.viz.calcBarWidth();
    },
    
    // Calculates the height each sentence should be
    calcBarHeight: function(){
        return (this.viz.model.get('height')-(2+12))/(this.getMaxSentences() + (this.getMaxSections()/2));
    },
    
    // Calculates where the sentence appears vertically
    calcYPos: function(sentId, barHeight){
        var ret = 0;
        var revId = $("#sent_" + sentId).parents(".revision").attr("data-revid");
        var sections = _.values(this.model.get('revisions')[revId]);
        var curr = 0;
        _.each(sections, function(sec){
            var sentences = _.values(sec);
            curr += barHeight/2;
            _.each(sentences, function(s){
                if(s.i == sentId){
                    ret = curr;
                }
                curr += barHeight;
            });
        });
        return ret;
    },
    
    // Calculates where the section appears vertically
    calcSecYPos: function(sect, revId, barHeight){
        var ret = 0;
        var sections = this.model.get('revisions')[revId];
        var curr = 0;
        _.each(sections, function(sec, secText){
            if(secText == sect){
                ret = curr;
            }
            var sentences = _.values(sec);
            curr += barHeight/2 + sentences.length*barHeight;
        });
        return ret;
    },
    
    // Transforms the svg body so that it scales and translates based on the slider position
    updateSentences: function(){
        if(this.viz.model.get('mode') != 'ownership'){
            return false;
        }
        var that = this;
        var height = this.viz.model.get('height')-2;
        var barWidth = this.calcBarWidth();
        var top = this.viz.$('#ownershipvis').scrollTop()
        var beforeHeight = this.svg.attr('height');
        this.svg.attr('height', height*this.model.get('zoomLevel'));
        this.viz.$('#ownershipvis').scrollTop(top*(this.svg.attr('height')/beforeHeight));
        
        // Adjust Sentence posisionts/scale
        this.svg.selectAll(".body")
                .attr("transform", "translate(" + -(this.viz.navctl.getPanOffset()) + ",12) scale(" + barWidth + ", " + this.model.get('zoomLevel') + ")");
        
        // Adjust Vandalism Marker positions
        this.svg.selectAll(".header")
                .attr("transform", "translate(" + -(this.viz.navctl.getPanOffset()) + ",0)");
        this.svg.selectAll(".header .revision")
                .attr("transform", function(d, i){ return "translate(" + that.x($(this).attr("data-index")*2*barWidth) + ",11) scale(" + barWidth/13 + ",1)"; });
                
        this.updateZoom();
    },
    
    // Resets all of the selections so that all sentences are opaque
    clearAllSelections: function(){
        this.svg.selectAll(".sentence, .lastSentence, .section, .lastSection").transition().duration(500).attr('opacity', 1);
        $("#section_filter input", this.viz.view.subviews.toolbar.subviews.diag_sections.dialog).prop("checked", true);
        $("#userselect2 input", this.viz.view.subviews.toolbar.subviews.diag_select.dialog).prop("checked", true);
    },
    
    // Makes all sentences who are not owned by users in the userlist to be semi-transparent
    applyUserSelection: function(userlist){
        this.svg.selectAll(".sentence, .lastSentence").filter(function(d){ return $.inArray(d.o, userlist) !== -1; }).transition().duration(500).attr('opacity', 1);
        this.svg.selectAll(".sentence, .lastSentence").filter(function(d){ return $.inArray(d.o, userlist) === -1; }).transition().duration(500).attr('opacity', 0.2);
    },
    
    // Creates the initial svg visualization
    buildSentences: function(){
        var that = this;
        var barWidth = this.calcBarWidth();
        var barHeight = this.calcBarHeight();
        
        // Create body
        var header = this.svg.append("g")
                             .attr("class", "header");
        var body = this.svg.append("g")
                           .attr("class", "body");
        
        // Create Transitions Group
        var transitions = this.svg.selectAll(".body")
                                  .selectAll(".transitions")
                                  .data(_.rest(_.values(this.model.get('revisions')))).enter();
        
        // Create Revisions Group
        var revIds = _.keys(this.model.get('revisions'));
        var revisions = this.svg.selectAll(".body")
                                .selectAll(".revision")
                                .data(_.values(this.model.get('revisions')))
                                .enter();
        
        // Create Vandalism Marker Group           
        var vand_revisions = this.svg.selectAll(".header")
                                     .selectAll(".revision")
                                     .data(_.values(this.model.get('revisions')))
                                     .enter();
        
        // Clicking the revision will open the revision in a new tab
        transitions.append("a")
                   .attr("class", "transition")
                   .attr("xlink:href", function(d, i) { return "http://en.wikipedia.org/wiki/" + that.viz.model.get('title') + "?diff=next&oldid=" + revIds[i]; })
                   .attr("target", "_blank")
                   .attr("transform", function(d, i) { return "translate(" + that.x(1 + i*2) + ", 0)"; });
        
        // Clicking the revision will open the revision in a new tab
        revisions.append("a")
                 .attr("class", "revision")
                 .attr("data-revid", function(d, i) { return revIds[i]; })
                 .attr("xlink:href", function(d, i) { return "http://en.wikipedia.org/wiki/" + that.viz.model.get('title') + "?oldid=" + revIds[i]; })
                 .attr("target", "_blank")
                 .attr("transform", function(d, i) { return "translate(" + that.x(i*2) + ", 0)"; });
        
        // Add the Vandalism Marker Text elements
        vand_revisions.append("text")
                      .attr("class", $.proxy(function(d, i){
                        if(_.contains(this.model.get('vandalism'), parseInt(revIds[i])) ||
                           _.contains(this.model.get('unvandalism'), parseInt(revIds[i]))){
                            return "revision";
                        }
                      }, this))
                      .attr("transform", function(d, i) { return "translate(" + that.x(i*2) + ", 9)"; })
                      .style("font-size", "14px")
                      .style("cursor", "default")
                      .attr("data-index", function(d, i){ return i; })
                      .text($.proxy(function(d, i){
                        if(_.contains(this.model.get('vandalism'), parseInt(revIds[i]))){
                            return "☒";
                        }
                        else if(_.contains(this.model.get('unvandalism'), parseInt(revIds[i]))){
                            return "☑"
                        }
                      }, this))
                      .append("title")
                      .text($.proxy(function(d, i){
                        if(_.contains(this.model.get('vandalism'), parseInt(revIds[i]))){
                            return "Vandalism";
                        }
                        else if(_.contains(this.model.get('unvandalism'), parseInt(revIds[i]))){
                            return "Remove Vandalism"
                        }
                      }, this));
        this.svg.selectAll(".header > :not(.revision)")
                .remove();
        
        // Create Sections Group
        var offset = 0;
        var sections = this.svg.selectAll(".body")
                               .selectAll(".revision")
                               .selectAll(".section")
                               .data(function(d, i){
                                   return d3.entries(d); 
                               }).enter();
        
        var sents = new Array();
        _.each(_.values(this.model.get('revisions')), function(r){
            _.each(_.values(r), function(sec){
                _.each(_.values(sec), function(sent){
                    sents[sent.i] = sent.s;
                });
            });
        });
        var lastSentences = this.svg.selectAll(".body")
                                    .selectAll(".transition")
                                    .selectAll(".lastSentence")
                                    .data($.proxy(function(d, i){
                                        var revs = _.values(this.model.get('revisions'));
                                        var lastRev = new Array();
                                        if(revs[i] != undefined){
                                            lastRev = _.pluck(_.flatten(_.values(revs[i])), 'i');
                                        }
                                        return _.filter(_.flatten(_.values(d), true), function(v){
                                            return (v.l != 0 && sents[v.l] != undefined && _.contains(lastRev, v.l)); 
                                        }) 
                                    }, this)).enter();
                                    
        var lastSections = this.svg.selectAll(".body")
                                   .selectAll(".transition")
                                   .selectAll(".lastSection")
                                   .data(function(d, i){
                                        var ret = new Array();
                                        var currId = revIds[i+1];
                                        var lastId = revIds[i];
                                        var sects = that.model.get('revisions')[lastId];
                                        var keys = _.keys(d);
                                        keys = _.filter(keys, function(key){
                                            return (sects[key] != undefined);
                                        });
                                        _.each(keys, function(key){
                                            ret.push({s: key, i: currId, l: lastId});
                                        });
                                        return ret;
                                   }).enter();
        
        sections.append("g")
                 .attr("class", "section")
                 .attr("opacity", 1)
                 .attr("transform", function(d, i) {
                    if(i == 0){
                        // If i == 0, then it means this is a new revision
                        offset = 0;
                    }
                    var ret = "translate(0," + that.y(offset) + ")";
                    // Increment the offset
                    offset += _.size(d.value) + 0.5; 
                    return ret;
                 }).append("rect")
                   .attr("height", barHeight/2)
                   .attr("width", 1)
                   .attr("fill", "black")
                   .on("mouseover", function(){
                       // Highlight Color
                       d3.select(this).attr("fill", "#555555");
                   })
                   .on("mouseout", function(){
                       // Reset Color
                       d3.select(this).attr("fill", "#000000");
                   })
                   .append("title")
                   .text(function(d, i) { return d.key; });
        
        // Create Sentences Rectangles
        var sentences = this.svg.selectAll(".body")
                                .selectAll(".revision")
                                .selectAll(".section")
                                .selectAll(".sentence")
                                .data(function(d, i){ return _.values(d.value); })
                                .enter();
        
        sentences.append("rect")
                 .attr("class", "sentence")
                 .attr("id", function(d, i){ return "sent_" + d.i; })
                 .attr("height", Math.max(0.5, barHeight-0.5))
                 .attr("width", 1)
                 .attr("opacity", 1)
                 .attr("transform", function(d, i) { return "translate(0," + that.y(0.5 + i) + ")"; })
                 .attr("fill", function(d) { return that.model.get("users")[d.o]; })
                 .on("mouseover", function(){
                    // Highlight Color
                    d3.select(this).attr("fill", function(d) { return d3.rgb(that.model.get("users")[d.o]).brighter(0.7); });
                 })
                 .on("mouseout", function(){
                    // Reset Color
                    d3.select(this).attr("fill", function(d) { return that.model.get("users")[d.o]; });
                 })
                 .append("title")
                 .text(function(d) { return "Owner: " + d.o + "\n" + that.model.get('sentences')[d.s]; });
                
        lastSentences.append("polygon")
                     .attr("class", "lastSentence")
                     .attr("opacity", 1)
                     .attr("points", function(d) {
                        var y1_last = that.calcYPos(d.l, barHeight);
                        var y2_last = y1_last + barHeight;
                        var y1_curr = that.calcYPos(d.i, barHeight);
                        var y2_curr = y1_curr + barHeight;
                        return "0.00," + (y1_last + barHeight/5) + " " +
                               "1.00," + (y1_curr + barHeight/5) + " " +
                               "1.00," + (y2_curr - barHeight/5) + " " +
                               "0.00," + (y2_last - barHeight/5) + " " +
                               "0.00," + (y1_last + barHeight/5) + " ";
                     })
                     .attr("fill", function(d){
                        if(sents[d.i] == sents[d.l]){ return "#888888"; }
                        return "#BBBBBB";
                     })
                     .on("mouseover", function(){
                        // Highlight Color
                        d3.select(this).attr("fill", function(d) {
                            if(sents[d.i] == sents[d.l]){ return d3.rgb("#888888").brighter(0.3); }
                            return d3.rgb("#BBBBBB").brighter(0.3);
                        })
                     })
                     .on("mouseout", function(){
                        // Reset Color
                        d3.select(this).attr("fill", function(d) {
                            if(sents[d.i] == sents[d.l]){ return "#888888"; }
                            return "#BBBBBB";
                        })
                     });
                     
        lastSections.append("polygon")
                    .attr("class", "lastSection")
                    .attr("opacity", 1)
                    .attr("points", function(d) {
                        var y1_last = that.calcSecYPos(d.s, d.l, barHeight);
                        var y2_last = y1_last + barHeight/2;
                        var y1_curr = that.calcSecYPos(d.s, d.i, barHeight);
                        var y2_curr = y1_curr + barHeight/2;
                        return "0.00," + (y1_last) + " " +
                               "1.00," + (y1_curr) + " " +
                               "1.00," + (y2_curr) + " " +
                               "0.00," + (y2_last) + " " +
                               "0.00," + (y1_last) + " ";
                    })
                    .attr("fill", "black")
                    .on("mouseover", function(){
                        // Highlight Color
                        d3.select(this).attr("fill", "#555555");
                    })
                    .on("mouseout", function(){
                        // Reset Color
                        d3.select(this).attr("fill", "#000000");
                    });
                     
        this.updateSentences();
        this.viz.navctl.initSentenceSpikes();
    },
    
    // Updates the state of the pagination buttons
    updatePrevNext: function(){
        if(this.viz.model.get('mode') == 'ownership'){
            this.viz.view.$("#showAll").prop('disabled', false);
            if(this.model.get('start') == 0 &&
              !(this.model.get('nRevisions') > defaultLimit && this.model.get('limit') == this.model.get('nRevisions'))){
                this.viz.view.$("#prev").prop('disabled', true);
            }
            else{
                this.viz.view.$("#prev").prop('disabled', false);
            }
            if(this.model.get('start') + this.model.get('limit') >= this.model.get('nRevisions')){
                this.viz.view.$("#next").prop('disabled', true);
            }
            else{
                this.viz.view.$("#next").prop('disabled', false);
            }
            if(this.model.get('limit') >= this.model.get('nRevisions')){
                this.viz.view.$("#showAll").prop('disabled', true);
            }
            else{
                this.viz.view.$("#showAll").prop('disabled', false);
            }
        }
    },
    
    // Updates the state of the zoom buttons
    updateZoom: function(){
        if(this.viz.model.get('mode') == 'ownership'){
            if(this.model.get('zoomLevel') > 1.00){
                this.viz.view.$('#zoomOut').button('enable');
            }
            else{
                this.viz.view.$('#zoomOut').button('disable');
            }
            if(this.model.get('zoomLevel') < 10.00){
                this.viz.view.$('#zoomIn').button('enable');
            }
            else{
                this.viz.view.$('#zoomIn').button('disable');
            }
        }
    },
    
    showLoading: function(){
        this.viz.$("#ownershipvis").append("<div style='position:absolute;top:0;bottom:0;left:0;right:0;background:rgba(0,0,0,0.75);color:#FFFFFF;font-size:12px;padding:5px;'>Loading...</div>");
    },
    
    render: function() {
        this.updatePrevNext();
        this.updateZoom();
        this.viz.$('#ownershipvis').unbind('mousewheel DOMMouseScroll');
        this.viz.$('#ownershipvis').empty();
        this.viz.$('#ownershipvis').css('overflow-y', 'auto');
        this.viz.$('#ownershipvis').css('overflow-x', 'hidden');
        this.svg = d3.select(this.viz.$('#ownershipvis')[0]).append('svg').attr('width', this.viz.model.get('width')).attr('height', this.viz.model.get('height')-2);
        this.x = d3.scale.linear();
        this.y = d3.scale.linear();
        
        var barWidth = this.calcBarWidth();
        var barHeight = this.calcBarHeight();
        // Set up x and y ranges for the visualization. The x-range is designed so that x(n) gives the x-position of the nth bar's left edge.
        this.x.range([0, 1]);
        // Leave a little bit of room.
        this.y.range([0, this.viz.model.get('height')-(2+12)]);
        // Y domain determined using largest magnitude y-value
        this.y.domain([0, this.getMaxSentences() + (this.getMaxSections()/2)]);
        
        if(_.size(this.model.get('users')) > 0){
            dialog = this.viz.view.subviews.toolbar.subviews.diag_select.dialog;
            // Populate user list in the 'select users' dialog.
            var userMap = {};
            var users = this.model.get('users');
            
            // Use d3 to populate the select element in the select users dialog with option elements
            d3.select($('#userselect2', dialog)[0])
                .selectAll('div')
                .data(d3.entries(users))
                .enter()
                .append('div')
                .style('padding', '2px 3px 2px 16px')
                .html(function(d, i){
                    var ret = '<input style="float:left;margin-right:16px;" type="checkbox" name="userselect2[]" value="' + d.key + '" checked />';
                    ret += '<div class="l_colour" style="background: ' + d.value + ';height:16px;width:16px;margin-right:16px;"></div>';
                    ret += '<span>' + d.key + '</span>';
                    return ret;
                });
        }
        
        var sections = this.model.getSections();
        if(_.size(sections) > 0){
            dialog = this.viz.view.subviews.toolbar.subviews.diag_sections.dialog;
            d3.select($('#section_filter', dialog)[0])
                .selectAll('div')
                .data(sections)
                .enter()
                .append('div')
                .style('padding', '2px 3px 2px 16px')
                .html(function(d, i){
                    var ret = '<input style="float:left;margin-right:16px;" type="checkbox" name="section_filter[]" value="' + d + '" checked />';
                    ret += '<span>' + d + '</span>';
                    return ret;
                });
        }
        
        this.buildSentences();
        this.stopListening(this.viz.model, "change:numBars");
        this.stopListening(this.model, "change:zoomLevel");
        this.listenTo(this.viz.model, "change:numBars", this.updateSentences);
        this.listenTo(this.model, "change:zoomLevel", function(){
            _.defer($.proxy(this.updateSentences, this));
        });
        this.viz.$('#ownershipvis').bind('mousewheel DOMMouseScroll', $.proxy(function(e){
            var delta = (e.originalEvent.wheelDelta != undefined) ? e.originalEvent.wheelDelta : -e.originalEvent.detail;
            if(delta > 0){
                // Up
                this.model.zoomIn(1.05);
            }
            else {
                // Down
                this.model.zoomOut(0.95);
            }
            e.preventDefault();
        }, this));
    }
    
});
