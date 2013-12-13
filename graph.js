"use strict";

var Graph = function (graph_element) {
    this.graph_element = graph_element;
    this.width =  960;
    this.height = 1200;
    this.last_id = 0;

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

    var edges = this.svg.selectAll("path")
                    .data(edgesIn, function(d) {
                        return d.target.id;
                    });

    edges.enter()
         .insert("svg:path", "g")
         .attr("class", "link")
         .attr("d", function(d) {
             var o = {x: source.x0 || me.height/2, y: source.y0 || 0};
             return me.diagonal({source: o, target: o})
         })
         .transition()
            .duration(this.duration)
            .attr("d", this.diagonal)

    edges.attr("class", function(d) {
             return d.target.sat_path === true? 'linksat' : 'link';
          });


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

Graph.prototype._showTooltip = function(d) {

    /* Update the tooltip position and value */
    d3.select("#tooltip")
      .style("top", event.pageY + "px")
      .style("left", event.pageX + "px")
      .select("#value")
        .html(d.formula);

    /* Show the tooltip */
    d3.select("#tooltip").classed("hidden", false);

};

Graph.prototype._hideTooltip = function(d) {
    d3.select("#tooltip").classed("hidden", true);
}

Graph.prototype._drawNodes = function(nodesIn, source) {
    var me = this;

    var nodes = this.svg.selectAll("g.node")
                        .data(nodesIn, function(d) { return d.id || (d.id = ++me.last_id); });

    // Normalize for fixed-depth.
    //nodesIn.forEach(function(d) { d.y = d.depth * 100; });

    var nodesEnter = nodes.enter()
         .append("svg:g")
         .attr("class", "node")
         .attr("transform", function(d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
         })
         .on("mouseover", this._showTooltip)
         .on("mouseout", this._hideTooltip);

    nodesEnter.append("svg:circle")
           .attr("r", 4.5)
           .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
           });

    nodesEnter.append("svg:text")
           .attr("dx", function(d) { return d.children ? -8 : 8; })
           .attr("dy", 3)
           .style("text-anchor", function(d) {
                return d.children ? "end" : "start";
            })
           .text(function(d) { return d.name; })
           .style("fill-opacity", 1e-6);

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

    /* Transition exiting nodes to the parent's new position. */
    var nodesExit = nodes.exit().transition()
        .duration(this.duration)
        .attr("transform", function(d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    nodesExit.select("circle")
        .attr("r", 1e-6);

    nodesExit.select("text")
        .style("fill-opacity", 1e-6);

    /* Stash the old positions for transition. */
    nodesIn.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    return nodes;
}

Graph.prototype.draw = function(dataIn) {

    var nodes = this.cluster.nodes(dataIn),
        edges = this.cluster.links(nodes);

    this._drawNodes(nodes, dataIn);
    this._drawEdges(edges, dataIn);

}
