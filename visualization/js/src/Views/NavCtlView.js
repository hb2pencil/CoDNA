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
