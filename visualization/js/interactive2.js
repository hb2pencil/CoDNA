/**
 * @author Henry Brausen
 */

WIKIVIZ = {
	width: 910,
	height: 500,
	numBars: 60,
	maskWidth: 50,
	timeMultiplier: 1,
	weights: {
		add: 60,
		remove: 60,
		edit: 20,
		reorganize: 40,
		vand: 10,
		unvand: 10,
		cite: 20
	},
	view: {
		timeX: d3.time.scale()
	}
};

WIKIVIZ.formatDate = function(dt) {
	return ['January', 'February', 'March',
		'April', 'May', 'June',
		'July', 'August', 'September',
		'October', 'November', 'December'][dt.getMonth()] +
		' ' + dt.getDate() + ', ' + dt.getFullYear() + '   ' +
		('0'+dt.getHours()).substr(-2,2) + ':' +
		('0'+dt.getMinutes()).substr(-2,2);	// Thanks to http://stackoverflow.com/questions/5250244/jquery-date-formatting
							// for the quick fix for hours, minutes and seconds!
};

WIKIVIZ.getDateSortKey = function(dt) {
	return String(dt.getFullYear()) + ('0'+dt.getMonth()).substr(-2, 2) +
		('0'+dt.getDate()).substr(-2, 2) + ('0'+dt.getHours()).substr(-2,2) +
		('0'+dt.getMinutes()).substr(-2,2)+('0'+dt.getSeconds()).substr(-2,2);
};

