//     CoDNA 0.1.0
//     (c) 2013 Henry Brausen, David Turner
//     https://github.com/hb2pencil/CoDNA
//     Released under GPLv2 License

(function(window, document, undefined){

// WIKIVIZ main object
// Here we define some useful constants that are used throughout the application.
WIKIVIZ = {
	width: 910,	// Width and height of view area
	height: 500,
	numBars: 60,	// Default number of bars / screen to display in adjacent spacing mode
	maskWidth: 50,	// Width of the mask for the y-axis labels
	timeMultiplier: 1,	// UNUSED: Used to be used for generating "time offset" calues in data annotation.
	weights: {	// The weights for computing the weighted-splitting of visualization bars.
		add: 60,
		remove: 60,
		edit: 20,
		reorganize: 40,
		vand: 10,
		unvand: 10,
		cite: 20,
		unclassified: 60
	},
	view: {	// View object is populated with more rendering-oriented variables.
		timeX: d3.time.scale(),	// The time scale object for the TS X-axis
		mode: 'art'	// Current viewing mode (article revision view by default)
	}
};

// Get a list of the user's groups ('higher-level groups') at the present time.
// So far, this will always return one group, but we can expand on this later.
WIKIVIZ.getGroupsByName = function(username) {
	if (!WIKIVIZ.data.users.hasOwnProperty(username)) return ['None'];	// If we don't have data for this user (for whatever reason), assume no groups.
	if (!WIKIVIZ.data.users[username].history[WIKIVIZ.data.users[username].history.length-1]) return ['None'];
	return WIKIVIZ.data.users[username].history[WIKIVIZ.data.users[username].history.length-1].userclass;
};

// Get index of element in revision data, or -1 if it doesn't exist
WIKIVIZ.index = function(d) { return d.id; }

// Get index of element in talk page data, or -1 if it doesn't exist
WIKIVIZ.tIndex = function(d) { return d.id; }

// Determine the higher-level group that a given article-revision belongs to.
WIKIVIZ.getRevisionGroup = function(data, rev)
{
	// First, grab a list of our users.
	var users = data.users;
	
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
}

// Augment (or annotate) data with useful log(lev) and weighted classification data.
// In short, this function generates and attaches additional descriptive data to the data downloaded from the DB.
WIKIVIZ.augment = function(data)
{
	// Useful function to check if a string contain a substring.
	function strcontains(needle, haystack) {
		return haystack.indexOf(needle) != -1;
	}
	
	$.each(data.talk, function(i, te) {
		te.date = new Date(te.timestamp);
		te.loglev = Math.log(te.lev + 1);
		te.user = te.contributor;
		te.type = 'talk';
		te.id = i;
		te.group = WIKIVIZ.getRevisionGroup(data, te);
	});
	
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
			unsure: 0,
			unclassified: 0
		};
		
		// Perform a weighted-separation of our article revision edit distance.
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
		if (strcontains('x', rev['class'])) {
			wclass.unclassified += WIKIVIZ.weights.unclassified;
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
		rev.group = WIKIVIZ.getRevisionGroup(data, rev);
		
		rev.type='art';
		
		rev.id = i;
	});
};

// Load data corresponding to the article art_title via. JSON
// Data is pulled from a DB (from dbquery.php)
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
		
		// Use d3 to populate the select element in the select users dialog with option elements
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
		var revs = WIKIVIZ.data.revisions;
		var tlk = WIKIVIZ.data.talk;
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
		rows.append('td').text(function (d) { return WIKIVIZ.formatDate(d.date); })
			.attr('sorttable_customkey', function(d) { return WIKIVIZ.getDateSortKey(d.date); });
		rows.append('td').text(function (d) { return d.lev; });
		rows.append('td').text(function (d) {
			if (d.type === 'art') {
				return WIKIVIZ.toClassString(d.class);
			} else if (d.type === 'talk') {
				return WIKIVIZ.toTalkClassString(d);
			} else {
				return 'Undefined';
			}
		});
		rows.attr('class', function (d) {
			if (d.type === 'talk') return 'data talkrow';
			else return 'data defaultrow';
		});
		
		// Get the sorttable library to make this table sortable!
		sorttable.makeSortable($('#diag_data table.sortable').get(0));
		
		// In our default mode hide the talk page entries
		$('.talkrow').addClass('invisible');
		
		// Init the visualization
		WIKIVIZ.initViz();
		
		// Init the timeX scale with the min and max dates
		var minDate = WIKIVIZ.data.revisions[0].date;
		WIKIVIZ.view.timeX.domain([new Date(minDate.getFullYear(), minDate.getMonth()),
					   WIKIVIZ.data.revisions[WIKIVIZ.data.revisions.length - 1].date]);
		
		// Apply default range to scale
		WIKIVIZ.view.timeX.range([0, 5000]);
		
		// Remove "loading" message
		$('#view #view_loading').remove();
		
		// Init the navigation control
		WIKIVIZ.navctl.init(920, 30);
	});
};

