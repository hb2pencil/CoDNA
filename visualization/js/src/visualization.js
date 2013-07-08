// Init visualization with a given article.
WIKIVIZ.init = function(art_title) {
	// Create UI components
	WIKIVIZ.createToolbar();
	WIKIVIZ.createDialogs();
	
	$('#viewtabs').tabs();
	
	$('.spacing_wrapper').mouseenter(function() {
		$(this).css('opacity', 1);
	}).mouseleave(function() {
		$(this).css('opacity', 0.8);
	});
	
	// Bind UI components to functionality
	WIKIVIZ.bindToolbar();
	WIKIVIZ.bindDialogs();
	
	// Load visualization data from DB
	WIKIVIZ.load(art_title);
	
	WIKIVIZ.isTimeSpaced = false;
	
	// TODO: Move this code to a more appropriate place?
	
	// Program the 'to adjacent spacing' and 'to time spacing' mode buttons with
	// appropriate functionality.
	$('#toAdj').button().attr('title', 'Adjacent Spacing');
	$('#toTime').button().attr('title', 'Time Spacing');
	
	$('#toAdj').click(function() {
		WIKIVIZ.navctl.toAdjacentSpaced();
		$('#toAdj').button('disable');
		$('#toTime').button('enable');
	});
	$('#toTime').click(function() {
		WIKIVIZ.navctl.toTimeSpaced();
		$('#toAdj').button('enable');
		$('#toTime').button('disable');
	});
	
	$('a[href=#artview]').click(function(event, ui) {
		$('#view').appendTo('#artview');
		WIKIVIZ.view.data.selectAll('.datum').attr('opacity', 1);
		d3.selectAll('.sd').attr('opacity', 1);
		d3.selectAll('.tdatum').attr('opacity', 0);
		d3.selectAll('.tcircle').attr('opacity', 0);
		
		$('#t_legend').button('enable');
		$('#t_talk').button('disable');
		
		$('#toAdj').button('enable');
		
		d3.selectAll('.month').attr('opacity', 1);
		
		WIKIVIZ.view.mode = 'art';
		
		if (WIKIVIZ.isTimeSpaced === false) {
			$('#toAdj').button('disable');
			$('#toTime').button('enable');
			WIKIVIZ.navctl.toAdjacentSpaced();
		} else {
			$('#toAdj').button('enable');
			$('#toTime').button('disable');
			WIKIVIZ.navctl.toTimeSpaced();
		}
		
		WIKIVIZ.navctl.onScale();
		
		$('.talkrow').addClass('invisible');
		$('.defaultrow').removeClass('invisible');
		
		d3.select('.fg').attr('transform', 'translate(0, -500)');
		
		d3.selectAll('g.ylabel').attr('opacity', 1);
	});
	$('a[href=#talkview]').click(function(event, ui) {
		$('#view').appendTo('#talkview');
		WIKIVIZ.view.data.selectAll('.datum').attr('opacity', 0);
		d3.selectAll('.sd').attr('opacity', 0);
		d3.selectAll('.tdatum').attr('opacity', 1);
		d3.selectAll('.tcircle').attr('opacity', 1);
		
		$('#t_legend').button('disable');
		$('#t_talk').button('enable');
		
		WIKIVIZ.view.mode = 'talk';
		
		if (WIKIVIZ.isTimeSpaced === false) {
			d3.selectAll('.month').attr('opacity', 0);
			$('#toAdj').button('disable');
			$('#toTime').button('enable');
			WIKIVIZ.navctl.toAdjacentSpaced();
		} else {
			$('#toAdj').button('enable');
			$('#toTime').button('disable');
			WIKIVIZ.navctl.toTimeSpaced();
		}
		
		WIKIVIZ.navctl.onScale();
		
		$('.talkrow').removeClass('invisible');
		$('.defaultrow').addClass('invisible');
		
		d3.select('.fg').attr('transform', 'translate(0, 0)');
		
		d3.selectAll('g.ylabel').attr('opacity', 0);
	});
	$('a[href=#hybridview]').click(function(event, ui) {
		$('#view').appendTo('#hybridview');
		WIKIVIZ.view.data.selectAll('.datum').attr('opacity', 1);
		d3.selectAll('.sd').attr('opacity', 1);
		d3.selectAll('.tdatum').attr('opacity', 1);
		d3.selectAll('.tcircle').attr('opacity', 1);

		
		$('#t_legend').button('enable');
		$('#t_talk').button('enable');
		
		$('#toAdj').button('disable');
		$('#toTime').button('disable');
		
		WIKIVIZ.view.mode = 'hybrid';
		WIKIVIZ.navctl.toTimeSpaced();
		
		d3.selectAll('.month').attr('opacity', 1);
		
		$('.talkrow').removeClass('invisible');
		$('.defaultrow').removeClass('invisible');
		
		d3.select('.fg').attr('transform', 'translate(0, 0)');
		d3.selectAll('g.ylabel').attr('opacity', 1);
	});
	
	// In the default configuration, we are already in adjacent spacing mode, so we can disable the adjacent spacing button.
	$('#toAdj').button('disable');
};