// Take two lists, interpret as sets, and return true if subset_l is a subset of superset_l
WIKIVIZ.isSubset = function(subset_l, superset_l) {
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

// Get a list of the user's groups ('higher-level groups') at the present time.
// So far, this will always return one group, but we can expand on this later.
WIKIVIZ.getGroupsByName = function(username) {
	if (!WIKIVIZ.data.users.hasOwnProperty(username)) return ['None'];	// If we don't have data for this user (for whatever reason), assume no groups.
	if (!WIKIVIZ.data.users[username].history[WIKIVIZ.data.users[username].history.length-1]) return ['None'];
	return WIKIVIZ.data.users[username].history[WIKIVIZ.data.users[username].history.length-1].userclass;
};

// Highlight those entries that were made by users in userlist.
WIKIVIZ.applyUserSelection = function(userlist) {
	WIKIVIZ.clearAllSelections();	// Clean up any previous selections!
	
	// Enable the deselect button if there is an active selection
	if (userlist.length > 0) {
		$('#t_deselect').button('enable');
	} else {
		WIKIVIZ.clearAllSelections();
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
		if (jQuery.inArray(WIKIVIZ.getGroupsByName(userlist[i]), info['User Groups']) == -1) {
			info['User Groups'].push(WIKIVIZ.getGroupsByName(userlist[i]));
		}
	}
	WIKIVIZ.updateInfo(info);
	
	// Apply selection to 'Content Details' table.
	$('#diag_data table tbody').children('tr').each(function (i, elem) {
		$(elem).removeClass('rowselect');
		if (jQuery.inArray($(elem).children(':first').text(), userlist) != -1) {
			$(elem).addClass('rowselect');
		}
	});
	
	// Apply selection to default view
	WIKIVIZ.view.data.selectAll('.datum').filter(function (d) { return jQuery.inArray(d.user, userlist) === -1; }).selectAll('.bars rect').transition().duration(500).attr('opacity', 0.2);
	
	return;
};

// Update the info box using an object composed of prop=>val pairs.
WIKIVIZ.updateInfo = function(properties) {
	// Update the content of the info box.
	// First, hide the default 'no selection' message.
	$('#d_info_noselection').addClass('invisible');
	
	// Clear any data inside the info div.
	$('#d_info_selection').empty();
	
	var numProps = 0;
	
	$('#d_info_selection').append($('<table>'));
	
	for (p in properties) {
		if (!properties.hasOwnProperty(p)) continue;
		++numProps;
		$('#d_info_selection table').append($('<tr>').append($('<td>').text(p)).append($('<td>').text(properties[p].toString())));
	}
	
	// If there is no data, display 'no selection' message.
	if (numProps == 0) {
		$('#d_info_selection').empty();
		$('#d_info_noselection').removeClass('invisible');
	}
};

WIKIVIZ.clearAllSelections = function(clearCheckBoxes) {
	if (typeof(clearCheckBoxes) === 'undefined') clearCheckBoxes = false;
	$('#t_deselect').button('disable');
	WIKIVIZ.updateInfo({});
	$('#diag_data table tbody tr').each(function (i, elem) { $(elem).removeClass('rowselect'); });
	$('#d_legend_accordion input').attr('checked', 'checked');
	$('#d_select_groups_accordion input').attr('checked', 'checked');
	WIKIVIZ.view.data.selectAll('.bars rect').transition().duration(500).attr('opacity', 1);
	WIKIVIZ.view.data.selectAll('.datum').transition().duration(500).attr('opacity', 1);
	$('#diag_legend input').removeAttr('disabled');
	$('#d_select_groups_accordion input').removeAttr('disabled');
	
	/*
	// Clear selections in the select users dialog
	if (clearCheckBoxes) {
		$('#diag_select :checked').removeAttr('checked');
		$('#diag_select :selected').removeAttr('selected');
	}*/
	
	return;
};

// Switch visualization to time-spaced mode, or update time-spaced visualization
WIKIVIZ.toTimeSpaced = function()
{
	/*if (!WIKIVIZ.isTimeSpaced) {	// If we are switching modes, re-assign range of h-zoom slider
		$('#hzoom_slider').slider('option', 'max', 10);
		$('#hzoom_slider').slider('option', 'min', 1);
		$('#hzoom_slider').slider('value', WIKIVIZ.timeMultiplier);
	}*/
	WIKIVIZ.isTimeSpaced = true;
	d3.selectAll('.datum').transition().duration(1000)
		.attr('transform', function(d) {return 'translate(' + WIKIVIZ.view.timeX(d.date) + ',0)';})
		.selectAll('.bars rect').attr('width', WIKIVIZ.calcBarWidth());

	$('#pan').slider('option', 'max', WIKIVIZ.view.timeX.range()[1]);
	WIKIVIZ.buildMonths();
}

// Switch visualization to adacent-spacing mode
WIKIVIZ.toAdjacentSpaced = function()
{
	//if (!WIKIVIZ.isTimeSpaced) return;
	WIKIVIZ.isTimeSpaced = false;
	d3.selectAll('.datum').transition().duration(1000)
		.attr('transform', function(d) {return 'translate(' + WIKIVIZ.view.x(WIKIVIZ.index(d)) + ',0)';})
		.selectAll('.bars rect').attr('width', WIKIVIZ.calcBarWidth());
	WIKIVIZ.updatePanningSlider();
	WIKIVIZ.buildMonths();
}

// (Re-)calculate time offset data for each datum
WIKIVIZ.genTimeOffsets = function(data)
{
	var lastDate;
	var lastOff = 0;
	var first = true;
	
	$.each(data.revisions, function(i, rev) {
		var curDate = rev.date;
		if (first) lastDate = curDate;
		
		var x = WIKIVIZ.timeMultiplier * Math.max((curDate-lastDate)/1e8, 0);
		
		lastOff += x;
		rev.dateOffset = lastOff;
		lastOff += WIKIVIZ.calcBarWidth();
		
		lastDate = curDate;
		
		if (first) first = false;
	});
}

WIKIVIZ.getRevisionGroup = function(data, rev)
{
	var users = data.users;
	
	if (!rev.user in users) return 'Anon';
	
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
}

// Augment (or annotate) revision data with useful log(lev) and weighted classification data.
WIKIVIZ.augment = function(data)
{
	// Useful fumction to check if a string contain a substring.
	function strcontains(needle, haystack) {
		return haystack.indexOf(needle) != -1;
	}
	
	// Loop over each revision, making annotations as necessary.
	$.each(data['revisions'], function(i, rev) {
		// Split up the edit by its classification and the classification weights
		var wclass = {	// Will eventually hold the formatted info for drawing.
			add: 0,
			remove: 0,
			edit: 0,
			reorganize: 0,
			cite: 0,
			vand: 0,
			unvand: 0,
			unsure: 0
		};
		
		if (strcontains('a', rev['class'])) {
			wclass.edit += WIKIVIZ.weights.edit;
		}
		if (strcontains('b', rev['class'])) {
			wclass.add += WIKIVIZ.weights.add;
		}
		if (strcontains('c', rev['class'])) {
			wclass.remove += WIKIVIZ.weights.remove;
		}
		if (strcontains('d', rev['class'])) {
			wclass.reorganize += WIKIVIZ.weights.reorganize;
		}
		if (strcontains('e', rev['class'])) {
			wclass.cite += WIKIVIZ.weights.cite;
		}
		if (strcontains('f', rev['class'])) {
			wclass.vand += WIKIVIZ.weights.vand;
		}
		if (strcontains('g', rev['class'])) {
			wclass.unvand += WIKIVIZ.weights.unvand;
		}
		
		var wsum = 0;
		for (c in wclass) {
			wsum += wclass[c];
		}
		if (wsum != 0) {
			for (c in wclass) {
				wclass[c] = wclass[c] * Math.log(rev.lev+1) / wsum;
			}
		}
		
		if (wsum === 0) {
			wclass.unsure = Math.log(rev.lev + 1);
		}
		
		rev.wclass = wclass;
		rev.loglev = Math.log(rev.lev + 1);
		rev.date = new Date(rev.timestamp);
		
		// Add the time-dependent user-class classification
		rev.group = WIKIVIZ.getRevisionGroup(data, rev);
	});
	WIKIVIZ.genTimeOffsets(data);
};

WIKIVIZ.toClassString = function(rc)
{
	return rc.split(';').map(function(c) { return ({
			'a': 'edit',
			'b': 'add',
			'c': 'remove',
			'd': 'reorganize',
			'e': 'cite',
			'f': 'vandalize',
			'g': 'unvandalize'
		})[c]; }).join(', ');
};

// Load data corresponding to the article art_title via. JSON
WIKIVIZ.load = function(art_title) {
	// Download revision and user data
	$.getJSON("dbquery.php?", {
		lower: 0,
		upper: 10000,
		article: art_title
	}, function(data) {	// Function which updates the UI when async. response is received.
		WIKIVIZ.augment(data);	// Augment data with log of lev. distance and weighted classification for display purposes.
		WIKIVIZ.data = data;
		
		// Populate user list in the 'select users' dialog.
		var userMap = {};
		var revdata = data['revisions'];
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
		
		// Use D3 to populate the select element in the select users dialog with option elements
		d3.select('#userselect').selectAll('option').data(users).enter().append('option').attr('value', function(d) { return d[0]; }).text(function(d) {
			var percent = d[1]*100;
			return d[0] + " (" + percent.toFixed(2).toString() + "%)";
		});
		// Clicking on one of the option elements should deselect all checkboxes
		$('#userselect option').click(function() {
			$('input[name=userclassselect]').each(function() {
				$(this).attr('checked', false);
			});
		});
		
		// Use d3 to populate the "Content Details" dialog
		var dtable = d3.select('#diag_data').append('table').attr('class', 'sortable');
		dtable.append('thead').append('tr').selectAll('th').data([	// Need to specify CSS classes for sorttable
			['User', 'sorttable_alpha'],
			['Revision Date', 'sorttable_alpha'],
			['Revision Size', 'sorttable_numeric'],
			['Edit Categories', 'sorttable_alpha'],
			['Comment', 'sorttable_alpha']])
			.enter().append('th').text(function (d) { return d[0]; }).attr('class', function (d) { return d[1]; });
		var rows = dtable.append('tbody').selectAll('tr.data').data(data['revisions']).enter().append('tr').attr('class', 'data');
		rows.append('td').text(function (d) { return d.user; });
		rows.append('td').text(function (d) { return WIKIVIZ.formatDate(new Date(d.timestamp)); })
			.attr('sorttable_customkey', function(d) { return WIKIVIZ.getDateSortKey(new Date(d.timestamp)); });
		rows.append('td').text(function (d) { return d.loglev.toFixed(2); });
		rows.append('td').text(function (d) { return WIKIVIZ.toClassString(d.class); });
		rows.append('td').text(function (d) { return d.comment; });
		
		// Get the sorttable library to make this table sortable!
		sorttable.makeSortable($('#diag_data table.sortable').get(0));
		
		// Init the visualization
		WIKIVIZ.initViz();
		
		// Bind panning slider
		WIKIVIZ.bindPanningSlider();
		
		// Bind horizontal zoom slider
		WIKIVIZ.bindHZoomSlider();
		
		// Update the panning slider
		WIKIVIZ.updatePanningSlider(WIKIVIZ.numBars);
		
		// Init the timeX scale with the min and max dates
		var minDate = WIKIVIZ.data.revisions[0].date;
		WIKIVIZ.view.timeX.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
					   WIKIVIZ.data.revisions[WIKIVIZ.data.revisions.length - 1].date]);
		
		// Apply default range to scale
		WIKIVIZ.view.timeX.range([0, 5000]);
		
		// Remove "loading" message
		$('#view #view_loading').remove();
	});
};

