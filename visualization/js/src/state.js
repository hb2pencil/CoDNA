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
