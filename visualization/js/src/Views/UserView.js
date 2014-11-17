// ## UserView
UserView = Backbone.View.extend({
    
    template: _.template($("#user_container_template").html()),
    wikiviz: null,
    navctl: null,
    
    initialize: function(){
        this.wikiviz = new WikiViz({user: this.model.get('id'),
                                    set: this.model.get('set')});
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
        Backbone.Subviews.add(this);
    },
    
    subviewCreators : {
        "user_info": function(){
            return new UserInfoView({model: this.wikiviz, user: this.model});
        },
        "toolbar": function(){
            return new ToolbarView({model: {'buttons': ['articles','data','legend','deselect','talk']}, view: this});
        }
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.viz = new WikiVizView({model: this.wikiviz, view: this, el: this.el});
        this.viz.init(this.model.get('title'));
        return this.$el;
    }
    
});
