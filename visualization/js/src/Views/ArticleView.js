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
    
    // Goes to the previous 'n' revisions
    prev: function(){
        this.viz.sentences.model.prev();
    },
    
    // Shows all of the revisions
    showAll: function(){
        this.viz.sentences.model.showAll();
    },
    
    // Goes to the next 'n' revisions
    next: function(){
        this.viz.sentences.model.next(); 
    },
    
    events: {
        "click #prev":    "prev",
        "click #showAll": "showAll",
        "click #next":    "next"
    },
    
    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.viz = new WikiVizView({model: this.wikiviz, view: this, el: this.el});
        this.viz.init(this.model.get('title'));
        return this.$el;
    }
    
});
