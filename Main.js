const svg = d3.select("#spiralViz")
    .attr("width", 800)
    .attr("height", 800);

const width = +svg.attr("width");
const height = +svg.attr("height");
const centerX = width / 2;
const centerY = height / 2;
const radiusStep = 4;
const angleStep = 0.25;

let rawData = [];
let occupations = new Set();

function drawSpiral(data) {
    svg.selectAll("circle").remove();

    const colorScale = d3.scaleLinear()
        .domain([0, 10])
        .range(["green", "red"]);

    const sizeScale = d3.scaleLinear()
        .domain([0, 10])
        .range([2, 10]);

    data.forEach((d, i) => {
        const angle = i * angleStep;
        const radius = i * radiusStep / (2 * Math.PI);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        svg.append("circle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", sizeScale(+d.SleepDuration || 0))
            .attr("fill", colorScale(+d.StressLevel || 0))
            .append("title")
            .text(`Age: ${d.Age}, Occupation: ${d.Occupation}, Stress: ${d.StressLevel}, Sleep: ${d.SleepDuration}h, Activity: ${d.PhysicalActivityLevel}min`);
    });
}

function applyFilters() {
    const selectedOccupation = document.getElementById("occupationFilter").value;
    const gender = document.getElementById("genderFilter").value;
    const ageMin = +document.getElementById("ageMin").value || 0;
    const ageMax = +document.getElementById("ageMax").value || 120;
    const stressMin = +document.getElementById("stressMin").value || 0;
    const stressMax = +document.getElementById("stressMax").value || 10;
    const activityMin = +document.getElementById("activityMin").value || 0;
    const activityMax = +document.getElementById("activityMax").value || 500;

    const filtered = rawData.filter(d => {
        return (selectedOccupation === "All" || d.Occupation === selectedOccupation) &&
            (gender === "All" || d.Gender === gender) &&
            (+d.Age >= ageMin && +d.Age <= ageMax) &&
            (+d.StressLevel >= stressMin && +d.StressLevel <= stressMax) &&
            (+d.PhysicalActivityLevel >= activityMin && +d.PhysicalActivityLevel <= activityMax);
    });

    drawSpiral(filtered);
}

function populateOccupationFilter() {
    const filter = document.getElementById("occupationFilter");
    filter.innerHTML = '<option value="All">All</option>';
    occupations.forEach(occ => {
        const opt = document.createElement("option");
        opt.value = occ;
        opt.textContent = occ;
        filter.appendChild(opt);
    });
}

d3.csv("Sleep_health_and_lifestyle_dataset.csv").then(data => {
    rawData = data;
    data.forEach(d => occupations.add(d.Occupation));
    populateOccupationFilter();
    drawSpiral(data);
});

document.getElementById("applyFilters").addEventListener("click", applyFilters);
