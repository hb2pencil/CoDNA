/**
 * @author Henry Brausen
 */

// TODO:
// Download article revision data
// For each revision entry, add properties for stacked formatting
//   i.e. do fraction of weighted average and store under add, delete, .etc
// Now, we move on to d3:
//   Create new SVG in the proper location on the page
//

var weights = {
	add: 60,
	remove: 60,
	edit: 20,
	reorganize: 40,
	vand: 10,
	unvand: 10,
	cite: 20
};

var revdata = Array();

var width = 950;
var height = 600;

var defaultYDomain = 12;

var x = d3.scale.linear();
var y = d3.scale.linear();

var nBars = 20;
var padding = 2;
var theArticle = "Lagrangian Mechanics";

var sview;
var yposlabelgroup;
var yneglabelgroup;
var rulegroup;
var panslide;
var widthslide;
var zoomslide;

function strcontains(needle, haystack) {
	return haystack.indexOf(needle) != -1;
}

function buildMonths() {
	var barWidth = (width-50) / (nBars);
	sview.select('.body').select('.months').selectAll('.month').data([]).exit().remove();
	data = [];
	months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var lastDate = new Date(revdata[0].timestamp);
	var curDate;
	var lastIndex = 0;
	for (var i = 1; i < revdata.length; ++i) {
		// We need to build width and offset positions for the various month groups
		// We do this by scanning through our bar graph data and appending to the month data as we go.
		curDate = new Date(revdata[i].timestamp);
		if (curDate.getMonth() !== lastDate.getMonth() || curDate.getYear() !== lastDate.getYear()) {
			var left = lastIndex * barWidth + 50;
			var right = (i-1) * barWidth + 50;
			if (left === right) continue;
			data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
			lastDate = curDate;
			lastIndex = i-1;
		}
	}
	
	var left = lastIndex * barWidth + 50;
	var right = (revdata.length) * barWidth + 50;
	data.push({l: left, r:right, m:lastDate.getMonth(), y:lastDate.getFullYear()});
	
	var mts = sview.select('.body').select('.months').selectAll('.month').data(data).enter()
		.append('g').attr('class', 'month').attr('transform', function(d) { return 'translate(' + d.l + ',0)'; });
	mts.append('rect').attr('height', String(height*(2/3))).attr('width', function(d) { return (d.r-d.l); }).attr('class', function(d, i) { return (i%2 === 0)?('m_odd'):('m_even');});
	mts.append('text').text(function(d) { return months[d.m]; }).attr('transform', function(d) { return 'translate(10,' + (2*height/3 - 20) + ')scale(1,-1)';}).attr('opacity', 1);
	mts.append('text').text(function(d) { return String(d.y); }).attr('transform', function(d) { return 'translate(10,' + (2*height/3 - 40) + ')scale(1,-1)';}).attr('opacity', 1);
}

function buildTableview()
{
	// Build tableview
	var tbl = d3.select("#tableview").append("table");
	var thead = tbl.append('tr');
	thead.append('th').text('User');
	thead.append('th').text('Timestamp');
	thead.append('th').text('Comment');
	thead.append('th').text('Levenshtein');
	thead.append('th').text('Class');
	
	var trs = tbl.selectAll(".datarow").data(revdata).enter().append('tr');
	trs.append('td').text(function (d) { return d.user; }).attr("class", "datarow");
	trs.append('td').text(function (d) { return d.timestamp; }).attr("class", "datarow");
	trs.append('td').text(function (d) { return d.comment; }).attr("class", "datarow");
	trs.append('td').text(function (d) { return d.lev; }).attr("class", "datarow");
	trs.append('td').text(function (d) { return d.class; }).attr("class", "datarow");
}