// Highlight those entries that were made by users in userlist.
// TODO: Apply selections to the scroll bar area and to the talk page contributions!
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
		if (jQuery.inArray($(elem).children(':eq(2)').text(), userlist) != -1) {
			$(elem).addClass('rowselect');
		}
	});
	
	// Apply selection to the main article contribution view
	WIKIVIZ.view.data.selectAll('.datum').filter(function (d) { return jQuery.inArray(d.user, userlist) === -1; }).selectAll('.bars rect').transition().duration(500).attr('opacity', 0.2);
	
	// Apply selection to nav "spikes"
	WIKIVIZ.navctl.spikes.filter(function(d) { return jQuery.inArray(d.user, userlist) === -1; }).transition().duration(500).attr('opacity', 0.4);
	
	return;
};

// Update the info box using an object composed of prop=>val pairs.
// UNUSED for now, but may be able to be adapted into something later.
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

// Init the buttons on the toolbar.
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
		text: false,
		disabled: true
	});
};

// Init modal dialogs.
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
		title: 'Contributors',
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
		title: 'Article Revision Details',
		resizable: true,
		width: 800,
		height: 600
	});
	
	$('#diag_legend').dialog({
		autoOpen: false,
		title: 'Article Revision Categories',
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
	$('.d_checkable h3').each(function (i, el) {
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
			
			var selected = new Array();
			$('#d_legend_accordion input:checked').each(function(i, v) {
			    $.merge(selected, classMap[$(v).val()]);
			});
			
			WIKIVIZ.navctl.bg.selectAll('rect').transition().duration(500).attr('opacity',
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
			
			
			$('#t_deselect').button('enable');
		});
	});
	
	// Talk page revision selection functionality.
	// TODO: Make the "callouts" fade out if all of the contained elements are faded out.
	$('#d_talk_accordion h3').each(function (i, el) {
		$(el).find('input').change(function(e) {
			var that = $(this);
			if ($(this).attr('checked')) {	// If the event is the checking of a checkbox
				
				d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 1);
			} else {	// Checkbox was unchecked
				d3.selectAll('.tdatum .'+that.val()).transition().duration(500).attr('opacity', 0.2);
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
	
	// User group selection functionality.
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
		title: 'Talk Page Revision Categories',
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

// Bind the buttons to their respective actions.
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
	WIKIVIZ.view.sview = WIKIVIZ.view.svg.append('g').attr('width', WIKIVIZ.width).attr('transform', 'translate(' + (maskWidth) + ',' + (WIKIVIZ.height/2) + ')scale(1,-1)');
	
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

$(document).ready(function() {
	
});

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

// ## ArticleView
ArticleView = Backbone.View.extend({
    
    template: _.template($("#main_container_template").html()),
    firstRender: true,
    
    initialize: function(){
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
    },
    
    render: function(){
        if(topTabs.getSelected() != null && topTabs.getSelected().get('mainView') == this){
            this.$el.css('display', 'block');
        }
        else{
            this.$el.css('display', 'none');
        }
        if(this.firstRender){
            this.$el.html(this.template());
            WIKIVIZ.init(this.model.get('title'));
        }
        this.firstRender = false;
        return this.$el;
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
        topTabs.getSelected().set('title', title);
        topTabs.getSelected().set('mainView', articleView);
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
        this.model.each(function(tab, index){
            tab.set('x', startX, {silent: true});
            startX += this.$("#tab_" + tab.cid).outerWidth() + TopTabsView.spacing;
            this.views[index].render();
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
                        tab.set('x', parseInt(tabView.$el.css('left')));
                        this.order();
                    }, this),
                    stop: $.proxy(function(){
                        tabView.$el.css('z-index', 0);
                        this.order();
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
        "click .x": "close",
        "click": "click"
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
            if(topTabs.last() != null && topTabs.last().get('type') != 'new'){
                topTabs.last().set('selected', true);
            }
        }, this));
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.addClass("tab");
        this.$el.stop();
        this.$el.css('left', this.model.get('x'));
        this.$el.attr('id', "tab_" + this.model.cid);
        if(this.model.get('selected')){
            this.$el.addClass('selected');
        }
        else{
            this.$el.removeClass('selected');
        }
        return this.$el;
    }

});

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

// Takes in a javascript date object and pretty-prints it to a string which is returned.
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

// Build a sorting key for the sorttable library to sort the date field used in the table view.
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

// Generate a string describing a given article revisions' edit categories
WIKIVIZ.toClassString = function(rc)
{
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
WIKIVIZ.toTalkClassString = function(d) {
	var ret = "";
	if (d.att) ret += "attitude, ";
	if (d.crit) ret += "criticism, ";
	if (d.inf) ret += "informative, ";
	if (d.perf) ret += "performative, ";
	return ret.substring(0,ret.length-2);
}

// Return absolute max (disregarding sign) of func(arr[i])
WIKIVIZ.absMax = function(arr, func)
{
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