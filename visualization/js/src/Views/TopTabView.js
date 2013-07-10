// ## TopTabsView
TopTabsView = Backbone.View.extend({

    views: new Array(),

    initialize: function(){
        this.listenTo(this.model, 'add', this.render);
        this.listenTo(this.model, 'remove', this.render);
    },
    
    // Orders each tab and spacing them correctly.
    // 
    // First the tabs are sorted based on their x position,
    // then they are spaced and rerendered.
    order: function(){
        this.model.sort();
        var startX = TopTabsView.leftMargin;
        this.model.each(function(tab, index){
            tab.set('x', startX, {silent: true});
            startX += this.$("#tab_" + tab.cid).outerWidth() + TopTabsView.spacing;
            this.views[index].render();
        }, this);
    },
    
    render: function(){
        _.each(this.views, function(view){
            view.remove();
        });
        this.views = new Array();
        this.$el.empty();
        this.model.each(function(tab){
            var tabView = new TopTabView({model: tab});
            this.$el.append(tabView.render());
            tabView.$el.draggable({
                axis: "x",
                start: $.proxy(function(e, ui){
                    tabView.$el.css('z-index', 1000);
                }, this),
                drag: $.proxy(function(e, ui){
                    tab.set('x', parseInt(tabView.$el.css('left')));
                    this.order();
                }, this),
                stop: $.proxy(function(){
                    tabView.$el.css('z-index', 0);
                    this.order();
                }, this)
            });
            this.views.push(tabView);
        }, this);
        this.order();
        return this.$el;
    },

});

TopTabsView.leftMargin = 15; // Left margin for first tab
TopTabsView.spacing = 5; // Spacing between tabs

// ## TopTabView
TopTabView = Backbone.View.extend({

    template: _.template($("#top_tab_template").html()),

    initialize: function(){
        this.listenTo(this.model, 'change', this.render);
    },
    
    events: {
        "click .x": "close"
    },
    
    close: function(){
        var found = false;
        _.each(topTabsView.views, function(tab){
            if(found){
                tab.$el.animate({
                    'left': tab.model.get('x') - this.$el.outerWidth() - TopTabsView.spacing
                }, 200);
            }
            if(tab == this){
                found = true;
            }
        }, this);
        this.$el.hide('slide', 200, $.proxy(function(){
            topTabs.remove(this.model);
        }, this));
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.addClass("tab");
        this.$el.css('left', this.model.get('x'));
        this.$el.attr('id', "tab_" + this.model.cid);
        if(this.model.get('selected')){
            this.$el.addClass('selected');
        }
        return this.$el;
    }

});
