// ## TopTab
TopTab = Backbone.Model.extend({

    initialize: function(){
        
    },
    
    defaults: {
        title: "",
        selected: false,
        x: 0,
        mainView: null
    }

});

// ## TopTabCollection
TopTabCollection = Backbone.Collection.extend({
    
    comparator: function(tab){
        return tab.get('x');
    },
    
    model: TopTab 
    
});
