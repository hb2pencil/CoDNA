// ## UserSet
UserSet = Backbone.Model.extend({

    initialize: function(){
    
    },
    
    urlRoot: "",
    
    defaults: {
        id: null,
        name: "",
        url: "",
        count: 0,
        disabled: false
    }

});

// ## UserSetCollection
UserSetCollection = Backbone.Collection.extend({
    
    model: UserSet,
    
    url: "dbquery.php?listUserSets"
    
});
