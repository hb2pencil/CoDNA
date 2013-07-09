$.ajaxSetup({ cache: false });

PageRouter = Backbone.Router.extend({
    routes: {
        "test": "testRoute",
        "*actions": "defaultRoute"
    },
    
    defaultRoute: function(actions){
        var articles = new ArticleCollection();
        articles.fetch();
        var newArticleView = new NewArticleView({el: "#content", model: articles});
        newArticleView.render();
    }
    
});

// Initiate the router
pageRouter = new PageRouter();

// Start Backbone history a necessary step for bookmarkable URL's
Backbone.history.start();
