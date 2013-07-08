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
