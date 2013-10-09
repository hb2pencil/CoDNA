// ## User
User = Backbone.Model.extend({

    initialize: function(){

    },
    
    urlRoot: function(){
        return "dbquery.php?users&id=" + this.get('id');
    },
    
    defaults: {
        id: 0,
        name: "",
        histid: "",
        flagged: 0,
        edits: 0,
        created: "",
        display: true
    }

});

// ## UserCollection
UserCollection = Backbone.Collection.extend({

    model: User,
    
    url: "dbquery.php?users"

});
