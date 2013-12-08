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

    d3.select(self.frameElement).style("height", this.height + "px");
};

Graph.prototype._drawEdges = function(edgesIn) {
    var edges = this.svg.selectAll("g.link")
                    .data(edgesIn);

    edges.enter()
         .append("svg:path")
         .attr("class", "link")
         .attr("d", this.diagonal);

    edges.exit().remove();

    return edges;
};

Graph.prototype._drawNodes = function(nodesIn) {
    var nodes = this.svg.selectAll("g.node")
                        .data(nodesIn);

    nodes.enter()
         .append("svg:g")
         .attr("class", "node")
         .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
         });

    nodes.append("svg:circle")
           .attr("r", 4.5);

    nodes.append("text")
           .attr("dx", function(d) { return d.children ? -8 : 8; })
           .attr("dy", 3)
           .style("text-anchor", function(d) {
                return d.children ? "end" : "start";
            })
           .text(function(d) { return d.name; });

    nodes.exit().remove();

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

    this._drawEdges(edges);
    this._drawNodes(nodes);

}
