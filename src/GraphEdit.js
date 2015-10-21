function GraphEdit(d3, _, map, graph, parameters) {
    var mode = "explore", // "edit"
        mousedownVertex,
        temporaryVertices = [],
        temporaryEdges = [];

    // Prepare svg elements
    //var svg = d3.select("#map")
    //        .append("svg")
    //        .attr("width", parameters.width)
    //        .attr("height", parameters.height);
    var svg = d3.select(map.getPanes().overlayPane)
        .append("svg")
        .attr("width", 960)
        .attr("height", 500);
    var segmentContainer = svg.append("g").attr("class", "leaflet-zoom-hide"),
        temporaryDomContainer = svg.append("g").attr("class", "leaflet-zoom-hide"),
        vertexContainer = svg.append("g").attr("class", "leaflet-zoom-hide");

    //var collection = {"type":"FeatureCollection","features":[{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[0,90],[-360,90],[-360,-90],[0,-90],[0,90]]]}}]};
    //var transform = d3.geo.transform({point: projectPoint}),
    //    path = d3.geo.path().projection(transform);
    //
    //var feature = g.selectAll("path")
    //    .data(collection.features)
    //    .enter().append("path");

    map.on("viewreset", update);

    //function projectPoint(x, y) {
    //    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    //    this.stream.point(point.x, point.y);
    //}

    // Define behaviors and attributes
    var dragEdge = d3.behavior.drag()
            .origin(function (d) { return d; })
            .on("dragstart", startedDraggingEdge)
            .on("drag", draggingEdge)
            .on("dragend", endedDraggingEdge),
        dragVertex = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", startedDraggingVertex)
            .on("drag", draggingVertex)
            .on("dragend", endedDraggingVertex),
        edgeCoordinates = {
            x1: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.source.lat, edge.source.lng));
                return point.x;
            },
            y1: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.source.lat, edge.source.lng));
                return point.y;
            },
            x2: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.target.lat, edge.target.lng));
                return point.x;
            },
            y2: function (edge) {
                var point = map.latLngToLayerPoint(new L.LatLng(edge.target.lat, edge.target.lng));
                return point.y;
            }
        },
        vertexCoordinate = {
            cx: function (d) {
                var point = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng));
                return point.x;
            },
            cy: function (d) {
                var point = map.latLngToLayerPoint(new L.LatLng(d.lat, d.lng));
                return point.y;
            }
        };

    // Attach callbacks
    svg.on("mouseup", mouseUp);
    svg.on("mousemove", mouseMove);
    svg.on("mousedown", mouseDown);
    d3.selectAll('.mode-radio-labels').selectAll('input')
        .on("click", function () {
          mode = d3.select(this).property("value");
        });

    /**
     * A callback for a mouse event
     * @param d
     */
    function mouseDown () {
        if (mode == "draw" || mode == "edit" || mode == "delete") {
            d3.event.stopPropagation();
        }
    }
    function mouseUp () {
        if (mode == "draw") {
            d3.event.stopPropagation();
            var point = map.layerPointToLatLng(L.point(d3.mouse(this)[0], d3.mouse(this)[1]));
            if (mousedownVertex) {
                // Create a new vertex and a new edge
                var newVertex = graph.addVertex(graph.getUniqueVertexId(), point.lng, point.lat);
                graph.addEdge(graph.getUniqueEdgeId(), mousedownVertex, newVertex);
            } else {
                // Create a new vertex
                graph.addVertex(graph.getUniqueVertexId(), point.lng, point.lat);
           }
            mousedownVertex = null;
            temporaryVertices.splice(0, temporaryVertices.length);  // Empty an array. http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
            temporaryEdges.splice(0, temporaryEdges.length);
        } else if (mode == "edit" || mode == "delete") {
            d3.event.stopPropagation();
        }

        update();
    }

    function mouseMove() {
        if (mode == "draw") {
            if (temporaryVertices.length == 2) {
                temporaryVertices[1].x = d3.mouse(this)[0];
                temporaryVertices[1].y = d3.mouse(this)[1];
            }
        }
    }

    /**
     * A callback for dragstart event
     * http://bl.ocks.org/mbostock/6123708
     * http://stackoverflow.com/questions/13657687/drag-behavior-returning-nan-in-d3
     * @param d
     */
    function startedDraggingVertex(d) {
        if (mode == "edit") {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
        }
    }

    /**
     * A callback for a vertex drag event.
     * @param d
     */
    function draggingVertex(d) {
        if (mode == "edit") {
            // Update node coordinates
            d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);

            var vertex = graph.getVertex(d.id),
                edges = vertex.getEdges();

            _.each(edges, function (e) {
                if (e.source.id === d.id) {
                    e.source.x = d.x;
                    e.source.y = d.y;
                } else {
                    e.target.x = d.x;
                    e.target.y = d.y;
                }
            });
        }
        update();
    }

    /**
     * A callback for the vertex dragend event.
     * @param d
     */
    function endedDraggingVertex() {
        if (mode == "edit") {
            d3.select(this).classed("dragging", false);
        }
        update();
    }

    function startedDraggingEdge() {
        if (mode == "edit") {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
        }
        update();
    }

    /**
     * A callback function for the edge drag event.
     * @param d
     */
    function draggingEdge(d) {
        if (mode == "edit") {
            d3.select(this)
                .attr("x1", d.source.x += d3.event.dx)
                .attr("y1", d.source.y += d3.event.dy)
                .attr("x2", d.target.x += d3.event.dx)
                .attr("y2", d.target.y += d3.event.dy);
        }

        update();
    }

    function endedDraggingEdge(d) {
        if (mode == "edit") {
            d3.select(this).classed("dragging", false);
        }
        update();
    }

    // Reference
    // http://bl.ocks.org/rkirsling/5001347
    var vertexEvents = {
        mouseover: function () {
            d3.select(this).classed("active", true);
        },
        mouseout: function () {
            d3.select(this).classed("active", false);
        },
        mousedown: function (d) {
            if (mode == "draw") {
                var temporaryVertex1 = _.clone(d),
                    temporaryVertex2 = _.clone(d);
                mousedownVertex = d;

                temporaryVertices.push(temporaryVertex1);
                temporaryVertices.push(temporaryVertex2);
                temporaryEdges.push(new Edge(-1, temporaryVertex1, temporaryVertex2));
            }
        },
        mouseup: function (d) {
            // Draw a new edge between two nodes
            if (mode == "draw") {
                d3.event.stopPropagation();
                if (mousedownVertex && mousedownVertex != d) {
                    graph.addEdge(graph.getUniqueEdgeId(), mousedownVertex, d);
                }
            } else if (mode == "delete") {
                graph.removeVertex(d.id);
            }
            temporaryVertices.splice(0, temporaryVertices.length);
            temporaryEdges.splice(0, temporaryEdges.length);
            mousedownVertex = null;
        }
    };

    var edgeEvents = {
        "mouseover": function () {
            d3.select(this).classed("active", true);
        },
        "mouseout": function () {
            d3.select(this).classed("active", false);
        },
        mouseup: function (d) {
            if (mode == "delete") {
                graph.removeEdge(d.id);
            }
        }
    };

    /**
     * A method to render stuff.
     */
    var line, circle, temporaryLine, temporaryCircle;
    function update() {
        for (var i = graph.vertices.length - 1; i >= 0; i--) {
            var point = map.latLngToLayerPoint(new L.LatLng(graph.vertices[i].lat, graph.vertices[i].lng));
            graph.vertices[i].x = point.x;
            graph.vertices[i].y = point.y;
        }

        // Render Segments
        line = segmentContainer.selectAll("line")
            .data(graph.edges);
        line.enter().append("line")
            .attr("stroke-width", 3)
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.2)
            .on(edgeEvents)
            .call(dragEdge);
        line.exit().remove();


        circle = vertexContainer.selectAll("circle")
            .data(graph.vertices);
        circle.enter().append("circle")
            .attr("fill", "steelblue")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("r", 6)
            .on(vertexEvents)
            .call(dragVertex);
        circle.exit().remove();

        circle.attr(vertexCoordinate);
        line.attr(edgeCoordinates);

        temporaryLine = temporaryDomContainer.selectAll("line")
            .data(temporaryEdges);
        temporaryLine.enter().append("line")
            .attr("stroke-width", 3)
            .attr("stroke", "black")
            .attr("stroke-opacity", 0.2);
        temporaryLine.exit().remove();


        temporaryCircle = temporaryDomContainer.selectAll("circle")
            .data(temporaryVertices);

        temporaryCircle.enter().append("circle")
            .attr("fill", "orange")
            .attr("stroke", "white")
            .attr("stroke-width", 2)
            .attr("r", 6);
        temporaryCircle.exit().remove();
        temporaryCircle.attr(vertexCoordinate);
        temporaryLine.attr(edgeCoordinates);
    }

    update();
    return {
        update: update
    };
}
