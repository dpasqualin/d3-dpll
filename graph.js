"use strict";

var Graph = function (graph_element) {
    this.graph_element = graph_element;
    this.width =  960;
    this.height = 2200;

    this.cluster = d3.layout.cluster()
                            .size([this.height, this.width - 160]);

    this.diagonal = d3.svg.diagonal()
                          .projection(function(d) { return [d.y, d.x]; });

    this.svg = d3.select(this.graph_element)
                 .append("svg")
                     .attr("width", this.width)
                     .attr("height", this.height)
                 .append("g")
                     .attr("transform", "translate(40,0)");

    d3.select(self.frameElement).style("height", this.height + "px");
};

Graph.prototype._drawEdges = function(edges) {
    return this.svg.selectAll(".link")
                   .data(edges)
                   .enter().append("path")
                   .attr("class", "link")
                   .attr("d", this.diagonal);
};

Graph.prototype._drawNodes = function(nodesIn) {
    var nodes = this.svg.selectAll(".node")
                        .data(nodesIn)
                        .enter().append("g")
                        .attr("class", "node")
                        .attr("transform", function(d) {
                            return "translate(" + d.y + "," + d.x + ")";
                        });

    nodes.append("circle")
           .attr("r", 4.5);

    nodes.append("text")
           .attr("dx", function(d) { return d.children ? -8 : 8; })
           .attr("dy", 3)
           .style("text-anchor", function(d) {
                return d.children ? "end" : "start";
            })
           .text(function(d) { return d.name; });

    return nodes;
}

Graph.prototype.draw = function(dataIn) {

    var data = jQuery.extend(true, {}, dataIn);

    var nodes = this.cluster.nodes(data),
        edges = this.cluster.links(nodes);

    this._drawEdges(edges);
    this._drawNodes(nodes);

}