// Initialize the visualization. Create SVG and elements correspondng to data.
WIKIVIZ.initViz = function()
{
	// For brevity
	var maskWidth = WIKIVIZ.maskWidth;	// Width of mask over which y label is written
	
	WIKIVIZ.view.svg = d3.select('#view').append('svg').attr('width', WIKIVIZ.width).attr('height', WIKIVIZ.height);
	
	// Re-arrange coordinate system by setting x=0 to the center of the SVG and flipping the y-axis values.
	// Also, set y=0 offset by maskWidth to the left to simplify math regarding the position of the y-axis title and masking rect.
	WIKIVIZ.view.sview = WIKIVIZ.view.svg.append('g').attr('width', WIKIVIZ.width).attr('transform', 'translate(' + (maskWidth) + ',' + (WIKIVIZ.height/2 - 0.5) + ')scale(1,-1)');
	
	// Init the x and y scale objects.
	WIKIVIZ.view.x = d3.scale.linear();
	WIKIVIZ.view.y = d3.scale.linear();
	
	// For adjancent talk pages.
	WIKIVIZ.view.tx = d3.scale.linear();
	WIKIVIZ.view.ty = d3.scale.linear();
	
	// Must take into account the mask width here!
	var barWidth = WIKIVIZ.calcBarWidth();
	
	var view = WIKIVIZ.view;
	
	// Set up x and y ranges for the visualization. The x-range is designed so that x(n) gives the x-position of the nth bar's left edge.
	view.x.range([0, barWidth]);
	view.y.range([0, WIKIVIZ.height/2 - 50]);	// Leave a little bit of room.
	view.y.domain([0, WIKIVIZ.absMax(WIKIVIZ.data['revisions'], function(elem) { return elem.loglev; })]);	// Y domain determined using largest magnitude y-value
	
	// Group to contain horizontal rules for the visualization
	view.rules = view.sview.append('g').attr('class', 'rules');
	
	// Positive and negative horizontal rules groups.
	var posrules = view.rules.append('g').attr('class', 'posrules');
	var negrules = view.rules.append('g').attr('class', 'negrules');
	
	// Generate actual rules
	posrules.selectAll('g.rule').data(view.y.ticks(5)).enter().append('g').attr('class', 'rule').attr('transform', function(d) { return 'translate(0,' + view.y(d) + ')'; });
	negrules.selectAll('g.rule').data(view.y.ticks(5)).enter().append('g').attr('class', 'rule').attr('transform', function(d) { return 'translate(0,' + (-view.y(d)) + ')'; });
	
	
	// Append lines to rules (i.e. visual representation of rules)
	view.rules.selectAll('.rule').append('line').attr('x2', WIKIVIZ.width);
	
	// Append visualization body group. This group contains the actual visualization. By transforming this group, we transform all the bars and annotations of the visualization.
	WIKIVIZ.view.body = view.sview.append('g').attr('class', 'body').attr('transform', 'translate(0,0)');
	
	var body = WIKIVIZ.view.body;
	// Append x-axis
	view.sview.append('g').attr('class', 'xaxis').append('line').attr('x2', WIKIVIZ.width);
	
	// Y-label and mask group
	var ylabel = view.sview.append('g').attr('class', 'ylabel');
	// Append mask for y-label
	ylabel.append('rect').attr('class', 'ymask').attr('width', maskWidth).attr('height', WIKIVIZ.height).attr('y', -WIKIVIZ.height/2).attr('x', -maskWidth);
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
	WIKIVIZ.view.data = body.select('g.mid').append('g').attr('class', 'data');
	var data = WIKIVIZ.view.data;
	
	var datum = data.selectAll('.datum').data(WIKIVIZ.data['revisions']).enter().append('g').attr('class', 'datum').attr('transform', function(d) { return 'translate(' + view.x(WIKIVIZ.index(d)) + ', 0)'; }).attr('opacity', 1);
	datum.append('title').text(function(d) {
		return d.group + ': ' + d.user + '\n' + WIKIVIZ.formatDate(new Date(d.timestamp)) + '\n' + 'Revision Categories: ' + WIKIVIZ.toClassString(d.class) + '\n' + 'Revision Size: ' + d.lev;
	});
	var bars = datum.append('g').attr('class', 'bars');
	WIKIVIZ.buildBars(bars, barWidth);
	datum.append('text').attr('class', 'xlabel').text(function(d) { return 1+WIKIVIZ.index(d); })
		.attr('transform', function() { return 'translate(0,' + String(-7) + ')scale(1,-1)rotate(90,0,0)'; });
	WIKIVIZ.buildMonths();
	
	
	WIKIVIZ.view.tdata = body.select('g.fg').append('g').attr('class', 'tdata');	// Group for talk page data entries
	var tentries = WIKIVIZ.view.tdata.selectAll('.tdatum').data(WIKIVIZ.data.talk).enter().append('g').attr('class', 'tdatum')
		.attr('transform', function(d) { return 'translate(' + view.x(WIKIVIZ.index(d)) + ', 0)'; }).attr('opacity', 0);
	WIKIVIZ.appendCallout(tentries);
	
	WIKIVIZ.toAdjacentSpaced();
};

