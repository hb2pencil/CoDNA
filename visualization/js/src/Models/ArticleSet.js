// ## ArticleSet
ArticleSet = Backbone.Model.extend({

    initialize: function(){
    
    },
    
    urlRoot: "",
    
    defaults: {
        id: null,
        name: "",
        url: "",
    }

});

// ## ArticleSetCollection
ArticleSetCollection = Backbone.Collection.extend({
    
    model: ArticleSet,
    
    url: "dbquery.php?listArticleSets"
    
});
