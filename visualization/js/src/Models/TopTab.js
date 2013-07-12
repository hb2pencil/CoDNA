// ## TopTab
TopTab = Backbone.Model.extend({

    initialize: function(){
        this.on('change:selected', function(){
            if(topTabs.getSelected() == this){
                this.get('mainView').$el.html(this.contents);
            }
            else{
                this.contents = this.get('mainView').$el.children().detach();
            }
        }, this);
        this.get('mainView').render();
    },
    
    defaults: {
        type: "tab",
        color: "#CFECAD",
        hoverColor: "#BDD99E",
        title: "",
        selected: false,
        x: Number.MAX_VALUE/2,
        mainView: null
    }

});

// ## NewTopTab (used for a "+" button to create a new tab)
NewTopTab = TopTab.extend({

    initialize: function(){
        
    },
    
    defaults: {
        type: "new",
        color: "#EEEEEE",
        hoverColor: "#DDDDDD",
        title: "<b>&#10133;</b>",
        selected: false,
        x: Number.MAX_VALUE,
        mainView: null,
    }

});

// ## TopTabCollection
TopTabCollection = Backbone.Collection.extend({
    
    // Comparator is the x coordinate of the tab.
    // Tabs of type 'new' should be treates specially, and always be at the end
    comparator: function(tab){
        if(tab.get('type') == 'new'){
            return Number.MAX_VALUE;
        }
        return tab.get('x');
    },
    
    // Returns the currently selected tab
    getSelected: function(){
        return this.findWhere({'selected': true});
    },
    
    model: TopTab
    
});
