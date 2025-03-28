// Select the SVG and set up zoom/pan
const svg = d3.select("#spiralViz")
    .attr("width", 800)
    .attr("height", 800)
    .call(d3.zoom().on("zoom", (event) => {
        svg.selectAll("g.spiralLayer").attr("transform", event.transform);
    }));

// Basic dimensions
const width = +svg.attr("width");
const height = +svg.attr("height");
const centerX = width / 2;
const centerY = height / 2;

const totalRevolutions = 3;

const spiralGrowth = 5;

const spiralLayer = svg.append("g")
    .attr("class", "spiralLayer");

// Tooltip container
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

/**
 * This function returns a path string for a "spiral ring segment"
 * spanning angles [startAngle, endAngle], with the *inner* edge
 * on the spiral r(θ) = a + bθ and a constant thickness.
 *
 * @param {number} a - base radius (set to 0 for a spiral starting at center)
 * @param {number} b - spiral growth rate
 * @param {number} startAngle - beginning of the segment (radians)
 * @param {number} endAngle - end of the segment (radians)
 * @param {number} thickness - thickness of the ring
 * @param {number} steps - number of points to sample along the arc
 * @returns {string} - SVG path data
 */
function createSpiralSegment(a, b, startAngle, endAngle, thickness, steps = 20) {
    const insidePoints = [];
    const outsidePoints = [];

    // Sample from startAngle to endAngle for the inner edge
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const r = a + b * angle;
        insidePoints.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }

    // Sample from endAngle back to startAngle for the outer edge
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const r = (a + b * angle) + thickness;
        outsidePoints.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }

    // Combine inside + outside to form a closed polygon
    const allPoints = insidePoints.concat(outsidePoints);

    // Use d3.line() to generate the path string
    return d3.line()
        .curve(d3.curveLinearClosed)(allPoints);
}

function drawSpiral(data) {
    // Clear any existing arcs
    spiralLayer.selectAll("path.arc").remove();

    // Color scale for Stress [0..10]
    const colorScale = d3.scaleLinear()
        .domain([0, 10])
        .range(["green", "red"]);

    const totalAngle = 2 * Math.PI * totalRevolutions;
    const angleStep = totalAngle / data.length;

    addColorLegend();

    const thicknessScale = d3.scalePow()
        .exponent(0.5)
        .domain([0, 12])
        .range([2, 20]);

    data.forEach((d, i) => {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;

        // Arc thickness depends on the data (sleep duration)
        const thickness = thicknessScale(d.sleep);

        // Create a path for the spiral ring
        const pathData = createSpiralSegment(
            0,
            spiralGrowth,
            startAngle,
            endAngle,
            thickness,
            20
        );

        // Append the spiral ring
        spiralLayer.append("path")
            .attr("class", "arc")
            .attr("transform", `translate(${centerX}, ${centerY})`)
            .attr("d", pathData)
            .attr("fill", colorScale(d.stress))
            .on("mouseover", function () {
                tooltip
                    .style("display", "block")
                    .html(`
            <strong>Day:</strong> ${d.day}<br>
            <strong>Sleep Duration:</strong> ${d.sleep}h<br>
            <strong>Sleep Quality:</strong> ${d.quality}<br>
            <strong>Stress Level:</strong> ${d.stress}<br>
            <strong>Activity:</strong> ${d.activity} min<br>
            <strong>Steps:</strong> ${d.steps}<br>
            <strong>Disorder:</strong> ${d.disorder}
          `);
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("top", (event.pageY + 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("display", "none");
            });
    });
}

//Populate the Person ID dropdown from unique IDs in the data.
function populateDropdown(ids) {
    const dropdown = document.getElementById("personFilter");
    dropdown.innerHTML = ""; // Clear if needed

    ids.forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id;
        dropdown.appendChild(option);
    });
}

// Load CSV data, parse, and initialize the chart
d3.csv("data.csv").then(data => {
    const parsedData = data.map(d => ({
        person: d["Person ID"],
        day: +d["Day"],
        sleep: +d["Sleep Duration"],
        quality: +d["Quality of Sleep"],
        stress: +d["Stress Level"],
        activity: +d["Physical Activity Level"],
        steps: +d["Daily Steps"],
        disorder: d["Sleep Disorder"]
    }));

    // Get unique Person IDs
    const personIDs = Array.from(new Set(parsedData.map(d => d.person)));

    // Populate the dropdown
    populateDropdown(personIDs);

    // Draw the spiral for the first person by default
    drawSpiral(parsedData.filter(d => d.person === personIDs[0]));

    // Redraw spiral whenever a different person is selected
    document.getElementById("personFilter")
        .addEventListener("change", function () {
            const selected = this.value;
            const personData = parsedData.filter(d => d.person === selected);
            drawSpiral(personData);
        });
});


// Adds a color legend 
function addColorLegend() {
    // Clear any existing legend
    svg.selectAll("g.legend").remove();
    svg.selectAll("defs#legendGradient").remove();

    // Dimensions and positioning
    const legendX = 50;
    const legendY = 50;
    const legendWidth = 120;
    const legendHeight = 10;
    const legendMargin = 5;

    const defs = svg.append("defs");

    const linearGradient = defs.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    // Two color stops: green at 0%, red at 100%
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "green");
    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    const legendG = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    //Draw a rect filled by the gradient
    legendG.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");

    //Create a scale
    const legendScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, legendWidth]);

    //Create a bottom axis
    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5);

    //Position the axis just below the gradient rect
    legendG.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    // label
    legendG.append("text")
        .attr("x", 0)
        .attr("y", -legendMargin)
        .style("font-size", "12px")
        .text("Stress Level");
}

