const tooltip = d3.select("#tooltip");
let selectedCounties = new Set();
let currentHealthMetric = "percent_coronary_heart_disease";

const healthMetricLabels = {
  percent_high_cholesterol: "High Cholesterol",
  percent_high_blood_pressure: "High Blood Pressure",
  percent_stroke: "Stroke",
  percent_coronary_heart_disease: "Heart Disease",
};

// Function to update the stats boxes on the right
function updateStats(data) {
  const numCounties = data.length;
  const avgPoverty = d3.mean(data, (d) => d.poverty_perc);
  const avgHealth = d3.mean(data, (d) => d[currentHealthMetric]);

  d3.select("#num-counties").text(numCounties);
  d3.select("#avg-poverty").text(
    avgPoverty ? avgPoverty.toFixed(2) + "%" : "N/A"
  );
  d3.select("#avg-health").text(avgHealth ? avgHealth.toFixed(2) + "%" : "N/A");
}

Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json"),
  d3.csv("data/national_health_data_2024.csv"),
]).then(([us, data]) => {
  data.forEach((d) => {
    d.poverty_perc = +d.poverty_perc;
    d.percent_coronary_heart_disease = +d.percent_coronary_heart_disease;
    d.percent_high_cholesterol = +d.percent_high_cholesterol;
    d.percent_high_blood_pressure = +d.percent_high_blood_pressure;
    d.percent_stroke = +d.percent_stroke;
  });

  // Initial histogram plots
  createHistogram(data, "poverty_perc", "#histogram1", "Poverty Rate (%)");
  createHistogram(
    data,
    "percent_coronary_heart_disease",
    "#histogram2",
    "Heart Disease (%)"
  );
  createScatterplot(
    data,
    "poverty_perc",
    "percent_coronary_heart_disease",
    "#scatterplot"
  );

  // map data
  const counties = topojson.feature(us, us.objects.counties).features;
  counties.forEach((county) => {
    const countyData = data.find((d) => d.cnty_fips === county.id);
    if (countyData) county.properties = countyData;
  });

  // creating map and getting update function
  const { updateMap } = createChoroplethMap(counties);

  // Initial stats update
  updateStats(data);

  // Scatterplot toggle handler
  d3.select("#scatter-toggle").on("change", function () {
    const selectedValue = this.value;
    currentHealthMetric = selectedValue;

    let yColumn, histogramColumn, histogramLabel;

    switch (selectedValue) {
      case "percent_high_cholesterol":
        yColumn = "percent_high_cholesterol";
        histogramColumn = "percent_high_cholesterol";
        histogramLabel = "High Cholesterol (%)";
        break;
      case "percent_high_blood_pressure":
        yColumn = "percent_high_blood_pressure";
        histogramColumn = "percent_high_blood_pressure";
        histogramLabel = "High Blood Pressure (%)";
        break;
      case "percent_stroke":
        yColumn = "percent_stroke";
        histogramColumn = "percent_stroke";
        histogramLabel = "Stroke Rate (%)";
        break;
      default:
        yColumn = "percent_coronary_heart_disease";
        histogramColumn = "percent_coronary_heart_disease";
        histogramLabel = "Heart Disease (%)";
    }

    d3.select("#scatterplot").selectAll("*").remove();
    createScatterplot(data, "poverty_perc", yColumn, "#scatterplot");

    d3.select("#histogram1").selectAll("*").remove();
    createHistogram(data, histogramColumn, "#histogram1", "Poverty Rate (%");

    d3.select("#histogram2").selectAll("*").remove();
    createHistogram(data, histogramColumn, "#histogram2", histogramLabel);
    d3
      .select("#histogram2")
      .node()
      .parentNode.querySelector(
        "h3"
      ).textContent = `${healthMetricLabels[selectedValue]} Distribution`;

    // Updates the health stat box label based on the selected toggle
    d3.select("#health-stat-box").html(
      `<h3>Average ${healthMetricLabels[currentHealthMetric]} Rate </h3><p id="avg-health"></p>`
    );

    // Update stats based on selected counties
    const currentData = selectedCounties.size
      ? data.filter((d) => selectedCounties.has(d.display_name))
      : data;
    updateStats(currentData);

    updateMap(selectedValue);
  });

  // clear button func
  d3.select("#clear-selection").on("click", () => {
    selectedCounties.clear();
    updateVisualizations(data);
    updateStats(data); // Update stats to show full dataset
    updateMap("percent_coronary_heart_disease");
    d3
      .select("#histogram2")
      .node()
      .parentNode.querySelector(
        "h3"
      ).textContent = `Heart Disease Distribution`;
  });
});