function initStackview() {
	
	// Create SVG with origin at bottom left!
	sview = d3.select("#stackview").append('svg')
		.attr("width", width)
		.attr("height", height)
		.append('g').attr('width', width).attr('transform', 'translate(' + 0 + "," + (height*(2.0/3)) + ')scale(1, -1)');
	
	x.domain([0, 1]);
	
	var barWidth = (width-50) / (nBars);	// Subtract 50 from width for mask
	panslide.slider("option", "max", barWidth*(revdata.length));
	panslide.slider("value", panslide.slider("value"));
	
	x.range([0, barWidth]);
	y.range([0, (height*2/3)]);
	y.domain([0, defaultYDomain]);	// Y domain based on log(lev distance)
	
	
	// Add a group for rules (marker lines parallel to y axis)
	negrulegroup = sview.append('g');
	
	rules = negrulegroup.selectAll(".rule").data(y.ticks(10).map(function (i) { return -i; }))
		.enter().append("g").attr("class", "rule")
		.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
	
	rules.append('line').attr('x2', width);
	
	posrulegroup = sview.append('g');
	
	rules = posrulegroup.selectAll(".rule").data(y.ticks(10)).enter().append("g").attr("class", "rule")
		.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
	
	rules.append('line').attr('x2', width);
	
	var body = sview.append('g').attr('transform', 'translate(0,0)')
	.attr("class", "body");	// The body will slide along
	
	body.append('g').attr('class', 'months');
	
	//var title = sview.append('text').attr('class', 'article').attr('transform', 'translate(0,' + 150 + ')scale(1,-1)')
	//	.text(revdata.length > 0 ? revdata[0].page_title : 'No Title Specified');
	
	
	
	// Add a white masking rectangle.
	
	sview.append("rect").attr('width', 50).attr('height', height).attr('y', (-height/3)).style('fill', "#fff");
	
	// Add y-axis title
	
	sview.append("text").attr('transform', 'translate(20,0)rotate(90, 0, 0)scale(1,-1)').attr('class', 'ytitle').text('Log. of Edit Magnitude');
	
	// Add y-axis labels
	
	yposlabelgroup = sview.append('g');
	ylabels = yposlabelgroup.selectAll(".ylabel").data(y.ticks(10)).enter().append("g").attr("class", "ylabel")
		.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
	ylabels.append('text').attr('dy', '.35em').attr('x', function (d) { return 50 - this.getComputedTextLength() - 10; }).attr('transform', 'scale(1,-1)')
		.attr('text-anchor', 'end').text(String);
	
	yneglabelgroup = sview.append('g');
	ylabels = yneglabelgroup.selectAll(".ylabel").data(y.ticks(10).map(function (i) { return -i; })).enter()
		.append("g").attr("class", "ylabel")
		.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
	ylabels.append('text').attr('dy', '.35em').attr('x', function (d) { return 50 - this.getComputedTextLength() - 10; }).attr('transform', 'scale(1,-1)')
		.attr('text-anchor', 'end').text(String);
	
	// Add placeholder rects
	var datagroup = body.append('g').attr('class', 'data');
	var edata = datagroup.selectAll('g').data(revdata).enter();
	//edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
	//	.attr('y', 0).attr('width', barWidth)
	//	.attr('height', function (d, i) { return y(d.lev);})
	//	.attr('class', 'placeholder');
	
	// The "ADD" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', 0).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.add);})
		.attr('class', 'add').attr('desc', function(d, i) { return i }).attr('opacity', 1);
		
	// The "UNSURE" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', 0).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.unsure);})
		.attr('class', 'unsure').attr('desc', function(d, i) { return i }).attr('opacity', 1);
	
	
	// The "REORGANIZE" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', function (d, i) { return y(d.wclass.add);}).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.reorganize);})
		.attr('class', 'reorganize').attr('desc', function(d, i) { return i }).attr('opacity', 1);
	
	// The "EDIT" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', function (d, i) { return y(d.wclass.add+d.wclass.reorganize);}).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.edit);})
		.attr('class', 'edit').attr('desc', function(d, i) { return i }).attr('opacity', 1);
	
	// The "CITE" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', function (d, i) { return y(d.wclass.edit+d.wclass.reorganize+d.wclass.add); }).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.cite);})
		.attr('class', 'cite').attr('desc', function(d, i) { return i }).attr('opacity', 1);
	
	// The "Vandalize" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', function (d, i) { return y(d.wclass.cite+d.wclass.edit+d.wclass.reorganize+d.wclass.add); }).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.vand);})
		.attr('class', 'vand').attr('desc', function(d, i) { return i }).attr('opacity', 1);
	
	// The "unvandalize" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', function (d, i) { return y(-d.wclass.unvand); }).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.unvand);})
		.attr('class', 'unvand').attr('desc', function(d, i) { return i }).attr('opacity', 1);
	
	// The "remove" rects
	edata.append('rect').attr('x', function (d, i) { return 50+x(i); })
		.attr('y', function (d, i) { return y(-(d.wclass.unvand+d.wclass.remove)); }).attr('width', barWidth)
		.attr('height', function (d, i) { return y(d.wclass.remove);})
		.attr('class', 'remove').attr('desc', function(d, i) { return i }).attr('opacity', 1);
	
	
	// Add x-axis labels
	
	var xlabelgroup = body.append('g').attr('class','xlabelgroup');
	xlabelgroup.append('line').attr('x2', width).style('stroke', '#444');
	xlabelgroup.selectAll('.xlabel').data(d3.range(50, barWidth*(revdata.length+1), barWidth)).enter().append('text')
		.text(function (d, i) { return String(i); }).attr('x', function(d) { return String(d); })
		.attr('transform', 'scale(1,-1)').attr('dy', '1em').attr('class', 'xlabel');
	
	buildMonths();
	
}

