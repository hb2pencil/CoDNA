// ## NewArticleView
NewArticleView = Backbone.View.extend({    
    
    template: _.template($("#new_article_template").html()),
    
    initialize: function(){
        this.listenTo(this.model, 'sync', this.render);
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
	    return this.$el;
	}
});
