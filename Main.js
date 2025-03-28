// Select the SVG and set up zoom/pan
const svg = d3.select("#spiralViz")
    .attr("width", 600)
    .attr("height", 600)
    .call(d3.zoom().on("zoom", (event) => {
        svg.selectAll("g.spiralLayer").attr("transform", event.transform);
    }));

// Basic dimensions
const width = +svg.attr("width");
const height = +svg.attr("height");
const centerX = width / 2;
const centerY = height / 2;

// How many total "turns" you want in the spiral
const totalRevolutions = 3;

// Controls how quickly radius grows with angle (the 'b' in r(θ)=a+bθ)
const spiralGrowth = 5;

// Create a group that will hold the spiral arcs
const spiralLayer = svg.append("g")
    .attr("class", "spiralLayer");

// Tooltip container
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

/**
 * Creates a path string for a spiral ring segment spanning angles
 * [startAngle, endAngle] where the inner edge follows the spiral r(θ)=a+bθ.
 * @param {number} a - base radius (set to 0 for a spiral starting at the center)
 * @param {number} b - spiral growth rate
 * @param {number} startAngle - starting angle (in radians)
 * @param {number} endAngle - ending angle (in radians)
 * @param {number} thickness - thickness of the ring segment
 * @param {number} steps - number of points to sample along the arc
 * @returns {string} - SVG path data string
 */
function createSpiralSegment(a, b, startAngle, endAngle, thickness, steps = 20) {
    const insidePoints = [];
    const outsidePoints = [];

    // Sample along the inner edge of the spiral
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const r = a + b * angle;
        insidePoints.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }

    // Sample along the outer edge (inner edge plus thickness)
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const r = (a + b * angle) + thickness;
        outsidePoints.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }

    const allPoints = insidePoints.concat(outsidePoints);

    return d3.line()
        .curve(d3.curveLinearClosed)(allPoints);
}

/**
 * Draws the spiral visualization using data.
 */
function drawSpiral(data) {
    // Clear existing arcs
    spiralLayer.selectAll("path.arc").remove();

    // Remove any old legend (if applicable)
    svg.selectAll("g.legend").remove();
    svg.selectAll("defs#legendGradient").remove();

    // Define color scale for stress [0..10]
    const colorScale = d3.scaleLinear()
        .domain([0, 10])
        .range(["green", "red"]);

    // Add the color legend (if you have a legend function defined)
    addColorLegend();

    // Total angle for spiral (in radians)
    const totalAngle = 2 * Math.PI * totalRevolutions;
    const angleStep = totalAngle / data.length;

    // Map sleep duration [0..12] to thickness (you can adjust the range to emphasize differences)
    const thicknessScale = d3.scalePow()
        .exponent(0.5)
        .domain([0, 12])
        .range([2, 30]);

    data.forEach((d, i) => {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const thickness = thicknessScale(d.sleep);

        const pathData = createSpiralSegment(0, spiralGrowth, startAngle, endAngle, thickness, 20);

        spiralLayer.append("path")
            .attr("class", "arc")
            .attr("transform", `translate(${centerX}, ${centerY})`)
            .attr("d", pathData)
            .attr("fill", colorScale(d.stress))
            .on("mouseover", function () {
                tooltip.style("display", "block")
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

/**
 * Adds a horizontal color legend (for stress 0..10) at the bottom-left corner.
 */
function addColorLegend() {
    svg.selectAll("g.legend").remove();
    svg.selectAll("defs#legendGradient").remove();

    const legendX = 50;
    const legendY = 50;
    const legendWidth = 120;
    const legendHeight = 10;
    const legendMargin = 5;

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "green");

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "red");

    const legendG = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    legendG.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");

    const legendScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale)
        .ticks(5);

    legendG.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    legendG.append("text")
        .attr("x", 0)
        .attr("y", -legendMargin)
        .style("font-size", "12px")
        .text("Stress Level");
}

/**
 * Updates the general information panel with details about the selected person.
 * Assumes that all records for the same person share the same general info.
 * @param {Array} personData - Array of records for the selected person.
 */
function updatePersonInfo(personData) {
    if (personData.length > 0) {
        const info = personData[0];
        const infoHTML =
            `<p><strong>Age:</strong> ${info.age} | <strong>Occupation:</strong> ${info.occupation} | <strong>Gender:</strong> ${info.gender}</p>`;
        document.getElementById("personInfo").innerHTML = infoHTML;
    } else {
        document.getElementById("personInfo").innerHTML = "";
    }
}

/**
 * Populates the Person ID dropdown from unique IDs in the data.
 */
function populateDropdown(ids) {
    const dropdown = document.getElementById("personFilter");
    dropdown.innerHTML = ""; // Clear existing options

    ids.forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = id;
        dropdown.appendChild(option);
    });
}

// Load CSV data, parse, and initialize the visualization
d3.csv("data.csv").then(data => {
    const parsedData = data.map(d => ({
        person: d["Person ID"],
        day: +d["Day"],
        sleep: +d["Sleep Duration"],
        quality: +d["Quality of Sleep"],
        stress: +d["Stress Level"],
        activity: +d["Physical Activity Level"],
        steps: +d["Daily Steps"],
        disorder: d["Sleep Disorder"],
        // Additional general info fields:
        age: d["Age"],
        occupation: d["Occupation"],
        gender: d["Gender"]
    }));

    // Get unique Person IDs
    const personIDs = Array.from(new Set(parsedData.map(d => d.person)));

    // Populate the dropdown
    populateDropdown(personIDs);

    // Draw the spiral and update info for the first person by default
    let firstPersonData = parsedData.filter(d => d.person === personIDs[0]);
    drawSpiral(firstPersonData);
    updatePersonInfo(firstPersonData);

    // Redraw spiral and update general info whenever a different person is selected
    document.getElementById("personFilter").addEventListener("change", function () {
        const selected = this.value;
        const personData = parsedData.filter(d => d.person === selected);
        drawSpiral(personData);
        updatePersonInfo(personData);
    });
});