// This is the action that is taken when the user clicks on the "reset selections" button in the toolbar.
// It should reset all selection tools to their default states, and enable previously disabled selection tools as necessary.
WIKIVIZ.clearAllSelections = function() {
	
	// Disable the deselect button
	$('#t_deselect').button('disable');
	
	// Update the info box (UNUSED)
	WIKIVIZ.updateInfo({});
	
	// Clear all selections made in the table view.
	$('#diag_data table tbody tr').each(function (i, elem) { $(elem).removeClass('rowselect'); });
	
	// Pre-check all edit category and user group selection boxes.
	$('#d_legend_accordion input').attr('checked', 'checked');
	$('#d_select_groups_accordion input').attr('checked', 'checked');
	
	// Update the various views to reflect reset of all selections.
	WIKIVIZ.view.data.selectAll('.bars rect').transition().duration(500).attr('opacity', 1);
	WIKIVIZ.view.data.selectAll('.datum').transition().duration(500).attr('opacity', 1);
	
	// Update nav control spikes
	WIKIVIZ.navctl.spikes.transition().duration(500).attr('opacity', 1);
	
	// Re-enable any previously disabled selection controls
	$('#diag_legend input').removeAttr('disabled');
	$('#d_select_groups_accordion input').removeAttr('disabled');
};

// Switch visualization to time-spaced mode, or update time-spaced visualization
// This is currently called by the slider element on a switch mode event.
WIKIVIZ.toTimeSpaced = function()
{
	WIKIVIZ.isTimeSpaced = true;
	
	// Re-position all article revision elements using the x axis time scale.
	d3.selectAll('.datum')
		.attr('transform', function(d) {return 'translate(' + WIKIVIZ.view.timeX(d.date) + ',0)';})
		.selectAll('.bars rect').attr('width', WIKIVIZ.calcBarWidth());
	
	// Re-position talk page entry callouts using the x-axis time scale.
	d3.selectAll('.tdatum')
		.attr('transform', function(d) {return 'translate(' + WIKIVIZ.view.timeX(d.date) + ',0)';})
	
	// Update the month view.
	WIKIVIZ.buildMonths();
	
	// Show the month view if we are in TS talk page mode.
	// This is because the month view is hidden in adj-talk page mode, but we want it for TS anyway.
	if (WIKIVIZ.view.mode == "talk") {
		d3.selectAll('.month').attr('opacity', 1);
	}
}

// Switch visualization to adacent-spacing mode
// Currently called by the slider element when a mode change event occurs.
WIKIVIZ.toAdjacentSpaced = function()
{
	WIKIVIZ.isTimeSpaced = false;
	
	// Hide the month view if we are in adjacent spacing talk-page mode.
	// (The month view does not make any sense in this mode)
	if (WIKIVIZ.view.mode == "talk") {
		d3.selectAll('.month').attr('opacity', 0);
		WIKIVIZ.view.tx.range([0, WIKIVIZ.getAdjacentTalkWidth() ]);
	}

	// Re-position all article and talk-page contributions using adjacent-spacing parameters / axes.
	d3.selectAll('.datum')
		.attr('transform', function(d) {return 'translate(' + WIKIVIZ.view.x(WIKIVIZ.index(d)) + ',0)';})
		.selectAll('.bars rect').attr('width', WIKIVIZ.calcBarWidth());
		
	d3.selectAll('.tdatum')
		.attr('transform', function(d, i) {return 'translate(' + WIKIVIZ.view.tx(i) + ',0)';});
		
	// Update the month view.
	WIKIVIZ.buildMonths();
}

