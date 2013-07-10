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
            if(tab.get('type') == 'tab'){
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
                        this.render();
                    }, this)
                });
            }
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
        "click .x": "close",
        "click": "click"
    },
    
    // Triggered when a tab is clicked (clicking the 'x' doesn't count)
    // 
    // If a '+' tab was clicked, then a new tab is created and selected, otherwise
    // the clicked tab is selected, and the previously selected tab is unselected
    click: function(e){
        if(this.model.get('type') == 'new'){
            var tab = new TopTab({title: "New Tab", mainView: new NewArticleView({model: articles})});
            var beforeX = _.last(topTabsView.views).model.get('x');
            topTabs.add(tab);
            topTabsView.order();
            var selected = topTabs.getSelected();
            if(selected != null && selected != this.model){
                selected.set('selected', false);
            }
            tab.set('selected', true);
            $("#tab_" + tab.cid).css('display', 'none');
            $("#tab_" + tab.cid).show('slide', 200);
            _.last(topTabsView.views).$el.css('left', beforeX);
            _.last(topTabsView.views).$el.animate({
                'left': tab.get('x') + $("#tab_" + tab.cid).outerWidth() + TopTabsView.spacing
            }, 200);
        }
        else{
            if(!$(e.target).hasClass('x')){
                var selected = topTabs.getSelected();
                if(selected != null && selected != this.model){
                    selected.set('selected', false);
                }
                if(!this.model.get('selected')){
                    this.model.set('selected', true);
                }
            }
        }
    },
    
    // Closes this tab and removes it.  The last tab is then selected
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
        this.model.set('selected', false);
        this.model.get('mainView').remove();
        this.$el.hide('slide', 200, $.proxy(function(){
            topTabs.remove(this.model);
            if(topTabs.at(topTabs.length-2)){
                topTabs.at(topTabs.length-2).set('selected', true);
            }
        }, this));
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.addClass("tab");
        this.$el.stop();
        this.$el.css('left', this.model.get('x'));
        this.$el.attr('id', "tab_" + this.model.cid);
        if(this.model.get('selected')){
            this.$el.addClass('selected');
        }
        else{
            this.$el.removeClass('selected');
        }
        return this.$el;
    }

});
