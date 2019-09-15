/**
 * CLass representing a force graph layout (VIEW)
 */
class ForceLayout extends Layout {

    // setting-dependent
    constructor(svg, data, runID, settings) {
        super(svg, data, runID);
        // style class and shape names
        this._className = "force";
        this._useParticles = false;

        this.defaultSettings();
        if (settings && settings[this._className]) {
            this.customSettings(settings[this._className]);
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    // Settings
    ///////////////////////////////////////////////////////////////////////////

    // Get default value for setting <name>
    default(name, isNode=true) {
        if (isNode) {
            switch(name) {
                case 'shape': return 'circle';
                case 'size':
                case 'sizex':
                case 'sizey': return 10;
                default: break;
            }
        } else {
            switch(name) {
                case 'shape': return 'line';
                case 'size': return -1;
                default: break;
            }
        }
    }

    // Set default settings values
    defaultSettings() {
        this.nodeX = this.default('sizex');
        this.nodeShape = this.default('shape');
        this.linkShape = this.default('shape', false);
    }

    // Add default event listener for a single node
    defaultEventListenerNode(elem) {
        this.onNodeEventSingle(elem, "mouseover", this.mouseOver);
        this.onNodeEventSingle(elem, "mouseout", this.mouseOut);
        this.nodeDragSingle(elem, this.dragStart, this.dragged, this.dragEnd);
    }

    // Enable the edge particle system
    enableParticles() {
        this._useParticles = true;
        this.i = 0;
    }


    ///////////////////////////////////////////////////////////////////////////
    // Drawing
    ///////////////////////////////////////////////////////////////////////////

    // Draw (initial) graph
    draw() {
        this.addArrowDefs();
        this.restart = true;

        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.id; }))
            .force("charge", d3.forceManyBody().strength(-50).distanceMin(5))
            // .force('charge', d3.forceCollide(5))
            .force("center", d3.forceCenter(this._width / 2, this._height / 2));

        let zoom = d3.zoom()
            .scaleExtent([-1, 5])
            .on("zoom", this.zoomView.bind(this));

        this._svg = this._svg.call(zoom);

        this.groupLink = this._svg.append("g")
        this.groupNode = this._svg.append("g")

        this.onSimulationEvent('tick', this.ticked);
        this.update();

