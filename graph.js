"use strict";

var Graph = function (graph_element) {
    this.graph_element = graph_element;
    this.width =  960;
    this.height = 1200;

    this.cluster = d3.layout.tree()
                            .size([this.height, this.width - 160]);

    this.diagonal = d3.svg.diagonal()
                          .projection(function(d) { return [d.y, d.x]; });

    this.svg = d3.select(this.graph_element)
                 .append("svg:svg")
                     .attr("width", this.width)
                     .attr("height", this.height)
                 .append("svg:g")
                     .attr("transform", "translate(40,0)");

    this.duration = d3.event && d3.event.altKey ? 5000 : 500;

    d3.select(self.frameElement).style("height", this.height + "px");
};

Graph.prototype._drawEdges = function(edgesIn, source) {
    var me = this;

    var edges = this.svg.selectAll("g.link")
                    .data(edgesIn);

    edges.enter()
         .insert("svg:path")
         .attr("class", "link")
         .attr("d", function(d) {
             var o = {x: source.x0 || me.height/2, y: source.y0 || 0};
             return me.diagonal({source: o, target: o})
         })
         .transition()
            .duration(this.duration)
            .attr("d", this.diagonal)


    /* Transition links to their new position. */
    edges.transition()
         .duration(this.duration)
         .attr("d", this.diagonal);

    /* Transition exiting nodes to the parent's new position. */
    edges.exit().transition()
         .duration(this.duration)
         .attr("d", function(d) {
            var o = {x: source.x, y: source.y};
            return me.diagonal({source: o, target: o});
         })
         .remove();

    return edges;
};

Graph.prototype._drawNodes = function(nodesIn) {

    var nodes = this.svg.selectAll("g.node")
                        .data(nodesIn);

    var nodesEnter = nodes.enter()
         .append("svg:g")
         .attr("class", "node")
         .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
         });

    nodesEnter.append("svg:circle")
           .attr("r", 4.5);

    nodesEnter.append("text")
           .attr("dx", function(d) { return d.children ? -8 : 8; })
           .attr("dy", 3)
           .style("text-anchor", function(d) {
                return d.children ? "end" : "start";
            })
           .text(function(d) { return d.name; });

    /* Transition nodes to their new position. */
    var nodesUpdate = nodes.transition()
            .duration(this.duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
             });

    nodesUpdate.select("circle")
        .attr("r", 4.5)
        .style("fill", function(d) { return d.children ? "lightsteelblue" : "#fff"; });

    nodesUpdate.select("text")
        .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodesExit = nodes.exit().transition()
        .duration(this.duration)
        .remove();

    nodesExit.select("circle")
        .attr("r", 0);

    nodesExit.select("text")
        .style("fill-opacity", 0);

    /* Stash the old positions for transition. */
    nodesIn.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    return nodes;
}

/* FIXME: This function was not suppose to be necessary, but for some reason
 * when the user try to start a new graph with just the root node some
 * previous used edges, circles and nodes persist to show up in the graph */
Graph.prototype.clean = function() {
    this.svg.selectAll(".node").remove();
    this.svg.selectAll("circle").remove();
    this.svg.selectAll("text").remove();
    this.svg.selectAll(".link").remove();
}

Graph.prototype.draw = function(dataIn) {

    var data = jQuery.extend(true, {}, dataIn);

    var nodes = this.cluster.nodes(data),
        edges = this.cluster.links(nodes);

    this._drawEdges(edges, data);
    this._drawNodes(nodes);

}
