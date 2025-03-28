let allData = [];
let currentOverviewData = [];
let currentMode = "overview";
let clickTimeout = null; // Timeout for single-click detection.

const svg = d3.select("#spiralViz")
    .attr("width", 600)
    .attr("height", 600)
    .call(d3.zoom().on("zoom", (event) => {
        svg.selectAll("g.spiralLayer").attr("transform", event.transform);
    }));

const width = +svg.attr("width");
const height = +svg.attr("height");
const centerX = width / 2;
const centerY = height / 2;

// Spiral parameters.
const totalRevolutions = 5;
const spiralGrowth = 5;

let spiralLayer = svg.append("g")
    .attr("class", "spiralLayer")
    .attr("transform", `translate(${centerX}, ${centerY})`);

const tooltip = d3.select("#tooltip");

// Back button.
const backButton = d3.select("#backButton");

/**
 * @param {number} a - Base radius (e.g., 0).
 * @param {number} b - Spiral growth rate.
 * @param {number} startAngle - Starting angle (radians).
 * @param {number} endAngle - Ending angle (radians).
 * @param {number} thickness - Ring thickness.
 * @param {number} steps - Number of sample points.
 * @returns {string} - SVG path data.
 */
function createSpiralSegment(a, b, startAngle, endAngle, thickness, steps = 20) {
    const insidePoints = [];
    const outsidePoints = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const r = a + b * angle;
        insidePoints.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }
    for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const r = (a + b * angle) + thickness;
        outsidePoints.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }
    const allPoints = insidePoints.concat(outsidePoints);
    return d3.line().curve(d3.curveLinearClosed)(allPoints);
}


//Adds a color legend
function addColorLegend() {
    svg.selectAll("g.legend").remove();
    svg.selectAll("defs#legendGradient").remove();

    const legendX = 50, legendY = 50, legendWidth = 120, legendHeight = 10, legendMargin = 5;
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");
    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", "green");
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", "red");

    const legendG = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);
    legendG.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");
    const legendScale = d3.scaleLinear().domain([0, 10]).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5);
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
 * Single-click on an arc reorders the data and redraws the spiral.
 * Double-click switches to detail view for that arc’s person.
 */
function drawOverview(dataSubset) {
    currentMode = "overview";
    currentOverviewData = dataSubset;  // Save current ordering.
    spiralLayer.selectAll("*").remove();
    addColorLegend();

    const overallRenderTime = 1000;   // Total animation time
    const transitionDuration = 100;  // Transition duration per arc

    const displayData = dataSubset;
    const numPoints = displayData.length;
    const totalAngle = 2 * Math.PI * totalRevolutions;
    const angleStep = totalAngle / numPoints;

    const perArcDelay = numPoints > 1 ? (overallRenderTime - transitionDuration) / (numPoints - 1) : 0;

    const colorScale = d3.scaleLinear().domain([0, 10]).range(["green", "red"]);
    const thicknessScale = d3.scalePow().exponent(0.5).domain([0, 12]).range([2, 30]);

    displayData.forEach((d, i) => {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const thickness = thicknessScale(d.sleep);
        const pathData = createSpiralSegment(0, spiralGrowth, startAngle, endAngle, thickness, 20);

        spiralLayer.append("path")
            .datum(d)
            .attr("class", "arc")
            .attr("d", pathData)
            .attr("fill", colorScale(d.stress))
            .attr("data-index", i)
            .attr("data-midAngle", (startAngle + endAngle) / 2)
            .attr("opacity", 0)
            .transition()
            .duration(transitionDuration)
            .delay(i * perArcDelay)
            .attr("opacity", 1);
    });

    spiralLayer.selectAll("path.arc")
        .on("click", function (event, d) {
            if (clickTimeout) return;
            clickTimeout = setTimeout(() => {
                const clickedIndex = +d3.select(this).attr("data-index");
                currentOverviewData = currentOverviewData.slice(clickedIndex)
                    .concat(currentOverviewData.slice(0, clickedIndex));
                drawOverview(currentOverviewData);
                clickTimeout = null;
            }, 300);
        })
        .on("dblclick", function (event, d) {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }
            event.stopPropagation();
            const personId = d.person;
            const personData = allData.filter(item => item.person === personId);
            drawDetail(personData);
        })
        .on("mouseover", function (event, d) {
            tooltip.style("display", "block")
                .html(`
                        <strong>Person ID:</strong> ${d.person}<br>
                        <strong>Age:</strong> ${d.age}<br>
                        <strong> Occupation:</strong> ${d.occupation}<br>
                        <strong>Day:</strong> ${d.day}<br>
                       <strong>Sleep Duration:</strong> ${d.sleep}h<br>
                       <strong>Sleep Quality:</strong> ${d.quality}<br>
                       <strong>Stress Level:</strong> ${d.stress}<br>
                       <strong>Activity:</strong> ${d.activity} min<br>
                       <strong>Steps:</strong> ${d.steps}<br>
                       <strong>Disorder:</strong> ${d.disorder}`);
        })
        .on("mousemove", function (event, d) {
            tooltip.style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
        });

    backButton.style("display", "none");
    d3.select("#personInfo").html("");
}

