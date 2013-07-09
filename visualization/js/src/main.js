/*$(document).ready(function() {
	// Quick 'N dirty way to allow user to select which article to view.
	// This is the modal dialog that appears on page load.
	$('body').append($('<div>').attr('id', 'diag_article'));
	$('#diag_article').append($('<h3>').text('Select an article below:'));
	$('#diag_article').append($('<div>').attr('id', 'd_article_list'));
	$('#diag_article').append($('<div>').attr('id', 'd_article_list_loading'));
	$('#d_article_list_loading').append($('<span>').text('Loading . . .'));
	$('#diag_article').dialog({
		resizable: false,
		width: 'auto',
		height: 300,
		autoOpen: true,
		title: 'Select Article'
	});
	// Query the DB to get a listing of the available articles.
	$.getJSON('dbquery.php?list', function(data) {
		for (var i = 0; i < data.length; ++i) {
			$('#d_article_list').append($('<h3>').append($('<a>').append($('<span>').text(data[i]['title'])).append($('<span>').text('('+data[i]['rev_count']+' Revisions)').attr('style','float:right')).attr('href', '#')));
			
			// Function which is called when we select an article to view.
			function getClickClosure(in_datum) {
				this.datum = in_datum;
				return function() {
					var title = in_datum['title'];
					$('#page_title').text(title);
					WIKIVIZ.init(title);	// Init the visualization with this article.
					$('#everything').fadeIn("slow");
					$('#diag_article').dialog('close');
				}
			}
			
			$('#d_article_list').append($('<div>').append($('<button>').attr('id', 'd_article_enter_'+i).text('Go').click(getClickClosure(data[i]))));
		}
		$('#d_article_list').accordion({
			collapsible: true,
			active: false,
			autoHeight: false,
			clearStyle: true
		});
		$('#d_article_list_loading').remove();
	});
});*/
