// ## NewArticleView
NewArticleView = Backbone.View.extend({    
    
    template: _.template($("#new_article_template").html()),
    views: new Array(),
    
    initialize: function(){
        this.articleSets = new ArticleSetCollection();
        this.userSets = new UserSetCollection();
        this.users = new UserCollection();
        this.articles = new ArticleCollection();
        
        $.when(this.users.fetch(),
               this.articles.fetch(),
               this.articleSets.fetch(),
               this.userSets.fetch()).then($.proxy(function(){this.render();}, this));
        
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
    },
    
    events: {
        "click #initiative .option:not(.disabled)": "clickInitiative",
        "click #set .option": "clickDataSet",
        "click #project .option": "clickProject",
        "click #analyse button": "clickAnalyse",
        "click #clearFilter": "clearFilter",
        "change #filter": "filter",
        "keyup #filter": "filter"
    },
    
    // Returns the selected Article/User, or null if nothing is selected
    getSelected: function(){
        var model = null;
        _.each(this.views, function(view){
            if(view.$el.hasClass('selected')){
                model = view.model;
            }
        });
        return model;
    },
    
    // Clears the contents of the filter
    clearFilter: function(){
        this.$("#filter").attr('value', "");
        this.filter();
    },
    
    // Triggered when one of the options in the initiative list is clicked
    clickInitiative: function(e){
        this.$("#initiative .option").not(e.currentTarget).removeClass('selected');
        $(e.currentTarget).toggleClass('selected');
        if(this.$("#set").css('display') == 'none' &&
           this.$("#initiative .option.selected").length > 0){
            this.renderDataSets();
            this.$("#set").show('slide', 400);
        }
        else if(this.$("#set").css('display') != 'none' && 
                this.$("#initiative .option.selected").length == 0){
            this.$("#set").hide('slide', 400);
            if(this.$("#project").css('display') != 'none'){
                this.$("#project").hide('slide', 400);
                if(this.$("#analyse").css('display') != 'none'){
                    this.$("#analyse").hide('slide', 400);
                }
            }
        }
    },
    
    // Triggered when one of the options in the initiative list is clicked
    clickDataSet: function(e){
        this.$("#set .option").not(e.currentTarget).removeClass('selected');
        $(e.currentTarget).toggleClass('selected');
        if(this.$("#set .option.selected").length > 0){
            var span = this.$("#set .option.selected span");
            if(span.parent().hasClass("article")){
                this.renderProjects(this.articles.where({'set': parseInt(span.attr('name'))}));
            }
            else if(span.parent().hasClass("contributor")){
                this.renderProjects(this.users.where({'set': parseInt(span.attr('name'))}));
            }
            if(this.$("#project").css('display') == 'none'){
                this.$("#project").show('slide', 400);
            }
        }
        else if(this.$("#project").css('display') != 'none' && 
                this.$("#set .option.selected").length == 0){
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
        var selected = this.getSelected();
        var view = null;
        var title = "";
        var color = "";
        var hoverColor = "";
        if(selected instanceof Article){
            view = new ArticleView({model: selected});
            title = selected.get('title');
            color = "#ABD1EB";
            hoverColor = "#9EC0D9";
        }
        else if(selected instanceof User){
            view = new UserView({model: selected});
            title = selected.get('name');
            color = "#EEADAD";
            hoverColor = "#EE9898";
        }
        else {
            return;
        }
        topTabs.getSelected().set({
            'title': title,
            'mainView': view,
            'color': color, 
            'hoverColor': hoverColor
        });
        view.render();
        topTabsView.render();
        this.remove();
    },
    
    // Renders the initiatives list
    renderInitiatives: function(){
        if(_.size(this.articles.toJSON()) == 0){
            this.$("#initiative .select").html($("#big_throbber_template").html());
        }
        this.$("#initiative").tabs();
    },
    
    // Renders the projects/contributors data set list
    renderDataSets: function(){
        var artSets = document.createDocumentFragment();
        var userSets = document.createDocumentFragment();
        _.each(this.views, function(view){
            if(view instanceof DataSetView){
                view.remove();
            }
        });
        this.views = new Array();
        _.each(this.articleSets.models, function(article){
            var view = new DataSetView({model: article});
            this.views.push(view);
            artSets.appendChild(view.render()[0]);
        }, this);
        _.each(this.userSets.models, function(user){
            var view = new DataSetView({model: user});
            this.views.push(view);
            userSets.appendChild(view.render()[0]);
        }, this);
        this.$("#set #tabs-project .select").html(artSets);
        this.$("#set #tabs-contributor .select").html(userSets);
        this.$("#set").tabs();
    },
    
    // Renders the projects/contributors list
    renderProjects: function(set){
        var articles = document.createDocumentFragment();
        var users = document.createDocumentFragment();
        _.each(this.views, function(view){
            if(view instanceof ProjectView){
                view.remove();
            }
        });
        this.views = new Array();
        _.each(set, function(article){
            var view = new ProjectView({model: article});
            this.views.push(view);
            articles.appendChild(view.render()[0]);
        }, this);
        this.$("#project #tabs-item .select").html(articles);
        this.$("#project").tabs();
    },
    
    // Filters the options which appear in the selection list
    filter: function(){
        var filterVal = this.$("#filter").val().toLowerCase();
        _.each(this.articles.models, function(article){
            if(article.get('title').toLowerCase().indexOf(filterVal) != -1){
                article.set('display', true);
            }
            else{
                article.set('display', false);
            }
        });
        _.each(this.users.models, function(user){
            if(user.get('name').toLowerCase().indexOf(filterVal) != -1){
                user.set('display', true);
            }
            else{
                user.set('display', false);
            }
        });
    },
    
    render: function(){
        this.$el.html(this.template({'count': _.size(this.articles.toJSON())}));
        this.renderInitiatives();
	    return this.$el;
	}
});

// ## DataSetView
DataSetView = Backbone.View.extend({

    template: _.template($("#dataset_option_template").html()),

    initialize: function(){
        this.listenTo(this.model, 'change', this.render);
        this.$el.addClass("option");
        if(this.model instanceof UserSet){
            this.$el.addClass("contributor");
        }
        else if(this.model instanceof ArticleSet){
            this.$el.addClass("article");
        }
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        return this.$el;
    }

});

// ## ProjectView
ProjectView = Backbone.View.extend({

    article_template: _.template($("#article_option_template").html()),
    user_template: _.template($("#user_option_template").html()),

    initialize: function(){
        if(this.model instanceof Article){
            this.template = this.article_template;
        }
        else if(this.model instanceof User){
            this.template = this.user_template;
        }
        this.listenTo(this.model, 'change', this.render);
        this.$el.addClass("option");
    },
    
    render: function(){
        if(this.model.get('display')){
            this.$el.css('display', 'block');
            this.$el.html(this.template(this.model.toJSON()));
        }
        else{
            this.$el.css('display', 'none');
        }
        return this.$el;
    }

});