// Init visualization with a given article.
WIKIVIZ.init = function(art_title) {
	// Create UI components
	WIKIVIZ.createToolbar();
	WIKIVIZ.createSliders();
	WIKIVIZ.createZoom();
	WIKIVIZ.createDialogs();
	
	$('#viewtabs').tabs();
	
	$('#hzoom_slider_wrapper').mouseenter(function() {
		$(this).css('opacity', 1);
	}).mouseleave(function() {
		$(this).css('opacity', 0.8);
	});
	
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
	
	// TODO: Move this code to an appropriate place
	
	$('#toAdj').button();
	$('#toTime').button();
	
	$('#toAdj').click(function() { WIKIVIZ.toAdjacentSpaced(); });
	$('#toTime').click(function() { WIKIVIZ.toTimeSpaced(); });
};

// Return absolute max (discarding sign) of func(arr[i])
WIKIVIZ.absMax = function(arr, func)
{
	if (!(arr instanceof Array) || (arr.length < 1)) return undefined;
	var max = func(arr[0]);
	for (var i = 1; i < arr.length; ++i) {
		max = Math.max(max, Math.abs(func(arr[i])));
	}
	return max;
};

// Calculate bar width based on number of bars per screen
WIKIVIZ.calcBarWidth = function()
{
	var w = (WIKIVIZ.width - WIKIVIZ.maskWidth)/(WIKIVIZ.numBars);
	if (WIKIVIZ.isTimeSpaced) { w = Math.min(w, 7); }
	return w;
};

