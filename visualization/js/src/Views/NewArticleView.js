// ## NewArticleView
NewArticleView = Backbone.View.extend({    
    
    template: _.template($("#new_article_template").html()),
    views: new Array(),
    set: new Array(),
    type: '',
    
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
        "click #set .option:not(.disabled)": "clickDataSet",
        "click #project .option:not(.disabled)": "clickProject",
        "click #analyze button": "clickAnalyze",
        "click #clearFilter": "clearFilter",
        "change #filter": "filter",
        "keyup #filter": "filter",
        "click .class_filter": "classFilter"
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
                if(this.$("#analyze").css('display') != 'none'){
                    this.$("#analyze").hide('slide', 400);
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
                this.renderProjects(this.articles.where({'set': parseInt(span.attr('name'))}), 'article');
            }
            else if(span.parent().hasClass("contributor")){
                this.renderProjects(this.users.where({'set': parseInt(span.attr('name'))}), 'user');
            }
            if(this.$("#project").css('display') == 'none'){
                this.$("#project").show('slide', 400);
            }
        }
        else if(this.$("#project").css('display') != 'none' && 
                this.$("#set .option.selected").length == 0){
            this.$("#project").hide('slide', 400);
            if(this.$("#analyze").css('display') != 'none'){
                this.$("#analyze").hide('slide', 400);
            }
        }
    },
    
    // Triggered when one of the options in the project/contributor list is clicked
    clickProject: function(e){
        this.$("#project .option").not(e.currentTarget).removeClass('selected');
        $(e.currentTarget).toggleClass('selected');
        if(this.$("#analyze").css('display') == 'none' &&
           this.$("#project .option.selected").length > 0){
            this.$("#analyze").show('slide', 400);
        }
        else if(this.$("#analyze").css('display') != 'none' && 
                this.$("#project .option.selected").length == 0){
            this.$("#analyze").hide('slide', 400);
        }
    },
    
    // Triggered when the analyze button is clicked
    clickAnalyze: function(e){
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
            title = selected.get('id');
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
        for(var i = this.views.length; i >= 0; i--){
            var view = this.views[i];
            if(view instanceof DataSetView){
                view.remove();
                this.views.splice(i, 1);
            }
        }
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
    renderProjects: function(set, type){
        var articles = document.createDocumentFragment();
        var select = this.$("#project #tabs-item .select").detach();
        for(var i = this.views.length; i >= 0; i--){
            var view = this.views[i];
            if(view instanceof ProjectView){
                view.remove();
                this.views.splice(i, 1);
            }
        }
        this.$("#project #tabs-item .header").after(select);
        this.set = set;
        this.type = type;
        _.each(set, function(article){
            var view = new ProjectView({model: article});
            this.views.push(view);
            articles.appendChild(view.el);
        }, this);

        if(type == 'user'){
            this.filterUsers();
            $(".footer").show();
        }
        else{
            $(".footer").hide();
        }
        this.filter();
        this.$("#project #tabs-item .select").html(articles);
        this.$("#project").tabs();
    },
    
    // Filters the options which appear in the selection list
    filter: function(){
        var filterVal = this.$("#filter").val().toLowerCase();
        if(this.type == 'article'){
            _.each(this.set, function(article){
                if(article.get('title').toLowerCase().indexOf(filterVal) != -1){
                    article.set('display', true);
                }
                else{
                    article.set('display', false);
                }
            });
        }
        if(this.type == 'user'){
            _.each(this.set, function(user){
                if(user.get('id').toLowerCase().indexOf(filterVal) != -1){
                    user.set('display', true);
                }
                else{
                    user.set('display', false);
                }
            });
        }
    },
    
    filterUsers: function(){
        _.each(this.set, function(user){
            if(user.isBot()){
                user.set('filter', true);
            }
            else{
                user.set('filter', false);
            }
        });
    },
    
    filterBots: function(){
        _.each(this.set, function(user){
            if(!user.isBot()){
                user.set('filter', true);
            }
            else{
                user.set('filter', false);
            }
        });
    },
    
    filterAll: function(){
        _.each(this.set, function(user){
            user.set('filter', false);
        });
    },
    
    classFilter: function(e){
        var target = e.currentTarget;
        $(".class_filter").not(target).removeClass("selected");
        $(target).addClass("selected");
        
        switch($(target).attr("name")){
            case "users":
                this.filterUsers();
                break;
            case "bots":
                this.filterBots();
                break;
            case "all":
                this.filterAll();
                break;
        }
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
        if(this.model.get('disabled') == true){
            this.$el.addClass("disabled");
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
            this.el.innerHTML = this.article_template(this.model.toJSON());
        }
        else if(this.model instanceof User){
            this.el.innerHTML = this.user_template(this.model.toJSON());
        }
        this.listenTo(this.model, 'change', this.render);
        this.$el.addClass("option");
        if(this.model.get('edits') == -1){
            this.$el.addClass("disabled");
        }
    },
    
    render: function(){
        if(this.model.get('display') && !this.model.get('filter')){
            this.$el.css('display', 'block');
        }
        else{
            this.$el.css('display', 'none');
        }
        return this.$el;
    }

});