// Calculate the inner width of a callout element based in its contents.
WIKIVIZ.getCalloutHeight = function(d)
{
	var ret = 0;
	var el_w = 29;	// Width of icon + padding
	if (d.att !== 0) { ret += el_w; }
	if (d.crit !== 0) { ret += el_w; }
	if (d.inf !== 0) { ret += el_w; }
	if (d.perf !== 0) { ret += el_w; }
	return ret;
}

// Generate an array of callout classification images based on the talk-page
// entry that is represented by that callout.
WIKIVIZ.genCalloutImageSet = function(d)
{
	var imgs = [];
	if (d.att !== 0) { imgs.push('att'); }
	if (d.crit !== 0) { imgs.push('crit'); }
	if (d.inf !== 0) { imgs.push('inf'); }
	if (d.perf !== 0) { imgs.push('perf'); }
	return imgs;
}

// Append the callouts that correspond to the talk-page entries for our article to the given element.
// Note that the argument 'parent' should be a d3 selection.
WIKIVIZ.appendCallout = function(parent)
{
	var cw = 24;
	// Padding around content
	var px = 10;
	var py = 10;
	var ox = 10;
	var oy = 10;
	var cr = 5;	// Corner radius in px
	
	// Max circle radius
	var maxR = 10;
	var fact = 1.2;
	
	// Append circle to our element. Cap the circle size and re-style the circle if it has reached the cap.
	parent.filter(function(d) { return Math.log(d.lev+1)*fact <= maxR; }).append('circle').attr('r', function(d) { return Math.log(d.lev+1)*fact; }).attr('class', 'tcircle');
	parent.filter(function(d) { return Math.log(d.lev+1)*fact > maxR; }).append('circle').attr('r', maxR).attr('class', 'tcircle_full');
	
	// Generate the tooltip for this element.
	parent.append('title').text(function(d) {
		return 'User: ' + d.contributor + '\n' + WIKIVIZ.formatDate(d.date) + '\n' + 'Revision Categories: ' + WIKIVIZ.toTalkClassString(d) + '\n' + 'Revision Size: ' + d.lev;
	});
	
	// Generate the path that defines the shape of the callout.
	var callout = parent.append('path');
	callout.attr('d', function(d) { return "M 0 0 l {0} {1} l 0 {2} a {3} {3} 0 0 0 {3} {3} l {4} 0 a {3} {3} 0 0 0 {3} -{3} l 0 -{5} a {3} {3} 0 0 0 -{3} -{3} l -{6} 0 z".format(
		ox, oy,	// Coords of left bottom of callout "box" rel. to "origin"
		WIKIVIZ.getCalloutHeight(d) + 2*px - 2*cr,
		cr,	// Corner radius
		cw + 2*py - cr,
		WIKIVIZ.getCalloutHeight(d) + 2*px - cr - 10,
		cw + 2*py - 2*cr	// Last number here is the width of the wide-end of the callout triangle
	)});
	callout.attr('class', 'callout');
	
	
	// Generate the x-offset for each callout incrementally.
	// This is used in adjacent spacing of callouts.
	var x = 0;
	
	// Create image groups based on talk-page classifications and append these image groups to their respective callouts.
	var igroup = parent.append('g').attr('class', 'igroup').attr('transform', 'translate(' + (ox+px) + ',' + (oy+py) +')scale(1,-1)').datum(function(d) { return WIKIVIZ.genCalloutImageSet(d); });
	igroup.each(function (d) {
		d3.select(this).selectAll('image').data(d).enter().append('image').attr('xlink:href', function(dm) { return "img/" + dm + ".png"; }).attr('y', function(dm, i) { return -29*i-24; })
			.attr('width', 24).attr('height', 24).attr('x', 3).attr('class', function(dm) { return dm; } );
	});
	
	// Append to each callout an x-axis label corresponding to its ID.
	parent.append('text').attr('class', 'xlabel').text(function(d, i) { return i + 1; })
		.attr('transform', function(d) { return 'translate(' + (ox+px/2) + ',' + (oy+py/2) + ')scale(1,-1)'; });
}

// Calculate bar width based on number of bars per screen
WIKIVIZ.calcBarWidth = function()
{
	var w = (WIKIVIZ.width - WIKIVIZ.maskWidth)/(WIKIVIZ.numBars);
	if (WIKIVIZ.isTimeSpaced) { w = Math.min(w, 7); }
	return w;
};