// Initialize the visualization. Create SVG and elements correspondng to data.
WIKIVIZ.initViz = function()
{
	
	// Brevity
	var maskWidth = WIKIVIZ.maskWidth;	// Width of mask over which y label is written
	
	WIKIVIZ.view.svg = d3.select('#view').append('svg').attr('width', WIKIVIZ.width).attr('height', WIKIVIZ.height);
	
	// Re-arrange coordinate system by setting x=0 to the center of the SVG and flipping the y-axis values.
	// Also, set y=0 offset by maskWidth to the left to simplify math regarding the position of the y-axis title and masking rect.
	WIKIVIZ.view.sview = WIKIVIZ.view.svg.append('g').attr('width', WIKIVIZ.width).attr('transform', 'translate(' + (maskWidth) + ',' + (WIKIVIZ.height/2 - 0.5) + ')scale(1,-1)');
	
	// Init the x and y scale objects.
	WIKIVIZ.view.x = d3.scale.linear();
	WIKIVIZ.view.y = d3.scale.linear();
	
	// Must take into account the mask width here!
	var barWidth = WIKIVIZ.calcBarWidth();
	
	var view = WIKIVIZ.view;
	
	// Set up x and y ranges for the visualization. The x-range is designed so that x(n) gives the x-position of the nth bar's left edge.
	view.x.range([0, barWidth]);
	view.y.range([0, WIKIVIZ.height/2 - 20]);	// Leave a little bit of room.
	view.y.domain([0, WIKIVIZ.absMax(WIKIVIZ.data['revisions'], function(elem) { return elem.loglev; })]);	// Y domain determined using largest magnitude y-value
	
	// Group to contain horizontal rules for the visualization
	view.rules = view.sview.append('g').attr('class', 'rules');
	
	// Positive and negative horizontal rules groups.
	var posrules = view.rules.append('g').attr('class', 'posrules');
	var negrules = view.rules.append('g').attr('class', 'negrules');
	
	// Generate actual rules
	posrules.selectAll('g.rule').data(view.y.ticks(10)).enter().append('g').attr('class', 'rule').attr('transform', function(d) { return 'translate(0,' + view.y(d) + ')'; });
	negrules.selectAll('g.rule').data(view.y.ticks(10)).enter().append('g').attr('class', 'rule').attr('transform', function(d) { return 'translate(0,' + (-view.y(d)) + ')'; });
	
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
	ylabel.append('text').attr('transform', 'translate(' + -(maskWidth-25) + ', 0)rotate(90, 0, 0)scale(1, -1)').text('Revision Size');
	
	// Set up layers for the body
	body.append('g').attr('class', 'bg');
	body.append('g').attr('class', 'mid');
	body.append('g').attr('class', 'fg');
	
	WIKIVIZ.view.data = body.select('g.mid').append('g').attr('class', 'data');
	var data = WIKIVIZ.view.data;
	
	var datum = data.selectAll('.datum').data(WIKIVIZ.data['revisions']).enter().append('g').attr('class', 'datum').attr('transform', function(d) { return 'translate(' + view.x(WIKIVIZ.index(d)) + ', 0)'; }).attr('opacity', 1);
	datum.append('title').text(function(d) {
		return d.user + '\n' + WIKIVIZ.formatDate(new Date(d.timestamp)) + '\n' + 'Edit Categories: ' + WIKIVIZ.toClassString(d.class) + '\n' + 'Revision Size: ' + d.loglev.toFixed(2);
	});
	var bars = datum.append('g').attr('class', 'bars');
	WIKIVIZ.buildBars(bars, barWidth);
	datum.append('text').attr('class', 'xlabel').text(function(d) { return WIKIVIZ.index(d); })
		.attr('transform', function() { return 'translate(0,' + String(-7) + ')scale(1,-1)rotate(45,0,0)'; });
	WIKIVIZ.buildMonths();
};