        if (this._useParticles) {
            this.inter = setInterval(this.updateParticles.bind(this), 2000);
        }
    }

    // Update layout visualization given data in this._data
    update() {
        this.calculateDomain();

        let filter = this.filterItems();

        this.cleanStyleClasses(filter);
        this.updateDefault(filter.default);
        this.updateStyleClasses(filter);

        // Update force simulation
        this.simulation
            .nodes(this._data.nodes);
        this.simulation
            .force("link")
            .links(this._data.links);

        this.nodes = this.groupNode.selectAll(this.getClassString('nodes'));
        this.links = this.groupLink.selectAll(this.getClassString('links'));

        if (this._data.nodes.length >= 50)
            this.simulation.force('charge', this.simulation.force('charge').strength(-100));

        if (this.restart) {
            this.simulation.alpha(1).restart();
        } else {
            this.ticked();
        }
    }

    // Update all nodes and links in the default style class
    updateDefault(data) {
        let color = d3.scaleLinear()
            .domain([this.minDomain, this.maxDomain])
            .range(['lightsteelblue', 'blue']);

        this.links = this.groupLink.selectAll(this.linkShape+'.'+this.linkClass);
        // Update links
        this.links = this.links.data(data.links, this.key);
        this.links.exit().remove();
        this.links.enter()
            .append(this.linkShape)
                .attr("class", this._runID+' '+this._className+' '+this.linkClass)
                .attr("stroke-width", this.linkWidth.bind(this))
                .attr("marker-end", function(d) { if (d.direction===1) return "url(#arrow-head)"; })
            .merge(this.links)
                .attr('data-class', function(d) { return d.styleClass; })

        let addListener = this.defaultEventListenerNode.bind(this);
        let sizeNames = this.getSizeAttr(this.nodeShape);

        this.nodes = this.groupNode.selectAll(this.nodeShape+'.'+this.nodeClass);
        // Update nodes
        this.nodes = this.nodes.data(data.nodes, this.key);
        this.nodes.exit().remove();
        this.nodes.enter()
            .append(this.nodeShape)
                .attr("class", this._runID+' '+this._className+" "+this.nodeClass)
                .attr('fill', function(d) { return color(Layout.sumValue(d.value)); })
                .each(function(d) {
                    let me = d3.select(this);
                    addListener(me);
                    for (let val of sizeNames) {
                        me.attr(val[0], val[1]);
                    }
                    me.append("title")
                        .text(d.label);
                })
            .merge(this.nodes)
                .attr('data-class', function(d) { return d.styleClass; });
    }

    // Update all nodes and links in custom style classes
    updateStyleClasses(dataSet) {
        if (this._styleHandler.empty() || Object.keys(dataSet.nodes).length === 0 && Object.keys(dataSet.links).length === 0)
            return;

        let color = d3.scaleLinear()
            .domain([this.minDomain, this.maxDomain])
            .range(['lightsteelblue', 'blue']);

        let addListener = this.defaultEventListenerNode.bind(this);
        function handleStyleClass(list) {
            let name = list[0];
            let obj = list[1];

            if (obj.isNode) {
                let sizeNames = this._styleHandler.getSizeAttr(name);
                let tmpNodes = this.groupNode.selectAll(obj.shape+'.'+name);
                tmpNodes = tmpNodes.data(dataSet.nodes[name] || [], this.key);
                tmpNodes.exit().remove();
                tmpNodes.enter()
                    .append(obj.shape)
                        .attr('class', this._runID+' '+this._className+' '+this.nodeClass+' '+name)
                        .attr('data-class', name)
                        .attr('fill', function(d) {
                            if (obj.color)
                                return obj.color;
                            return color(Layout.sumValue(d.value));
                        })
                        .each(function(d) {
                            let me = d3.select(this);
                            addListener(me);
                            for (let val of sizeNames) {
                                me.attr(val[0], val[1]);
                            }
                            me.append("title")
                                .text(d.label);
                        })
                    .merge(tmpNodes);
            } else {
                let f = this.linkWidth.bind(this);
                let selection = this._data.links.filter(function(d) { return d.styleClass === name; });
                let tmpLinks = this.groupLink.selectAll(obj.shape+'.'+name);
                tmpLinks = tmpLinks.data(dataSet.links[name] || [], this.key);
                tmpLinks.exit().remove();
                tmpLinks.enter()
                    .append(obj.shape)
                        .attr("class", this._runID+' '+this._className+' '+this.linkClass+' '+name)
                        .attr('data-class', name)
                        .attr("marker-end", function(d) { if (d.direction===1) return "url(#arrow-head)"; })
                        .attr("stroke-width", function(d) {
                            if (obj.size > 0)
                                return obj.size;
                            else
                                return f(d);
                        })
                    .merge(tmpLinks);
            }
        }
        Object.entries(this._styleHandler.classes).forEach(handleStyleClass.bind(this));
    }

    // Update the particle system
    updateParticles() {
        let f = this.particle.bind(this);

        this.links
            .each(function (d) {
                f(d.source.x, d.source.y, d.target.x, d.target.y);
            });
    }

    // Remove elements that were, but are no longer, marked as having a custom style class
    cleanStyleClasses() {
        if (this._styleHandler.empty())
            return;

        function handleStyleClass(list) {
            let name = list[0];
            let obj = list[1];

            if (obj.isNode) {
                let selection = this._data.nodes.filter(function(d) { return d.styleClass === name; });
                let tmpNodes = this.groupNode.selectAll(obj.shape+'.'+name);
                tmpNodes = tmpNodes.data(selection, this.key);
                tmpNodes.exit().remove();
            } else {
                let selection = this._data.links.filter(function(d) { return d.styleClass === name; });
                let tmpLinks = this.groupLink.selectAll(obj.shape+'.'+name);
                tmpLinks = tmpLinks.data(selection, this.key);
                tmpLinks.exit().remove();
            }
        }
        Object.entries(this._styleHandler.classes).forEach(handleStyleClass.bind(this));
    }

    ///////////////////////////////////////////////////////////////////////////
    // Particle System
    ///////////////////////////////////////////////////////////////////////////

    particle(x1, y1, x2, y2) {
        let x, y, t;
        let data = [];
        for (let i = 0; i < 350/5; i++) {
            t = i * 0.1;
            x = 16 * Math.pow(Math.sin(t), 3);
            y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
            data[i] = [x, y];
        }

        //Scales
        let xScale = d3.scaleLinear()
                  .domain([d3.min(data, function (d) { return d[0]; }), d3.max(data, function (d) { return d[0]; })])
                  .range([0, 10]);

        let yScale = d3.scaleLinear()
                  .domain([d3.min(data, function (d) { return d[1]; }), d3.max(data, function (d) { return d[1]; })])
                  .range([10, 0]);

        // Different Shape
        /*let flow_shapes = {
            prep: function (height, width) {
                let points = [[0, height / 2], [width * .2, 0], [width * .8, 0], [width, height / 2], [width * .8, height], [width * .2, height], [0, height / 2]]
                return d3.line()(points);
            }
        }*/

        let line = d3.line()
          .curve(d3.curveLinear)
          .x(function (d) { return xScale(d[0]) })
          .y(function (d) { return yScale(d[1]) });

        let size = 10;
        this.hearts = this.groupNode.insert("path", "g")
            .attr("d", line(data))
            .attr("fill", d3.hsl((this.i = (this.i + 1) % 360), 1, .5))
            .attr("transform", function () {
                return "translate(" + (x1 - Math.random() * size) + "," + (y1 - Math.random() * size) + ")"
            })
            .style("stroke", "#000")
          .transition()
            .duration(3500)
            .ease(d3.easeLinear)
            .attr("transform", function () {
                return "translate(" + (x2 - Math.random() * size) + "," + (y2 - Math.random() * size) + ")"
            })
            .remove();

        /*
        this.groupNode.insert("circle", "rect")
            .attr("cx", m[0])
            .attr("cy", m[1])
            .attr("r", 5)
            .style("stroke", d3.hsl((this.i = (this.i + 1) % 360), 1, .5))
            .style("stroke-opacity", 1)
          .transition()
            .duration(2000)
            .ease(Math.sqrt)
            .attr("r", 100)
            .style("stroke-opacity", 1e-6)
            .remove();
            */

        //d3.event.preventDefault();
    }

    ///////////////////////////////////////////////////////////////////////////
    // Frames and Steps
    ///////////////////////////////////////////////////////////////////////////

    // Overwrite super method so we can decide whether to restart the
    // force layout simulation or not (more efficient)
    doFrame(frame, inverse=undefined, extra=false) {
        this.restart = false || extra;
        let success = false;
        for (let i = 0; i < frame.length; ++i) {
            if (Array.isArray(frame[i][0])) {
                success = this.doFrame(frame[i], inverse, true) || success;
            } else {
                success = this.doStep(frame[i][0], frame[i][1], inverse, this.restart) || success;
            }
        }
        return success;
    }

    // Overwrite super method so we can decide whether to restart the
    // force layout simulation or not (more efficient)
    doStep(op, params, inverse=undefined, extra=false) {
        this.restart = extra;
        return super.doStep(op, params, inverse);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Getters
    ///////////////////////////////////////////////////////////////////////////

    getLink(id) {
        let find = this._data.link(id);
        let result = Object.assign({}, find);
        result.source = result.source.id;
        result.target = result.target.id;
        return result;
    }

    getAdjacentLinks(id) {
        let result = [];
        this._data.links.forEach(function(d) {
            if (d.source.id === id || d.target.id === id) {
                result.push({ id: d.id, source: d.source.id, target: d.target.id, label: d.label, value: d.value, styleClass: d.styleClass });
            }
        });
        return result;
    }

    removeAdjacentLinks(id) {
        this.restart = true;
        this._data.removeLinks(function(d) { return d.source.id !== id && d.target.id !== id; });
    }

    ///////////////////////////////////////////////////////////////////////////
    // Modify data
    ///////////////////////////////////////////////////////////////////////////

    // Remove nodes and edges from the graph
    clearGraph() {
        this.restart = true;
        super.clearGraph();
    }

    // Set nodes and edges for the graph
    loadGraph(nodes, links) {
        this.restart = true;
        super.loadGraph(nodes, links);
    }

    // Add a new node
    addNode(id, value=1, label="no label", className=undefined) {
        this.restart = true;
        super.addNode(id, value, label, className);
    }

    // Add a new edge
    addLink(id, source, target, value, direction=0, label="no label", className=undefined) {
        this.restart = true;
        source = this.getNode(source);
        target = this.getNode(target);
        super.addLink(id, source, target, value, direction, label, className);
    }

    // Change a node attribute (e.g. class, value, id, ...)
    setNodeAttr(id, attrName, attrValue) {
        this.nodes
            .filter(function(d) { return d.id === id; })
            .attr(attrName, attrValue);
    }

    // Change a link attribute (e.g. class, value, id, ...)
    setLinkAttr(id, attrName, attrValue) {
        this.links
            .filter(function(d) { return d.id === id; })
            .attr(attrName, attrValue);
    }

    // Delete the node with ID <id>
    deleteNode(id) {
        this.restart = true;
        super.deleteNode(id);
    }

    // Delete the edge with ID <id>
    deleteLink(id) {
        this.restart = true;
        super.deleteLink(id);
    }

    ///////////////////////////////////////////////////////////////////////////
    // Event callbacks
    ///////////////////////////////////////////////////////////////////////////

    // Add event listener for the simulation
    onSimulationEvent(name, callback) {
        this.simulation.on(name, callback.bind(this));
    }

    ///////////////////////////////////////////////////////////////////////////
    // Utility
    ///////////////////////////////////////////////////////////////////////////

    // Get the drawing width of an edge
    linkWidth(d) {
        if (this.linkSize)
            return this.linkSize;
        if (this._data.links.length >= 500)
            return 1;
        return Math.sqrt(Math.min(10,Layout.sumValue(d.value)));
    }

    // Calculates and stores the minimum and maximum node values in data
    calculateDomain() {
        let minDomain = Number.MAX_VALUE;
        let maxDomain = -Number.MIN_VALUE;
        this._data.nodes.forEach(function(d) {
            let nodeVal = Layout.sumValue(d.value);
            if (nodeVal < minDomain) minDomain = d.value;
            if (nodeVal > maxDomain) maxDomain = d.value;
        });
        this.minDomain = minDomain;
        this.maxDomain = maxDomain;
    }

    ///////////////////////////////////////////////////////////////////////////
    // Default callbacks for events
    ///////////////////////////////////////////////////////////////////////////

    // Apply zoom/drag transform to nodes and edges
    zoomView() {
        this.groupNode.attr("transform", d3.event.transform);
        this.groupLink.attr("transform", d3.event.transform);
    }

    // Enlarge nodes on hover and decrease edge opacity for
    // edges that are not connected to node <d>
    mouseOver(d) {
        let sizeNames = this.getSizeAttr(this.nodeShape);
        if (this._styleHandler.has(d.styleClass)) {
            sizeNames = this._styleHandler.getSizeAttr(d.styleClass);
        }
        for (let obj of sizeNames) {
            this.setNodeAttr(d.id, obj[0], obj[1]*2);
        }
        this.links
            .attr("stroke-opacity", function(l) {
                return l.source == d || l.target == d ? 0.9 : 0.2;
            });
    }

    // Reset <mouseOver> changes
    mouseOut(d) {
        let sizeNames = this.getSizeAttr(this.nodeShape);
        if (this._styleHandler.has(d.styleClass)) {
            sizeNames = this._styleHandler.getSizeAttr(d.styleClass);
        }
        for (let obj of sizeNames) {
            this.setNodeAttr(d.id, obj[0], obj[1]);
        }
        this.links.attr("stroke-opacity", 0.6);
    }

    // Called by force simulation, sets x and y values for nodes and edges
    ticked(d) {
        this.links
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        this.nodes
            .filter(function(d) { return this instanceof SVGCircleElement || this instanceof SVGEllipseElement; })
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });
        this.nodes
            .filter(function(d) { return this instanceof SVGRectElement; })
            .attr('x', function(d) { return d.x-5; }) // TODO: dynamic
            .attr('y', function(d) { return d.y-5; }); // TODO: dynamic
    }

    dragStart(d) {
        d3.event.sourceEvent.stopPropagation();
        if (!d3.event.active)
            this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(d, i) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    dragEnd(d) {
        if (!d3.event.active)
            this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}