// Calculate talk width based on number of talk entries per screen
WIKIVIZ.calcTalkWidth = function()
{
	var w = (WIKIVIZ.width - WIKIVIZ.maskWidth)/(WIKIVIZ.numDots);
	return w;
};

WIKIVIZ.getAdjacentTalkWidth = function()
{
	return WIKIVIZ.data.talk.length * 70; // width of one callout
};

// Function to map revision data to rectangle groups that represent the data as a stacked bar graph.
WIKIVIZ.buildBars = function(barsGroup, barWidth)
{
	var posFields = ['add', 'unsure', 'reorganize', 'edit', 'cite', 'vand', 'unclassified'];
	var negFields = ['unvand', 'remove'];
	
	// For brevity
	var y = WIKIVIZ.view.y;
	var index = WIKIVIZ.index;
	
	// Make array to store partial sums of weighted attributes for each data element
	var sums = [];
	for (var i = 0; i < WIKIVIZ.data.revisions.length; ++i) { sums[i] = 0; }	// Zero-out array
	$.each(posFields, function(i, v) {	// Build up the stacked bars. The sums array stores the sum of the last few stacked values' heights so that we can stack them properly
		barsGroup.filter(function (d) { return d.wclass[v] > 0.0001; }).append('rect').attr('y', function(d) { return y(sums[index(d)]); })
			.attr('width', barWidth).attr('height', function(d) { return y(d.wclass[v]); }).attr('class', v)
			.attr('desc', index).attr('opacity', 1);
		// Collect the sums of what we've seen so far so as to stack the bars properly
		for (var ind = 0; ind < WIKIVIZ.data.revisions.length; ++ind) { sums[ind] += WIKIVIZ.data.revisions[ind].wclass[v]; }
	});
	
	// The negatives are done the same way, but we have to change the role of the 'y' attribute.
	for (var i = 0; i < WIKIVIZ.data.revisions.length; ++i) { sums[i] = 0; }	// Zero-out array
	$.each(negFields, function(i, v) {	// Build up the stacked bars. The sums array stores the sum of the last few stacked values' heights so that we can stack them properly
		barsGroup.filter(function (d) { return d.wclass[v] > 0.0001; }).append('rect').attr('y', function(d) { return -y(d.wclass[v]+sums[index(d)]); }).attr('width', barWidth)
			.attr('height', function(d) { return y(d.wclass[v]); }).attr('class', v).attr('desc', index).attr('opacity', 1);
		// Collect the sums of what we've seen so far so as to stack the bars properly
		for (var ind = 0; ind < WIKIVIZ.data['revisions'].length; ++ind) { sums[ind] += WIKIVIZ.data['revisions'][ind].wclass[v]; }
	});
};

// Get left edge of a given bar on the visualization
WIKIVIZ.getOffset = function(ind)
{
	if (WIKIVIZ.isTimeSpaced == false) {
		return ind * WIKIVIZ.calcBarWidth();
	} else {
		return WIKIVIZ.data.revisions[ind].dateOffset;
	}
}

