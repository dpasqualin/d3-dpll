"use strict";

var Graph = function () {
    this.width =  960;
    this.height = 2200;

    this.cluster = d3.layout.cluster()
                            .size([height, width - 160]);

    this.diagonal = d3.svg.diagonal()
                          .projection(function(d) { return [d.y, d.x]; });

    this.svg = d3.select("#graph")
                 .append("svg")
                     .attr("width", width)
                     .attr("height", height)
                 .append("g")
                     .attr("transform", "translate(40,0)");

    d3.select(self.frameElement).style("height", this.height + "px");
};

Graph.prototype._drawEdges = function(edges) {
    return svg.selectAll(".link")
              .data(edges)
              .enter().append("path")
              .attr("class", "link")
              .attr("d", this.diagonal);
};

Graph.prototype._drawNodes = function(nodesIn) {
    var nodes = svg.selectAll(".node")
                   .data(nodesIn)
                   .enter().append("g")
                   .attr("class", "node")
                   .attr("transform", function(d) {
                        return "translate(" + d.y + "," + d.x + ")";
                   });

    nodesIn.append("circle")
           .attr("r", 4.5);

    nodesIn.append("text")
           .attr("dx", function(d) { return d.children ? -8 : 8; })
           .attr("dy", 3)
           .style("text-anchor", function(d) {
                return d.children ? "end" : "start";
            })
           .text(function(d) { return d.name; });

    return nodes;
}

Graph.prototype.draw = function(data) {

    var nodes = cluster.nodes(data),
        edges = cluster.links(nodes);

    this._drawEdges(edges);
    this._drawNodes(nodes);

}
