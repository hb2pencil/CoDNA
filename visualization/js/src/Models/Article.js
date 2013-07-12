// ## Article
Article = Backbone.Model.extend({

    initialize: function(){
    
    },
    
    urlRoot: "",
    
    defaults: {
        title: "",
        rev_count: 0
    }

});

// ## ArticleCollection
ArticleCollection = Backbone.Collection.extend({
    
    model: Article,
    
    url: "dbquery.php?list"
    
});
