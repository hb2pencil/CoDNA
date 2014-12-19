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
    toTimeSpaced: function(options) {
        options = options != undefined ? options : {silent: true};
        var minDate = _.first(this.viz.model.get('data').get('revisions')).date;
        var maxDate = _.last(this.viz.model.get('data').get('revisions')).date;
    
        this.xscale = d3.time.scale();
        // Todo: domain of talk entries may exceed revisions
        this.xscale.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
                            maxDate]);
        this.xscale.rangeRound([0, this.dim.w - 2*this.handleWidth - 50]);
    
        var that = this;
    
        var negFields = new Backbone.Collection(classifications.filter(function(c){ return c.get('weight') < 0; })).pluck('id');
    
        this.bg.select('g.navbars').selectAll('rect.sd').data(this.viz.model.get('data').get('revisions'))
            .attr('x', function(d,i) { return that.xscale(d.date); })
            .attr('y', function(d) { return -that.yscale(_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)); })
            .attr('width', function(d,i) { return that.spikewidth; })
            .attr('height', function(d) { return that.yscale(d.loglev - (_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)))+that.yscale(_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)); })
            .attr('class', 'sd');
        
        this.bg.select('g.navbars').selectAll('circle.tcircle').data(this.viz.model.get('data').get('talk'))
            .attr('cx', function(d) { return that.xscale(d.date); });
    
        this.onSlide(options);
        this.onScale(options);
    },

    // When we switch to adjacent-spaced mode, switch back to using a linear scale for display.
    toAdjacentSpaced: function(options) {
        options = options != undefined ? options : {silent: true};
        this.xscale = d3.scale.linear();
        if (this.viz.model.get('mode') == 'talk')
            this.xscale.domain([0, this.viz.model.get('data').get('talk').length]);
        else
            this.xscale.domain([0, this.viz.model.get('data').get('revisions').length]);
        
        this.xscale.rangeRound([0, this.dim.w - 2*this.handleWidth]);
    
        var that = this;
    
        var negFields = new Backbone.Collection(classifications.filter(function(c){ return c.get('weight') < 0; })).pluck('id');
    
        this.bg.select('g.navbars').selectAll('rect.sd').data(this.viz.model.get('data').get('revisions'))
            .attr('x', function(d,i) { return that.xscale(i); })
            .attr('y', function(d) { return -that.yscale(_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)); })
            .attr('width', function(d,i) { return that.spikewidth; })
            .attr('height', function(d) { return that.yscale(d.loglev - (_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)))+that.yscale(_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)); })
            .attr('class', 'sd');
        
        this.bg.select('g.navbars').selectAll('circle').data(this.viz.model.get('data').get('talk'))
            .attr('cx', function(d, i) { return that.xscale(i); });
    
        this.onSlide(options);
        this.onScale(options);
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
    onSlide: function(options) {
        if(this.viz.model.get('mode') != 'ownership'){
            d3.selectAll(this.viz.$('g.body')).attr('transform', 'translate(' + -Math.round(this.getPanOffset()) + ',0)');
            this.viz.repositionBar();
        }
    },

    // Increase/Decrease the range of the chart
    onScale: function(options) {
        options = options != undefined ? options : {};
        if ((!this.viz.model.get('isTimeSpaced') && this.viz.model.get('mode') == 'art') || this.viz.model.get('mode') == 'ownership') {
            this.viz.model.set('numBars', this.getNumBars(), options);
        }
        else if ((!this.viz.model.get('isTimeSpaced') && this.viz.model.get('mode') == 'talk') || this.viz.model.get('mode') == 'ownership') {
            this.viz.model.set('numDots', this.getNumBars(), options);
        }
        else if (this.viz.model.get('isTimeSpaced')) {
            var df = _.last(this.viz.model.get('data').get('revisions')).date;
            var d0 = _.first(this.viz.model.get('data').get('revisions')).date;
            var d1 = this.xscale.invert(this.sdim.x0);
            var d2 = this.xscale.invert(this.sdim.x0+this.sdim.w-this.handleWidth);
        
            this.viz.model.timeX.rangeRound([0, this.viz.model.get('width') * (df-d0) / (d2 - d1)]);
            this.viz.toTimeSpaced(options);
        }
    },

    // Map slider motion to an offset by which to pan the main view. Behaves differently for time and adjacent spaced modes.
    getPanOffset: function() {
        try{
            if(this.viz.model.get('mode') == 'ownership'){
                return ((this.sdim.x0) / (this.dim.w - 2*this.handleWidth))*((_.size(this.viz.sentences.model.get('revisions'))*2 + 1)*this.viz.calcBarWidth());
            }
            if ((!this.viz.model.get('isTimeSpaced') && this.viz.model.get('mode') == 'art')) {
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
        this.xscale.domain([0, this.viz.model.get('data').get('revisions').length]);
        this.xscale.rangeRound([0, this.dim.w - 2*handleWidth]);
    
        this.yscale = d3.scale.linear();
        this.yscale.domain(this.viz.model.get('view').y.domain());
        this.yscale.rangeRound([0, this.dim.h/2]);
    
        var that = this;
        
        var negFields = new Backbone.Collection(classifications.filter(function(c){ return c.get('weight') < 0; })).pluck('id');
    
        this.spikewidth = (this.dim.w-2*handleWidth) / this.viz.model.get('data').get('revisions').length;
    
        this.spikes = this.bg.select('g.navbars').selectAll('rect.sd').data(this.viz.model.get('data').get('revisions'));
        this.spikes.enter().append('rect')
            .attr('x', function(d,i) { return that.xscale(i); })
            .attr('y', function(d) { return -that.yscale(_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)); })
            .attr('width', function(d,i) { return that.spikewidth; })
            .attr('height', function(d) { return that.yscale(d.loglev - (_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)))+that.yscale(_.reduce(negFields, function(sum, c){ return sum + Math.abs(d.wclass[c]); }, 0)); })
            .attr('class', 'sd');
        
        // Draw talk page entries, need to manually keep this in sync with appendCallout for now
    
        this.dots = this.bg.select('g.navbars').selectAll('circle.td').data(this.viz.model.get('data').get('talk')).enter().append('circle')
            .attr('class', 'td');

        // Max circle radius
        var maxR = 5;
        var fact = 0.6;

        // Append circle to our element. Cap the circle size and re-style the circle if it has reached the cap.
        this.dots.filter(function(d) { return Math.log(d.lev+1)*fact <= maxR; }).attr('r', function(d) { return Math.log(d.lev+1)*fact; }).attr('class', 'tcircle');
    
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
                if(this.viz.model.get('mode') == 'ownership'){
                    // For the ownership view, scaling does both
                    this.viz.sentences.updateSentences();
                }
                else{
                    this.onSlide();
                }
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
        this.changeMode();
    }
});
