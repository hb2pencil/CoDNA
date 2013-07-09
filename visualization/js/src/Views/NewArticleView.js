// ## NewArticleView
NewArticleView = Backbone.View.extend({    
    
    initialize: function(){
        this.listenTo(this.model, 'sync', this.render);
        this.template = _.template($("#new_article_template").html());
    },
    
    events: {
        "click #initiative .option": "clickInitiative",
        "click #project .option": "clickProject",
        "click #analyse button": "clickAnalyse"
    },
    
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
    
    clickAnalyse: function(e){
        var title = this.$("#project .option.selected .label").text();
        var articleView = new ArticleView({el: "#content", model: this.model.findWhere({'title': title})});
        articleView.render();
    },
    
    renderInitiatives: function(){
        this.$("#initiative").tabs();
    },
    
    renderProjects: function(){
        this.$("#project #tabs-project .select").empty();
        this.model.each(function(article){
            this.$("#project #tabs-project .select").append("<div class='option'><span class='label'>" + article.get('title') + "</span><span class='count'>(" + article.get('rev_count') + " edits)</span></div>");
        });
        this.$("#project").tabs();
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.renderInitiatives();
        this.renderProjects();
        /*
        this.$el.append($('<div>').attr('id', 'diag_article'));
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
	    */
	    return this.$el;
	}
});