// Get index of element in revision data, or -1 if it doesn't exist
WIKIVIZ.index = function(d) { return jQuery.inArray(d, WIKIVIZ.data.revisions); }

// Function to map revision data to rectangle groups that represent the data as a stacked bar graph.
WIKIVIZ.buildBars = function(barsGroup, barWidth)
{
	var posFields = ['add', 'unsure', 'reorganize', 'edit', 'cite', 'vand'];
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
	var mts_t = mts.transition().duration(1000);
	mts_t.attr('transform', function(d) { return 'translate(' + d.l + ',0)'; });
	mts_t.select('rect').attr('width', function(d) { return (d.r-d.l); });;
	mts.select('text.mtext').text(function(d) { return months[d.m]; });
	mts.select('text.ytext').text(function(d) { return String(d.y); });
	mts_t.select('rect').attr('class', function(d, i) { return (i%2 === 0)?('m_odd'):('m_even');});
	mts.select('text.mtext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).transition().duration(500).attr('opacity', 0);
	mts.select('text.mtext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) >= blankThreshold;}).transition().duration(500).attr('opacity', 1);
	mts.select('text.ytext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) < blankThreshold;}).transition().duration(500).attr('opacity', 0);
	mts.select('text.ytext').filter(function(d) { return ((d.r-d.l) - this.getComputedTextLength()) >= blankThreshold;}).transition().duration(500).attr('opacity', 1);
	
	var mts_x = mts.exit().transition().duration(1000);
	mts_x.attr('opacity', 0).remove();
}

WIKIVIZ.clearMonths = function() {
	WIKIVIZ.view.body.select('.bg').selectAll('.month').data([]).exit().remove();
}

WIKIVIZ.setNumBars = function(numBars)
{
	if (numBars <= 0) return;	// Don't act on invalid values!
	WIKIVIZ.numBars = numBars;
	
	WIKIVIZ.view.x.range([0, WIKIVIZ.calcBarWidth()]);
	
	if (!WIKIVIZ.isTimeSpaced)
		WIKIVIZ.view.data.selectAll('.datum').transition().duration(1000)
			.attr('transform', function(d) { return 'translate(' + WIKIVIZ.view.x(WIKIVIZ.index(d)) + ', 0)'; });
	
	WIKIVIZ.view.data.selectAll('.datum').transition().duration(1000).selectAll('.bars rect').attr('width', WIKIVIZ.calcBarWidth());
	// Hide x labels that would overlap!
	WIKIVIZ.view.data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width <= WIKIVIZ.calcBarWidth(); })
		.transition().duration(500).attr('opacity', 1);
	WIKIVIZ.view.data.selectAll('.datum').select('.xlabel').filter(function(d) { return this.getBBox().width > WIKIVIZ.calcBarWidth(); })
		.transition().duration(500).attr('opacity', 0);
	
	WIKIVIZ.buildMonths();
	
	WIKIVIZ.updatePanningSlider();
	
	// Need to add functionality to update month view once finished!
};

WIKIVIZ.createToolbar = function() {
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
	$('#t_select').button({
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
	$('#t_data').button({
		icons: {
			primary: 'icon-table'
		},
		text: false
	});
	$('#t_legend').button({
		icons: {
			primary: 'icon-categories'
		},
		text: false
	});
	$('#t_deselect').button({
		icons: {
			primary: 'icon-deselect'
		},
		text: false,
		disabled: true
	});
	$('#t_deselect').click(function() { WIKIVIZ.clearAllSelections(true); });
	
	$('#t_talk').button({
		icons: {
			primary: 'icon-talk'
		},
		text: false
	});
};

WIKIVIZ.createSliders = function() {
	$('#pan').slider({
		min: 0,
		max: 10,
		range: 'min',
		animate: true
	});
	$('#hzoom_slider').slider({
		min: 20,
		max: 300,
		value: 320-WIKIVIZ.numBars,
		animate: true
	});
};

// Create y-zoom control and generate callbacks.
// Clicking on the i-th circle sets WIKIVIZ.z_level to i.
WIKIVIZ.createZoom = function() {
	/*$('#zoom').buttonsetv();
	var zUpdateFunc = function (i) {
		return function() {WIKIVIZ.z_level = parseInt(i);};
	};
	$('[for=zoom0]').click(zUpdateFunc(0));
	$('[for=zoom1]').click(zUpdateFunc(1));
	$('[for=zoom2]').click(zUpdateFunc(2));
	// Set default state
	$('[for=zoom1]').click();*/
};

WIKIVIZ.createDialogs = function() {
	$('#diag_cursor').dialog({
		autoOpen: false,
		title: 'Cursor Type',
		width: 'auto',
		resizable: false
	});
	
	$('#diag_options').dialog({
		autoOpen: false,
		title: 'Options',
		resizable: false
	});
	
	$('#diag_select').dialog({
		autoOpen: false,
		title: 'Select Users',
		width: 400,
		resizable: false
	});
	$('#select_apply').button();
	$('#d_select_tabs').tabs();
	
	$('#diag_info').dialog({
		autoOpen: false,
		title: 'Selection Information',
		resizable: false,
		width: 400
	});
	
	$('#diag_data').dialog({
		autoOpen: false,
		title: 'Content Details',
		resizable: true,
		width: 800,
		height: 600
	});
	
	$('#diag_legend').dialog({
		autoOpen: false,
		title: 'Revision Categories',
		resizable: false,
		height: 'auto',
		width: 400
	});
	$('#d_legend_accordion').accordion({
		collapsible: true,
		active: false,
		autoHeight: false,
		clearStyle: true
	});
	// Allow checkbox to capture click events (otherwise the accordion will do so)
	$('#d_legend_accordion h3').each(function (i, el) {
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
	
	$('#d_legend_accordion h3').each(function (i, el) {
		$(el).find('input').change(function(e) {
			if ($(this).attr('checked')) {	// If the event is the checking of a checkbox
				for (var i in classMap[$(this).val()]) {
					WIKIVIZ.view.data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 1);
				}
			} else {	// Checkbox was unchecked
				for (var i in classMap[$(this).val()]) {
					WIKIVIZ.view.data.selectAll('rect.' + classMap[$(this).val()][i]).transition().duration(500).attr('opacity', 0.2);
				}
			}
			$('#t_deselect').button('enable');
		});
	});
	
	$('#d_select_groups_accordion').accordion({
		collapsible: true,
		active: false,
		autoHeight: false,
		clearStyle: true
	});
	
	// Allow checkbox to capture click events (otherwise the accordion will do so)
	$('#d_select_groups_accordion h3').each(function (i, el) {
		$(el).find('input').click(function(e) {
			e.stopPropagation();
		});
	});
	
	$('#d_select_groups_accordion h3').each(function (i, el) {
		$(el).find('input').change(function(e) {
			var that = $(this);
			if ($(this).attr('checked')) {	// If the event is the checking of a checkbox
				
				WIKIVIZ.view.data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 1);
			} else {	// Checkbox was unchecked
				WIKIVIZ.view.data.selectAll('.datum').filter(function(d) { return d.group == that.val(); }).transition().duration(500).attr('opacity', 0.2);
			}
			$('#t_deselect').button('enable');
		});
	});
	
	$('#diag_talk').dialog({
		autoOpen: false,
		title: 'Talk Page Categories',
		resizable: false,
		height: 'auto',
		width: 400
	});
	$('#d_talk_accordion').accordion({
		collapsible: true,
		active: false,
		autoHeight: false,
		clearStyle: true
	});
};

WIKIVIZ.bindToolbar = function() {
	$('#t_cursor').click(function() {
		$('#diag_cursor').dialog('open');
	});
	$('#t_options').click(function() {
		$('#diag_options').dialog('open');
	});
	$('#t_select').click(function() {
		$('#diag_select').dialog('open');
	});
	$('#t_info').click(function() {
		$('#diag_info').dialog('open');
	});
	$('#t_data').click(function() {
		$('#diag_data').dialog('open');
	});
	$('#t_legend').click(function() {
		$('#diag_legend').dialog('open');
	});
	$('#t_talk').click(function() {
		$('#diag_talk').dialog('open');
	});
};

WIKIVIZ.bindDialogs = function() {
	// Bind functionality to the select users dialog
	// Note that the "Select By Group" checkboxes make changes to the selection
	// in the Select By User list, so we really only need to grab the input from the select
	// by user list.
	$('input[name=userclassselect]').each(function (i,e) {
		$(e).change(function () {
			// Gather choices
			var filt = Array();
			$('input[name=userclassselect]:checked').each(function(i, el) {
				filt.push($(el).val())
			});
			// Use choices to generate selection in Select By User
			// User names are stored in the "value" property of the options in the select element.
			$('#userselect option').each(function(i, e) {
				if (WIKIVIZ.isSubset([WIKIVIZ.getGroupsByName($(e).val())], filt)) {
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
	$('#select_apply').click(function() {
		var users = Array();
		$('#userselect option:selected').each(function() { users.push($(this).val()); });
		WIKIVIZ.applyUserSelection(users);
	});
};

// Update panning slider range with new barWidth value
WIKIVIZ.updatePanningSlider = function()
{
	$('#pan').slider('option', 'max', WIKIVIZ.calcBarWidth()*WIKIVIZ.data.revisions.length);
};

// Bind panning functionality to the panning slider
WIKIVIZ.bindPanningSlider = function()
{
	$('#pan').bind('slide', function(event, ui) {
		WIKIVIZ.view.sview.select('.body').attr('transform', 'translate(' + (-ui.value) + ',0)');
	});
};

WIKIVIZ.bindHZoomSlider = function()
{
	$('#hzoom_slider').bind('slidestop', function(event, ui) {
		WIKIVIZ.setNumBars(320-ui.value);
		if (WIKIVIZ.isTimeSpaced) {
			WIKIVIZ.view.timeX.range([0, 50*(ui.value)]);
			WIKIVIZ.genTimeOffsets(WIKIVIZ.data);
			WIKIVIZ.toTimeSpaced();
		} else {
			WIKIVIZ.toAdjacentSpaced();
		}
	});
}

$(document).ready(function() {
	// Quick 'N dirty way to allow user to select which article to view.
	$('body').append($('<div>').attr('id', 'diag_article'));
	$('#diag_article').append($('<h3>').text('Enter article title below:'));
	$('#diag_article').append($('<input>').attr('id', 'd_article_title'));
	$('#diag_article input').val('Lagrangian_mechanics');
	$('#diag_article').append($('<button>').attr('id', 'd_article_enter').text('Enter'));
	$('#diag_article').dialog({
		resizable: false,
		width: 'auto',
		height: 'auto',
		minHeight: 0,
		autoOpen: true,
		title: 'Enter Article'
	});
	$('#d_article_enter').click(function() {
		$('#page_title').text($('#d_article_title').val());
		WIKIVIZ.init($('#d_article_title').val());
		$('#everything').fadeIn("slow");
		$('#diag_article').dialog('close');
	});
});