$(function()
{
	// Create pan slider
	panslide = $("#panslider").slider({
		min: 0,
		max: 940,
		range: "min",
		//start: function(event, ui) {
		//	sview.select('.body').transition().duration(500).attr('transform', 'translate(-' + ui.value + ', 0)');
		//},
		slide: function(event, ui) {
			sview.select('.body').attr('transform', 'translate(-' + ui.value + ', 0)');
		},
		animate: true
	});
	
	// Create width slider
	widthslide = $("#widthslider").slider({
		range: "min",
		min: 5,
		max: 49,
		value: 50-nBars,
		animate: true,
		slide: function(event, ui) {
			nBars = 50-ui.value;
			var barWidth = (width-50) / (nBars);	// Subtract 50 from width for mask
			console.log(barWidth);
			console.log(nBars);
			panslide.slider("option", "max", barWidth*(revdata.length));
			panslide.slider("value", panslide.slider("value"));
			x.range([0, barWidth]);
			var rects = sview.select('.body').selectAll('.data').selectAll('.add');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var rects = sview.select('.body').select('.data').selectAll('.reorganize');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var rects = sview.select('.body').select('.data').selectAll('.edit');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var rects = sview.select('.body').select('.data').selectAll('.cite');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var rects = sview.select('.body').select('.data').selectAll('.vand');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var rects = sview.select('.body').select('.data').selectAll('.unvand');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var rects = sview.select('.body').select('.data').selectAll('.remove');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var rects = sview.select('.body').select('.data').selectAll('.unsure');
			rects.attr('width', barWidth).attr('x', function (d, i) { return 50+x(i); });
			var xlabels = sview.select('.body').select('.xlabelgroup').selectAll('text')
				.data(d3.range(50, barWidth*(revdata.length+1), barWidth)).attr('x', String);
			
			buildMonths();
		}
	});
	
	// Create zoom slider
	zoomslide = $('#zoomslider').slider({
		orientation: 'vertical',
		range: "min",
		min: 1,
		max: 29,
		value: (30-defaultYDomain),
		animate: true,
		slide: function(event, ui) {
			var dur = 1000;
			y.domain([0, 30-ui.value]);	// Y domain based on log(lev distance)
			
			sview.select('.body').selectAll('.data').selectAll('.add')
				.attr('y', 0).attr('height', function (d) { return y(d.wclass.add);});
				
			sview.select('.body').select('.data').selectAll('.unsure')
				.attr('y', 0).attr('height', function (d) { return y(d.wclass.unsure);});
				
			sview.select('.body').select('.data').selectAll('.reorganize')
				.attr('y', function (d) { return y(d.wclass.add);}).attr('height', function (d) { return y(d.wclass.reorganize);});
				
			sview.select('.body').select('.data').selectAll('.edit')
				.attr('y', function (d) { return y(d.wclass.add+d.wclass.reorganize);}).attr('height', function (d) { return y(d.wclass.edit);});
			
			sview.select('.body').select('.data').selectAll('.cite')
				.attr('y', function (d) { return y(d.wclass.add+d.wclass.reorganize+d.wclass.edit);}).attr('height', function (d) { return y(d.wclass.cite);});
			
			sview.select('.body').select('.data').selectAll('.vand')
				.attr('y', function (d) { return y(d.wclass.add+d.wclass.reorganize+d.wclass.edit+d.wclass.cite);}).attr('height', function (d) { return y(d.wclass.vand);});
			
			sview.select('.body').select('.data').selectAll('.unvand')
				.attr('y', function (d) { return y(-d.wclass.unvand); }).attr('height', function (d) { return y(d.wclass.unvand);})
			
			sview.select('.body').select('.data').selectAll('.remove')
				.attr('y', function (d) { return y(-(d.wclass.unvand+d.wclass.remove)); }).attr('height', function (d) { return y(d.wclass.remove);})
			
			yposlabelgroup.selectAll(".ylabel").data([]).exit().remove();
			
			var ylabels = yposlabelgroup.selectAll(".ylabel").data(y.ticks(10)).enter().append("g").attr("class", "ylabel")
				.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
			ylabels.append('text').attr('dy', '.35em').attr('x', function (d) { return 50 - this.getComputedTextLength() - 10; }).attr('transform', 'scale(1,-1)')
				.attr('text-anchor', 'end').text(String);
			
			yneglabelgroup.selectAll(".ylabel").data([]).exit().remove();
			
			ylabels = yneglabelgroup.selectAll(".ylabel").data(y.ticks(10).map(function (i) { return -i; })).enter().append("g").attr("class", "ylabel")
				.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
			ylabels.append('text').attr('dy', '.35em').attr('x', function (d) { return 50 - this.getComputedTextLength() - 10; }).attr('transform', 'scale(1,-1)')
				.attr('text-anchor', 'end').text(String);
			
			
			negrulegroup.selectAll(".rule").data([]).exit().remove();
			
			var rules = negrulegroup.selectAll(".rule").data(y.ticks(10).map(function (i) { return -i; }))
				.enter().append("g").attr("class", "rule")
				.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
	
			rules.append('line').attr('x2', width);
			
			posrulegroup.selectAll(".rule").data([]).exit().remove();
			
			rules = posrulegroup.selectAll(".rule").data(y.ticks(10)).enter().append("g").attr("class", "rule")
				.attr("transform", function (d) { return "translate(0," + (y(d) - 0.5) + ")"; });
	
			rules.append('line').attr('x2', width);
		}
	}).height(600);
	
	var $tablediag = $('#tableview').dialog({
			autoOpen: false,
			title: 'Detailed Content',
			height: 400,
			width: 960
		});
	
	$('#tableviewdiagspawn').button();
		$('#tableviewdiagspawn').click(function() {
			$tablediag.dialog('open');
	});
	
	$('#clearselection').button();
	
	var $legenddiag = $('#legend').dialog({
		autoOpen: true,
		title: 'Edit Categories',
		height: 'auto',
		width: 400,
		resizable: false
	});
	
	var $selectdiag = $('#selectdiag').dialog({
		autoOpen: false,
		title: 'Select Users',
		height: 'auto',
		width: 400,
		resizable: false
	});
	
	$('#legendspawn').button();
	$('#legendspawn').click(function() {
		$legenddiag.dialog('open');
	});
	
	$('#selectspawn').button();
	$('#selectspawn').click(function() {
		$selectdiag.dialog('open');
	});
	
	$('#accordion').accordion({
		collapsible: true,
		active: false
	});
	
	$('#select_apply').button();
	
	/*// Download revision data
	$.getJSON("dbquery.php?", {
		lower: 0,
		upper: 1000,
		article: theArticle
	},*/
	$.getJSON("lagrangian.txt", {},
	function(data) {
		$.each(data, function(i, rev) {
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
				wclass.edit += weights.edit;
			}
			if (strcontains('b', rev['class'])) {
				wclass.add += weights.add;
			}
			if (strcontains('c', rev['class'])) {
				wclass.remove += weights.remove;
			}
			if (strcontains('d', rev['class'])) {
				wclass.reorganize += weights.reorganize;
			}
			if (strcontains('e', rev['class'])) {
				wclass.cite += weights.cite;
			}
			if (strcontains('f', rev['class'])) {
				wclass.vand += weights.vand;
			}
			if (strcontains('g', rev['class'])) {
				wclass.unvand += weights.unvand;
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
			revdata.push(rev);
			
		});
		
		// Get rid of loading messages and decorations
		$("#stackview").removeClass("loadingview");
		$("#tableview").empty();
		$("#title").empty();
		$("#title").append($("<h1>").text('Article: ' + theArticle));
		
		buildTableview();
		initStackview();
		
		$(".data rect").click(function() {
			var user = revdata[+$(this).attr('desc')].user;
			
			sview.selectAll('.usertitle').data([]).exit().remove();
			sview.selectAll('.usertitle').data([user]).enter().append('text').attr('class', 'usertitle')
				.text('Viewing contributions by: ' + user).attr('transform', function(d) {
					return 'translate(' + (width - this.getComputedTextLength() - 20) + ',' + (2*height/3 - 20) + ')scale(1,-1)';
					})
				.attr('text-anchor: end');
			
			sview.select('.body').select('.data').selectAll('rect').transition().duration(1000).attr('opacity', function(d) {
				if (revdata[+$(this).attr('desc')].user == user) {
					return 1.0;
				}
				return 0.25;
			});
			
		});
		
		$("#clearselection").click(function() {
			sview.select('.body').select('.data').selectAll('rect').transition().duration(1000).attr('opacity', function(d) { return 1.0; });
			sview.selectAll('.usertitle').data([]).exit().remove();
		});
	});
	
});



