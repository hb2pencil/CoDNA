// ## NewArticleView
NewArticleView = Backbone.View.extend({    
    
    template: _.template($("#new_article_template").html()),
    
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
        aView = articleView;
        topTabs.getSelected().set({
            'title': title,
            'mainView': articleView,
            'color': "#ABD1EB", 
            'hoverColor':"#9EC0D9"
        });
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
        this.$el.html(this.template(this.model.toJSON()));
        this.renderInitiatives();
        this.renderProjects();
	    return this.$el;
	}
});