function drawDetail(personData) {
    currentMode = "detail";
    spiralLayer.selectAll("*").remove();
    addColorLegend();

    const numPoints = personData.length;
    const totalAngle = 2 * Math.PI * totalRevolutions;
    const angleStep = totalAngle / numPoints;

    const colorScale = d3.scaleLinear().domain([0, 10]).range(["green", "red"]);
    const thicknessScale = d3.scalePow().exponent(0.5).domain([0, 12]).range([2, 30]);

    personData.forEach((d, i) => {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const thickness = thicknessScale(d.sleep);
        const pathData = createSpiralSegment(0, spiralGrowth, startAngle, endAngle, thickness, 20);
        spiralLayer.append("path")
            .datum(d)
            .attr("class", "arc")
            .attr("d", pathData)
            .attr("fill", colorScale(d.stress))
            .attr("opacity", 0)
            .transition()
            .duration(500)
            .delay(i * 20)
            .attr("opacity", 1);
    });

    // Attach hover events for detail view.
    spiralLayer.selectAll("path.arc")
        .on("mouseover", function (event, d) {
            tooltip.style("display", "block")
                .html(`<strong>Day:</strong> ${d.day}<br>
                       <strong>Sleep Duration:</strong> ${d.sleep}h<br>
                       <strong>Sleep Quality:</strong> ${d.quality}<br>
                       <strong>Stress Level:</strong> ${d.stress}<br>
                       <strong>Activity:</strong> ${d.activity} min<br>
                       <strong>Steps:</strong> ${d.steps}<br>
                       <strong>Disorder:</strong> ${d.disorder}`);
        })
        .on("mousemove", function (event, d) {
            tooltip.style("top", (event.pageY + 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
        });

    // Update person info panel.
    if (personData.length > 0) {
        const info = personData[0];
        d3.select("#personInfo").html(`<h2>Detail View - Person ${info.person}</h2>
            <p><strong>Age:</strong> ${info.age} | <strong>Occupation:</strong> ${info.occupation} | <strong>Gender:</strong> ${info.gender}</p>`);
    }

    backButton.style("display", "block");
}

function updatePersonDropdown(filteredData) {
    const dropdown = d3.select("#personFilter");
    dropdown.html("");
    dropdown.append("option").attr("value", "all").text("All");
    const persons = Array.from(new Set(filteredData.map(d => d.person)));
    persons.forEach(p => {
        dropdown.append("option").attr("value", p).text(p);
    });
}

// When the Group By dropdown changes, update the Person dropdown and overview.
d3.select("#groupFilter").on("change", function () {
    const groupValue = d3.select(this).property("value");
    let filteredData;
    if (groupValue === "all") {
        filteredData = allData;
    } else {
        filteredData = allData.filter(d => d.occupation === groupValue);
    }
    updatePersonDropdown(filteredData);
    drawOverview(filteredData);
});

// When the Person dropdown changes, update the overview accordingly.
d3.select("#personFilter").on("change", function () {
    const personValue = d3.select(this).property("value");
    let filteredData;
    const groupValue = d3.select("#groupFilter").property("value");
    if (groupValue === "all") {
        filteredData = allData;
    } else {
        filteredData = allData.filter(d => d.occupation === groupValue);
    }
    if (personValue !== "all") {
        filteredData = filteredData.filter(d => d.person === personValue);
    }
    drawOverview(filteredData);
});

// Back button returns to the overview view.
backButton.on("click", function () {
    const groupValue = d3.select("#groupFilter").property("value");
    let filteredData;
    if (groupValue === "all") {
        filteredData = allData;
    } else {
        filteredData = allData.filter(d => d.occupation === groupValue);
    }
    d3.select("#personFilter").property("value", "all");
    drawOverview(filteredData);
});

// Load the CSV data and initialize the visualization.
d3.csv("data.csv").then(data => {
    allData = data.map(d => ({
        person: d["Person ID"],
        day: +d["Day"],
        sleep: +d["Sleep Duration"],
        quality: +d["Quality of Sleep"],
        stress: +d["Stress Level"],
        activity: +d["Physical Activity Level"],
        steps: +d["Daily Steps"],
        disorder: d["Sleep Disorder"],
        age: d["Age"],
        occupation: d["Occupation"],
        gender: d["Gender"]
    }));
    // Populate the Group By dropdown
    const groupDropdown = d3.select("#groupFilter");
    groupDropdown.html("");
    groupDropdown.append("option").attr("value", "all").text("All");
    const occupations = Array.from(new Set(allData.map(d => d.occupation)));
    occupations.forEach(occ => {
        groupDropdown.append("option").attr("value", occ).text(occ);
    });
    // show the overview using all data.
    drawOverview(allData);
    updatePersonDropdown(allData);
});
