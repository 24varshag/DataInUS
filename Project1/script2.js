// Load CSV file
d3.csv("data/cleaned_data.csv").then((data) => {
  data.forEach((d) => {
    d.poverty_perc = +d.poverty_perc; // Convert to number
    d.percent_coronary_heart_disease = +d.percent_coronary_heart_disease;
  });

  // Set dimensions
  const width = 500,
    height = 300,
    margin = { top: 20, right: 20, bottom: 40, left: 50 };

  // Histogram for Poverty Rate
  createHistogram(data, "poverty_perc", "#histogram1", "Poverty Rate (%)");

  // Histogram for Coronary Heart Disease Rate
  createHistogram(
    data,
    "percent_coronary_heart_disease",
    "#histogram2",
    "Heart Disease (%)"
  );

  // Scatterplot: Poverty Rate vs. Coronary Heart Disease
  createScatterplot(
    data,
    "poverty_perc",
    "percent_coronary_heart_disease",
    "#scatterplot"
  );
});

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
    .attr("fill", "steelblue");

  svg.append("g").attr("transform", "translate(0,250)").call(d3.axisBottom(x));

  svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("x", 250)
    .attr("y", 290)
    .attr("text-anchor", "middle")
    .text(xLabel);
}

// Function to create a scatterplot
function createScatterplot(data, xCol, yCol, svgId) {
  const svg = d3.select(svgId).attr("width", 500).attr("height", 300);

  const x = d3
    .scaleLinear()
    .domain([d3.min(data, (d) => d[xCol]), d3.max(data, (d) => d[xCol])])
    .range([50, 450]);

  const y = d3
    .scaleLinear()
    .domain([d3.min(data, (d) => d[yCol]), d3.max(data, (d) => d[yCol])])
    .range([250, 50]);

  svg
    .selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d[xCol]))
    .attr("cy", (d) => y(d[yCol]))
    .attr("r", 5)
    .attr("fill", "red");

  svg.append("g").attr("transform", "translate(0,250)").call(d3.axisBottom(x));

  svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(y));

  svg
    .append("text")
    .attr("x", 250)
    .attr("y", 290)
    .attr("text-anchor", "middle")
    .text("Poverty Rate (%)");

  svg
    .append("text")
    .attr("x", -150)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Heart Disease (%)");
}
