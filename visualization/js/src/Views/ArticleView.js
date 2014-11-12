// ## ArticleView
ArticleView = Backbone.View.extend({
    
    template: _.template($("#article_container_template").html()),
    wikiviz: null,
    navctl: null,
    
    initialize: function(){
        this.wikiviz = new WikiViz({article_id: this.model.get('article_id'),
                                    title: this.model.get('title'),
                                    set: this.model.get('set')});
        var id = _.uniqueId();
        $("#content").append("<div id='" + id + "'>");
        this.$el = $("#" + id);
        this.el = $("#" + id)[0];
        Backbone.Subviews.add(this);
    },
    
    subviewCreators : {
        "article_info": function(){
            return new ArticleInfoView({model: this.wikiviz, article: this.model});
        },
        "toolbar": function(){
            return new ToolbarView({model: {'buttons': ['select','sections','data','legend','deselect','talk']}, view: this});
        }
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.viz = new WikiVizView({model: this.wikiviz, view: this, el: this.el});
        this.viz.init(this.model.get('title'));
        return this.$el;
    }
    
});