document.getElementById("about").addEventListener("click", function () {
  document.getElementById("about-popup").style.display = "flex";
});

document.getElementById("close-popup").addEventListener("click", function () {
  document.getElementById("about-popup").style.display = "none";
});

// Creates choroplet map
function createChoroplethMap(counties) {
  const width = 700,
    height = 300,
    legendWidth = 300, // Make legend wider for readability
    legendHeight = 15;

  const svg = d3
    .select("#map")
    .attr("width", width)
    .attr("height", height + 60);

  const projection = d3
    .geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(width);

  const path = d3.geoPath().projection(projection);

  function updateMap(attribute) {
    const values = counties
      .map((d) => d.properties[attribute])
      .filter((v) => v !== undefined);
    const extent = d3.extent(values);

    const colorScale = d3
      .scaleLinear()
      .domain(extent)
      .range(["#00B4D8", "#FFA500"]); // Vibrant blue to strong orange to provide contrast with counties

    svg
      .selectAll(".county")
      .data(counties)
      .join("path")
      .attr("class", "county")
      .attr("d", path)
      .transition()
      .duration(500)
      .attr("fill", (d) => {
        const value = d.properties[attribute];
        return value ? colorScale(value) : "#ccc";
      });

    updateLegend(extent, colorScale);

    // Tooltip interactions
    svg
      .selectAll(".county")
      .data(counties)
      .join("path")
      .attr("class", "county")
      .attr("d", path)
      .attr("fill", (d) => colorScale(d.properties.poverty_perc))
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1).html(`
        <strong>${d.properties.display_name}</strong><br>
        Poverty Rate: ${d.properties.poverty_perc}%<br>
        Median Income: $${d.properties.median_household_income}<br>
        Urban/Rural: ${d.properties.urban_rural_status}<br>
        High Blood Pressure: ${d.properties.percent_high_blood_pressure}%<br>
        Heart Disease: ${d.properties.percent_coronary_heart_disease}%<br>
        Stroke Rate: ${d.properties.percent_stroke}%<br>
        High Cholesterol: ${d.properties.percent_high_cholesterol}%
      `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));
  }

  function updateLegend(extent, colorScale) {
    const legendScale = d3.scaleLinear().domain(extent).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5);

    // Clear previous legend if any
    svg.selectAll(".legend-container").remove();

    const legendGroup = svg
      .append("g")
      .attr("class", "legend-container")
      .attr(
        "transform",
        `translate(${(width - legendWidth) / 2}, ${height + 20})`
      ); // Centered at bottom

    const defs = svg.append("defs");

    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("x2", "100%");

    linearGradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorScale(extent[0]));

    linearGradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorScale(extent[1]));

    legendGroup
      .append("rect")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    legendGroup
      .append("g")
      .attr("class", "legend-axis")
      .attr("transform", `translate(0, ${legendHeight})`)
      .call(legendAxis);
  }

  updateMap("poverty_perc");
  return { updateMap };
}

// Function to create a histogram
function createHistogram(data, column, svgId, xLabel) {
  const svg = d3.select(svgId).attr("width", 500).attr("height", 300);

  const x = d3
    .scaleLinear()
    .domain([d3.min(data, (d) => d[column]), d3.max(data, (d) => d[column])])
    .range([50, 450]);

  const bins = d3.bin().domain(x.domain()).thresholds(10)(
    data.map((d) => d[column])
  );

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (d) => d.length)])
    .range([250, 50]);

  svg
    .selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", (d) => x(d.x0))
    .attr("y", (d) => y(d.length))
    .attr("width", (d) => x(d.x1) - x(d.x0) - 2)
    .attr("height", (d) => 250 - y(d.length))
    .attr("fill", "#48CAE4")
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `Range: ${d.x0.toFixed(2)} - ${d.x1.toFixed(2)}<br>Count: ${d.length}`
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // In createHistogram function:
  svg
    .append("g")
    .attr("transform", "translate(0,250)")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", "rgba(255, 255, 255, 0.844)")
    .style("font-size", "14px");

  svg
    .append("g")
    .attr("transform", "translate(50,0)")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "rgba(255, 255, 255, 0.844)")
    .style("font-size", "14px");

  svg
    .append("text")
    .attr("x", 250)
    .attr("y", 290)
    .attr("text-anchor", "middle")
    .style("fill", "rgba(255, 255, 255, 0.844)")
    .style("font-size", "14px")
    .text(xLabel);
}
// Function to update visualizations
function updateVisualizations(filteredData) {
  d3.select("#histogram1").selectAll("*").remove();
  d3.select("#histogram2").selectAll("*").remove();
  d3.select("#scatterplot").selectAll("*").remove();

  createHistogram(
    filteredData,
    "poverty_perc",
    "#histogram1",
    "Poverty Rate (%)"
  );
  createHistogram(
    filteredData,
    "percent_coronary_heart_disease",
    "#histogram2",
    "Heart Disease (%)"
  );
  createScatterplot(
    filteredData,
    "poverty_perc",
    "percent_coronary_heart_disease",
    "#scatterplot"
  );

  // Update stats based on filtered data
  updateStats(filteredData);
}

