$.ajaxSetup({ cache: false });

articles = new ArticleCollection(); // TODO: Change this.  This should be in NewArticleView, not globally defined
articles.fetch();
topTabs = new TopTabCollection();
topTabsView = new TopTabsView({model: topTabs, el: "#topTabs"});

PageRouter = Backbone.Router.extend({
    routes: {
        "test": "testRoute",
        "*actions": "defaultRoute"
    },
    
    defaultRoute: function(actions){
        var newArticleView = new NewArticleView({model: articles});
        topTabsView.render();
        topTabs.add(new TopTab({title: "New Tab", mainView: newArticleView, selected: true}));
        topTabs.add(new NewTopTab());
    }
    
});

// Initiate the router
pageRouter = new PageRouter();

// Start Backbone history a necessary step for bookmarkable URL's
Backbone.history.start();