// Create or Update month background rects.
// These are the shaded rectangles in the background of the visualization that indicate periods of 1 month.
// We need to build these to the correct scale so that they line up with the correct revisions.
WIKIVIZ.buildMonths = function ()
{
	var barWidth = WIKIVIZ.calcBarWidth();
	var revdata = WIKIVIZ.data.revisions;
	var blankThreshold = 10;	// Min. additional width of month box required to display text.
	//WIKIVIZ.view.body.select('.bg').selectAll('.month').data([]).exit().remove();
	var data = [];
	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	
	// If the visualization is not time spaced, we need to go through our data, find month boundaries, and
	// build a list of the left and right offsets of the month rects on the visualization
	if (!WIKIVIZ.isTimeSpaced) {
		var lastDate = new Date(revdata[0].timestamp);
		var curDate;
		var lastIndex = 0;
		var lastRev = WIKIVIZ.data.revisions[0];
		for (var i = 1; i < revdata.length; ++i) {
			// We need to build width and offset positions for the various month groups
			// We do this by scanning through our bar graph data and appending to the month data as we go.
			curDate = new Date(revdata[i].timestamp);
			if (curDate.getMonth() !== lastDate.getMonth() || curDate.getYear() !== lastDate.getYear()) {
				//var left = lastIndex * barWidth;
				//var right = (i-1) * barWidth;
				var left = WIKIVIZ.getOffset(lastIndex);
				var right = WIKIVIZ.getOffset(i);
				if (left === right) continue;
				data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
				lastDate = curDate;
				lastIndex = i;
			}
		}
		
		var left = WIKIVIZ.getOffset(lastIndex);
		var right = WIKIVIZ.getOffset(revdata.length);
		data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
	} else {	// If we ARE in time-separated mode, we need to loop through all the months between the first and last edits
			// and add them all.
			// We use the timeX scale to find the left and right boundaries.
		var last = WIKIVIZ.data.revisions.length-1;
		var lastMonth;
		var first = true;
		var timeX = WIKIVIZ.view.timeX;
		for (var m = WIKIVIZ.data.revisions[0].date.getMonth(),
		     y = WIKIVIZ.data.revisions[0].date.getFullYear();
		     m <= WIKIVIZ.data.revisions[last].date.getMonth() || y <= WIKIVIZ.data.revisions[last].date.getFullYear();
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
	
	var mts_e = WIKIVIZ.view.body.select('.bg').selectAll('.month').data(data, function(d, i) { return i; }).enter();
	var mts_g = mts_e.append('g').attr('class', 'month').attr('transform', function(d) { return 'translate(' + d.l + ',0)'; });
	mts_g.append('rect').attr('height', String(WIKIVIZ.height)).attr('width', function(d) { return (d.r-d.l); })
		.attr('class', function(d, i) { return (i%2 === 0)?('m_odd'):('m_even');}).attr('y', String(-WIKIVIZ.height/2));
	mts_g.append('text').attr('class', 'mtext').text(function(d) { return months[d.m]; }).attr('transform', function(d) { return 'translate(5,' + (WIKIVIZ.height/2 - 15) + ')scale(1,-1)';}).attr('opacity', 1).filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
	mts_g.append('text').attr('class', 'ytext').text(function(d) { return String(d.y); }).attr('transform', function(d) { return 'translate(5,' + (WIKIVIZ.height/2 - 30) + ')scale(1,-1)';}).attr('opacity', 1).filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).attr('opacity', 0);
	
	
	mts = WIKIVIZ.view.body.selectAll('.month').data(data, function(d, i) { return i; });
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
}

// Deletes all of the month rects.
WIKIVIZ.clearMonths = function() {
	WIKIVIZ.view.body.select('.bg').selectAll('.month').data([]).exit().remove();
}

// Rescale x-axis based on the number of bars that should fit into a screen.
WIKIVIZ.setNumBars = function(numBars)
{
	if (numBars <= 0) return;	// Don't act on invalid values!
	WIKIVIZ.numBars = numBars;
	
	WIKIVIZ.view.x.range([0, WIKIVIZ.calcBarWidth()]);
	
	if (!WIKIVIZ.isTimeSpaced)
		WIKIVIZ.view.data.selectAll('.datum')
			.attr('transform', function(d) { return 'translate(' + WIKIVIZ.view.x(WIKIVIZ.index(d)) + ', 0)'; });
	
	WIKIVIZ.view.data.selectAll('.datum').selectAll('.bars rect').attr('width', WIKIVIZ.calcBarWidth());
	// Hide x labels that would overlap!
	WIKIVIZ.view.data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width <= WIKIVIZ.calcBarWidth(); })
		.attr('opacity', 1);
	WIKIVIZ.view.data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width > WIKIVIZ.calcBarWidth(); })
		.attr('opacity', 0);
	
	// Need to update the month rectangles so that they use the new scale!
	WIKIVIZ.buildMonths();
};

WIKIVIZ.setNumDots = function(numDots)
{
	
	// Redraw dots here for talk page entries
	
	if (numDots <= 0) return;	// Don't act on invalid values!
	WIKIVIZ.numDots = numDots;
	
	WIKIVIZ.view.tx.range([0, WIKIVIZ.calcTalkWidth()]);

	if (!WIKIVIZ.isTimeSpaced)
		WIKIVIZ.view.tdata.selectAll('.tdatum')
			.attr('transform', function(d, i) { return 'translate(' + WIKIVIZ.view.tx(i) + ', 0)'; });
	
	WIKIVIZ.buildMonths();

};

