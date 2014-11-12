// ## TopTabsView
TopTabsView = Backbone.View.extend({

    views: new Array(),

    initialize: function(){
        this.listenTo(this.model, 'add', this.render);
        this.listenTo(this.model, 'remove', this.render);
        $(window).resize($.proxy(this.render, this));
    },
    
    // Orders each tab and spacing them correctly.
    // 
    // First the tabs are sorted based on their x position,
    // then they are spaced and rerendered.
    order: function(){
        this.model.sort();
        var startX = TopTabsView.leftMargin;
        var widthEstimate = (($("#content").outerWidth(true)-30-30-30-TopTabsView.spacing)/(this.model.length-1)) - 25 - 10 - TopTabsView.spacing;
        var widthSum = 0;
        var actualSum = 0;
        this.model.each(function(tab, index){
            var before = tab.get('x');
            tab.set('x', startX, {silent: true});
            var extraWidth = 0;
            if(tab.get('type') != 'new'){
                widthSum += widthEstimate + 25 + 10 + 5;
                actualSum += Math.max(5, Math.min(150, Math.round(widthEstimate))) + 25 + 10 + 5;
                var diff = widthSum - actualSum;
                actualSum += diff;
                // TODO: This isn't perfect, some rounding problems still exist
                this.$("#tab_" + tab.cid).css('max-width', Math.max(5, Math.min(150, Math.round(widthEstimate) + diff)));
            }
            startX += Math.round(this.$("#tab_" + tab.cid).outerWidth(true)) + TopTabsView.spacing;
            if(before != tab.get('x')){
                this.views[index].updatePosition();
            }
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
                        tab.set('x', parseInt(tabView.$el.css('left')), {silent: true});
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

// Left margin for first tab
TopTabsView.leftMargin = 15;
// Spacing between tabs
TopTabsView.spacing = 5;

// ## TopTabView
TopTabView = Backbone.View.extend({

    template: _.template($("#top_tab_template").html()),

    initialize: function(){
        this.listenTo(this.model, 'change', this.render);
    },
    
    events: {
        "mouseover": "hover",
        "mouseout": "unhover",
        "click .x": "close",
        "click": "click"
    },
    
    // Triggered when the tab is hovered.  Change hover color etc.
    hover: function(){
        if(this.model.get('selected')){
            this.$el.css('border-bottom', '1px solid #FFFFFF');
        }
        this.$el.css('background-color', this.model.get('hoverColor'));
    },
    
    unhover: function(){
        if(this.model.get('selected')){
            this.$el.css('border-bottom', '1px solid #FFFFFF');
        }
        else{
            this.$el.css('border-bottom', '1px solid #AAAAAA');
        }
        this.$el.css('background-color', this.model.get('color'));
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
                'left': tab.get('x') + $("#tab_" + tab.cid).outerWidth(true) + TopTabsView.spacing
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
                    'left': tab.model.get('x') - this.$el.outerWidth(true) - TopTabsView.spacing
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
    
    // Updates the left coordinate of the tab
    updatePosition: function(){
        this.$el.css('left', this.model.get('x'));
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        if(this.model.get('type') == 'new'){
            this.$el.addClass('tab_new');
        }
        this.$el.addClass("tab");
        this.$el.stop();
        this.updatePosition();
        this.$el.attr('id', "tab_" + this.model.cid);
        if(this.model.get('selected')){
            this.$el.addClass('selected');
            this.$el.css('border-bottom', '1px solid #FFFFFF');
        }
        else{
            this.$el.removeClass('selected');
            this.$el.css('border-bottom', '1px solid #AAAAAA');
        }
        this.$el.css('background-color', this.model.get('color'));
        return this.$el;
    }

});
