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
