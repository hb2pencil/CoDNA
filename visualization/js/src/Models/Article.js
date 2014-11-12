// ## Article
Article = Backbone.Model.extend({

    initialize: function(){
    
    },
    
    urlRoot: "",
    
    defaults: {
        article_id: 0,
        title: "",
        rev_count: 0,
        set: 1,
        display: true
    }

});

// ## ArticleCollection
ArticleCollection = Backbone.Collection.extend({
    
    model: Article,
    
    url: function(){
        return "dbquery.php?list";
    }
    
});