// This is the code that handles the fancy draggable SVG scrollbar at the bottom of the page.
WIKIVIZ.navctl = {
	// Start up the control.
	init: function(sw, sh) {
		// Scrollbar dimensions
		this.dim = {w: sw, h: sh};
		
		this.sdim = {x0: 0, w: 100};
		
		// Create the SVG element for the scrollbar
		this.svg = d3.select('#navctl').append('svg').attr('width', this.dim.w).attr('height', this.dim.h);
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
		this.xscale.domain([0, WIKIVIZ.data.revisions.length-1]);
		this.xscale.range([0, this.dim.w - 2*handleWidth]);
		
		this.yscale = d3.scale.linear();
		this.yscale.domain(WIKIVIZ.view.y.domain());
		this.yscale.range([0, this.dim.h/2]);
		
		var that = this;
		
		this.spikewidth = (this.dim.w-2*handleWidth) / WIKIVIZ.data.revisions.length;
		
		this.spikes = this.bg.select('g.navbars').selectAll('rect.sd').data(WIKIVIZ.data.revisions);
		this.spikes.enter().append('rect')
			.attr('x', function(d,i) { return that.xscale(i); })
			.attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
			.attr('width', function(d,i) { return that.spikewidth; })
			.attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
			.attr('class', 'sd');
			
		// Draw talk page entries, need to manually keep this in sync with appendCallout for now
		
		this.dots = this.bg.select('g.navbars').selectAll('circle.td').data(WIKIVIZ.data.talk).enter().append('circle')
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
		$('.chandle').mousedown(function(event) {
			$(this).addClass('dragging');
			that.sd.dx = event.pageX - that.sdim.x0;
			event.preventDefault();
		});
		$('.lhandle').mousedown(function(event) {
			$(this).addClass('dragging');
			that.sd.dx = event.pageX - that.sdim.x0;
			event.preventDefault();
		});
		$('.rhandle').mousedown(function(event) {
			$(this).addClass('dragging');
			that.sd.dx = event.pageX;
			event.preventDefault();
		});
		
		// More event handlers. These deal with dragging the slider.
		$(document).mousemove(function(event) {
			if ($('.rhandle').hasClass('dragging')) {
				var dw = (event.pageX - that.sd.dx);
				that.sd.dx = event.pageX;
				var newW = +that.sdim.w +dw;
				
				if (newW < handleWidth) newW = handleWidth;
				if (newW + that.sdim.x0 + handleWidth > that.dim.w) newW = that.dim.w-that.sdim.x0-handleWidth;
				that.sdim.w = newW;
				
				$('.chandle').attr('width', that.sdim.w - handleWidth);
				$('.rhandlegrp').attr('transform', 'translate(' + (+that.sdim.w) + ',0)')
				that.onScale();
				that.onSlide();
			}
			if ($('.lhandle').hasClass('dragging')) {
				var newX0 = (event.pageX - that.sd.dx);
				if (newX0 < 0) newX0 = 0;
				if (newX0 > that.sdim.x0 + that.sdim.w - handleWidth) newX0 = that.sdim.x0 + that.sdim.w - handleWidth;
				
				var newW = +that.sdim.w - (+newX0 - +that.sdim.x0);
				if (newW < handleWidth) {
					newW = handleWidth;
				}
				
				that.sdim.x0 = newX0;
				that.sdim.w = newW;
				
				$('.slider').attr('transform', 'translate(' + (that.sdim.x0) + ',0)');
				$('.chandle').attr('width', that.sdim.w - handleWidth);
				$('.rhandlegrp').attr('transform', 'translate(' + (+that.sdim.w) + ',0)')
				that.onScale();
				that.onSlide();
			}
			if ($('.chandle').hasClass('dragging')) {
				that.sdim.x0 = (event.pageX - that.sd.dx);
				
				if (that.sdim.x0 < 0) that.sdim.x0 = 0;
				if (that.sdim.x0 > that.dim.w - ((handleWidth) + that.sdim.w)) that.sdim.x0 = that.dim.w - ((handleWidth) + that.sdim.w);
				$('.slider').attr('transform', 'translate(' + (that.sdim.x0) + ',0)');
				that.onSlide();
			}
		});
		// Once the mouse is released, reset the slider "dragging" state.
		$(document).mouseup(function() {
			$('.chandle').removeClass('dragging');
			$('.lhandle').removeClass('dragging');
			$('.rhandle').removeClass('dragging');
		})
		
		this.handleWidth = handleWidth;
		
		// Call these to update the slider for the first time.
		this.onSlide();
		this.onScale();
	},
	
	// Adjust the slider when we switch to time-spaced mode.
	// Use a new time-spaced scale for display.
	toTimeSpaced: function() {
		
		var minDate = WIKIVIZ.data.revisions[0].date;
		
		this.xscale = d3.time.scale();
		// Todo: domain of talk entries may exceed revisions
		this.xscale.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
			WIKIVIZ.data.revisions[WIKIVIZ.data.revisions.length - 1].date]);
		this.xscale.range([0, this.dim.w - 2*this.handleWidth]);
		
		var that = this;
		
		this.bg.select('g.navbars').selectAll('rect.sd').data(WIKIVIZ.data.revisions)
			.attr('x', function(d,i) { return that.xscale(d.date); })
			.attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
			.attr('width', function(d,i) { return that.spikewidth; })
			.attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
			.attr('class', 'sd');
			
		this.bg.select('g.navbars').selectAll('circle.tcircle').data(WIKIVIZ.data.talk)
			.attr('cx', function(d) { return that.xscale(d.date); });
				
		this.mode = 'time';
		
		WIKIVIZ.toTimeSpaced();
		
		this.onSlide();
		this.onScale();
	},
	
	// When we switch to adjacent-spaced mode, switch back to using a linear scale for display.
	toAdjacentSpaced: function() {
		
		this.xscale = d3.scale.linear();
		
		if (WIKIVIZ.view.mode == 'talk')
			this.xscale.domain([0, WIKIVIZ.data.talk.length-1]);
		else
			this.xscale.domain([0, WIKIVIZ.data.revisions.length-1]);
			
		this.xscale.range([0, this.dim.w - 2*this.handleWidth]);
		
		var that = this;
		
		this.bg.select('g.navbars').selectAll('rect.sd').data(WIKIVIZ.data.revisions)
			.attr('x', function(d,i) { return that.xscale(i); })
			.attr('y', function(d) { return -that.yscale(d.wclass.remove + d.wclass.vand); })
			.attr('width', function(d,i) { return that.spikewidth; })
			.attr('height', function(d) { return that.yscale(d.loglev - (d.wclass.remove + d.wclass.vand))+that.yscale(d.wclass.remove + d.wclass.vand); })
			.attr('class', 'sd');
		
		this.bg.select('g.navbars').selectAll('circle').data(WIKIVIZ.data.talk)
			.attr('cx', function(d, i) { return that.xscale(i); });
		
		this.mode = 'adj';
		
		WIKIVIZ.toAdjacentSpaced();
		
		this.onSlide();
		this.onScale();
	},
	
	// Slide the view when we slide the slider.
	onSlide: function() {
		d3.select('g.body').attr('transform', 'translate(' + -this.getPanOffset() + ',0)')
	},
	
	onScale: function() {
		if (this.mode == 'adj' && WIKIVIZ.view.mode == 'art') { WIKIVIZ.setNumBars(this.getNumBars()); }
		else if (this.mode == 'adj' && WIKIVIZ.view.mode == 'talk') { WIKIVIZ.setNumDots(this.getNumBars()); }
		else if (this.mode == 'time') {
			var df = WIKIVIZ.data.revisions[WIKIVIZ.data.revisions.length - 1].date;
			var d0 = WIKIVIZ.data.revisions[0].date;
			var d1 = this.xscale.invert(this.sdim.x0);
			var d2 = this.xscale.invert(this.sdim.x0+this.sdim.w-this.handleWidth);
			
			// The multiplier 0.9 is a quick fix for getting the rightmost bars in TS mode visible.
			WIKIVIZ.view.timeX.range([0, 0.9*WIKIVIZ.width * (df-d0) / (d2 - d1)]);
			WIKIVIZ.toTimeSpaced();
		}
		
	},
	
	// Map slider motion to an offset by which to pan the main view. Behaves differently for time and adjacent spaced modes.
	getPanOffset: function() {
		if (this.mode == 'adj' && WIKIVIZ.view.mode == 'art') {
			return ((this.sdim.x0) / (this.dim.w - 2*this.handleWidth))*(WIKIVIZ.data.revisions.length*WIKIVIZ.calcBarWidth());
		}
		else if (this.mode == 'adj' && WIKIVIZ.view.mode == 'talk') {
			return ((this.sdim.x0) / (this.dim.w - 2*this.handleWidth))*(WIKIVIZ.data.talk.length*WIKIVIZ.calcTalkWidth());
		}
		else if (this.mode == 'time') {
			return WIKIVIZ.view.timeX(this.xscale.invert(this.sdim.x0));
		}
		return 0;
	},
	
	getNumBars: function() {
		return this.xscale.invert(this.sdim.x0+this.sdim.w-this.handleWidth) - this.xscale.invert(this.sdim.x0);
	},
	
	getTimeRange: function() {
		
	}
}