// Function to create a scatterplot
function createScatterplot(data, xCol, yCol, svgId) {
  const svg = d3.select(svgId).attr("width", 800).attr("height", 300);

  const colorScale = {
    Urban: "#CAF0F8",
    "Small City": "#48CAE4",
    Rural: "#f08080",
    Suburban: "#ffdd32",
  };

  const x = d3
    .scaleLinear()
    .domain([d3.min(data, (d) => d[xCol]), d3.max(data, (d) => d[xCol])])
    .range([50, 550]);

  const y = d3
    .scaleLinear()
    .domain([d3.min(data, (d) => d[yCol]), d3.max(data, (d) => d[yCol])])
    .range([250, 50]);

  const brush = d3
    .brush()
    .extent([
      [50, 50],
      [750, 250],
    ])
    .on("end", function ({ selection }) {
      if (!selection) return;
      const [[x0, y0], [x1, y1]] = selection;
      selectedCounties.clear();
      data.forEach((d) => {
        if (
          x(d[xCol]) >= x0 &&
          x(d[xCol]) <= x1 &&
          y(d[yCol]) >= y0 &&
          y(d[yCol]) <= y1
        ) {
          selectedCounties.add(d.display_name);
        }
      });
      const filteredData = data.filter((d) =>
        selectedCounties.has(d.display_name)
      );
      updateVisualizations(filteredData);
      updateStats(filteredData);
    });

  svg.append("g").attr("class", "brush").call(brush);

  svg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d[xCol]))
    .attr("cy", (d) => y(d[yCol]))
    .attr("r", 5)
    .attr("fill", (d) => colorScale[d.urban_rural_status] || "gray")
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `
            <strong>${d.display_name}</strong><br>
            ${xCol}: ${d[xCol]}<br>
            ${yCol}: ${d[yCol]}<br>
            Status: ${d.urban_rural_status}
          `
        )
        .style("left", event.pageX + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // Add legend group
  const legend = svg.append("g").attr("transform", "translate(500,20)");

  // Add legend background
  const legendWidth = 140;
  const legendHeight = Object.keys(colorScale).length * 20 + 10;

  legend
    .append("rect")
    .attr("x", 80)
    .attr("y", -10)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "#caf0f869")
    .attr("rx", 8)
    .attr("ry", 8);

  // Add legend items
  Object.entries(colorScale).forEach(([status, color], i) => {
    legend
      .append("circle")
      .attr("cx", 100)
      .attr("cy", i * 20)
      .attr("r", 5)
      .attr("fill", color);

    legend
      .append("text")
      .attr("x", 110)
      .attr("y", i * 20 + 5)
      .text(status)
      .style("font-size", "14px")
      .attr("fill", "white")
      .attr("alignment-baseline", "middle");
  });

  svg
    .append("g")
    .attr("transform", "translate(0,250)")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("fill", "rgba(255, 255, 255, 0.844)")
    .style("font-size", "14px");

  svg
    .append("g")
    .attr("transform", "translate(50,0)")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("fill", "rgba(255, 255, 255, 0.844)")
    .style("font-size", "14px");
  svg
    .append("text")
    .attr("x", 250)
    .attr("y", 290)
    .style("fill", "rgba(255, 255, 255, 0.844)")
    .style("font-size", "14px")
    .text("Poverty Rate (%)");

  // Y-axis label
  svg
    .append("text")
    .attr("x", -150)
    .attr("y", 20)
    .style("fill", "rgba(255, 255, 255, 0.844)")
    .style("font-size", "14px")
    .text("Heart Disease (%)");
}
