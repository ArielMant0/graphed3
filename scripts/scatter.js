/**
 * Class representing a scatter plot (temporary solution) (VIEW)
 */
class ScatterPlot extends Layout {

    constructor(svg, data, runID, settings) {
        super(svg, data, runID, settings);
        this._className = 'scatter';
        this.nodeShape = 'circle';

        // TODO?
        this.defaultSettings();
    }

    // Set default settings (x and y axis and scale)
    defaultSettings() {
        this.calculateDomain();
        this.margin = {top: 20, right: 20, bottom: 40, left: 40};
        
        this.maxX = this._width-this.margin.right-this.margin.left;
        this.maxY = this._height-this.margin.top-this.margin.bottom;

        this.xScale = d3.scaleLinear()
            .range([0, this.maxX])
            .domain([0, this.maxX]);
        this.yScale = d3.scaleLinear()
            .range([this.maxY,0])
            .domain([0, this.maxY]);

        this.xAxis = d3.axisBottom()
            .scale(this.xScale);
        this.yAxis = d3.axisLeft()
            .scale(this.yScale);
    }

    // Draw initial layout (should only be called once)
    draw() {
        this._svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + this.margin.left + ',' + (this._height-this.margin.top) + ")")
            .call(this.xAxis)
            .append("text")
                .attr("class", this._className+" label")
                .attr("x", this.maxX)
                .attr("y", -6)
                .style("text-anchor", "end")
                .text("X Values");

        this._svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.bottom + ")")
            .call(this.yAxis)
            .append("text")
                .attr("class", this._className+" label")
                .attr("transform", "rotate(90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Y Values");

        this.groupNodes = this._svg.append('g');
        for (let d of this._data.nodes) {
            d.x = Math.random()*this.maxX;
            d.y = Math.random()*this.maxY;
        }

        this.update();
    }

    // Update layout visualization given data in this._data
    update() {
        this.calculateDomain();

        let color = d3.scaleLinear()
            .domain([this.minDomain, this.maxDomain])
            .range(['darkorange', 'darkred']);

        let fx = this.xScale;
        let fy = this.yScale;

        this.nodes = this.groupNodes.selectAll(this.nodeShape+'.'+this.nodeClass);
        this.nodes = this.nodes.data(this._data.nodes);
        this.nodes.exit().remove();
        this.nodes.enter()
            .append(this.nodeShape)
                .attr("transform", "translate(" + this.margin.left + ',' + this.margin.bottom + ")")
                .attr('class', this._runID+' '+this._className+' '+this.nodeClass)
                .attr("r", 5)
                .attr("cx", function(d) { return fx(d.x); })
                .attr("cy", function(d) { return fy(d.y); })
                .style("fill", function(d) { return color(d.value); })
                .on('mouseover', this.mouseOver.bind(this))
                .on('mouseout', this.mouseOut.bind(this))
            .merge(this.nodes);
    }

    addNode(id, value=1, label="no label", className=undefined) {
        this._data.pushNode({ "id": id,
                              "value": value,
                              "label": label,
                              "x": Math.random()*this.maxX,
                              "y": Math.random()*this.maxY });
    }

    ///////////////////////////////////////////////////////////////////////////
    // Callbacks
    ///////////////////////////////////////////////////////////////////////////

    // Append a text element containing a node's label on hover
    mouseOver(d,i) {
        let fx = this.xScale;
        let fy = this.yScale;
        this.groupNodes.append('text')
            .attr("transform", "translate(" + this.margin.left + ',' + this.margin.bottom + ")")
            .attr('id', "t" + Math.floor(d.x) + "-" + Math.floor(d.y) + "-" + i)
            .attr('x', function() { return fx(d.x)-15; })
            .attr('y', function() { return fy(d.y)-15; })
            .text(d.label);
    }

    // Remove the text element containing a node's label
    mouseOut(d,i) {
        d3.select("#t" + Math.floor(d.x) + "-" + Math.floor(d.y) + "-" + i).remove();
    }


    ///////////////////////////////////////////////////////////////////////////
    // Utility
    ///////////////////////////////////////////////////////////////////////////

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
}