$.ajaxSetup({ cache: false });

topTabs = new TopTabCollection();
topTabsView = new TopTabsView({model: topTabs, el: "#topTabs"});

PageRouter = Backbone.Router.extend({
    routes: {
        "test": "testRoute",
        "*actions": "defaultRoute"
    },
    
    defaultRoute: function(actions){
        var articles = new ArticleCollection();
        articles.fetch();
        var newArticleView = new NewArticleView({el: "#content", model: articles});
        topTabsView.render();
        newArticleView.render();
        topTabs.add(new TopTab({title: "+ Tab...", mainView: newArticleView, selected: true}));
        topTabs.add(new TopTab({title: "Hello World", mainView: newArticleView, selected: false}));
        topTabs.add(new TopTab({title: "Hello World", mainView: newArticleView, selected: false}));
        topTabs.add(new TopTab({title: "Hello World", mainView: newArticleView, selected: false}));
        topTabs.add(new TopTab({title: "Hello World", mainView: newArticleView, selected: false}));
        topTabs.add(new TopTab({title: "Hello World", mainView: newArticleView, selected: false}));
    }
    
});

// Initiate the router
pageRouter = new PageRouter();

// Start Backbone history a necessary step for bookmarkable URL's
Backbone.history.start();
