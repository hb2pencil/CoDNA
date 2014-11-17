// ## User
User = Backbone.Model.extend({

    initialize: function(){

    },
    
    urlRoot: function(){
        return "dbquery.php?users&id=" + this.get('id');
    },
    
    // Returns whether or not this User has ever been a 'Bot' or not
    isBot: function(){
        return (this.get('roles').indexOf('Bot') != -1);
    }

});

// ## UserCollection
UserCollection = Backbone.NonUniqueCollection.extend({

    model: User,
    
    url: "dbquery.php?users"

});
