let disasterData;

function loadPage(chartType) {
  d3.csv('data/disasters_cleaned.csv').then(data => {
    disasterData = data;
    disasterData.forEach(d => {
      d.Year = +d.Year;
      d.Total_Deaths = +d.Total_Deaths;
      d.Total_Affected = +d.Total_Affected;
      d.Total_Damages_USD = +d.Total_Damages_USD;
    });

    setupFilters();
    updateVisualizations(chartType);
  });
}

function setupFilters() {
  const yearSet = [...new Set(disasterData.map(d => d.Year))];
  const typeSet = [...new Set(disasterData.map(d => d.Disaster_Type))];

  yearSet.forEach(year => {
    const option = document.createElement('option');
    option.value = option.text = year;
    document.getElementById('yearFilter').appendChild(option);
  });

  typeSet.forEach(type => {
    const option = document.createElement('option');
    option.value = option.text = type;
    document.getElementById('disasterFilter').appendChild(option);
  });

  document.getElementById('yearFilter').addEventListener('change', () => {
    const page = detectPage();
    updateVisualizations(page);
  });

  document.getElementById('disasterFilter').addEventListener('change', () => {
    const page = detectPage();
    updateVisualizations(page);
  });
}

function detectPage() {
  const page = window.location.pathname.split('/').pop();
  if (page.includes('map')) return 'map';
  if (page.includes('sunburst')) return 'sunburst';
  if (page.includes('bubble')) return 'bubble';
  return 'home';
}

function getFilteredData() {
  const year = document.getElementById('yearFilter').value;
  const type = document.getElementById('disasterFilter').value;
  return disasterData.filter(d => 
    (year === 'all' || d.Year == year) && 
    (type === 'all' || d.Disaster_Type == type)
  );
}

function updateVisualizations(chartType) {
  const filteredData = getFilteredData();
  if (chartType === 'map') drawMap(filteredData);
  if (chartType === 'sunburst') drawSunburst(filteredData);
  if (chartType === 'bubble') drawBubblePack(filteredData);
}

// -------------------
// Draw Map Chart
function drawMap(filteredData) {
  d3.select('#mapChart').html('');
  const width = document.getElementById('mapChart').clientWidth;
  const height = 600;
  const svg = d3.select('#mapChart').append('svg')
    .attr('width', width)
    .attr('height', height);

  d3.json('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson').then(geoData => {
    const projection = d3.geoNaturalEarth1().scale(width/1.3/Math.PI).translate([width/2, height/2]);
    const path = d3.geoPath().projection(projection);
    const colorScale = d3.scaleSequential().domain([0, d3.max(filteredData, d => d.Total_Deaths)]).interpolator(d3.interpolateReds);
    const deaths = d3.rollup(filteredData, v => d3.sum(v, d => d.Total_Deaths), d => d.Country);

    svg.append('g').selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => colorScale(deaths.get(d.properties.name) || 0))
      .attr('stroke', '#ccc')
      .on('mouseover', (event, d) => {
        d3.select(event.target).attr('stroke-width', 2).attr('stroke', '#333');
        showTooltip(event.pageX, event.pageY, `${d.properties.name}<br/>Deaths: ${deaths.get(d.properties.name) || 0}`);
      })
      .on('mousemove', event => moveTooltip(event.pageX, event.pageY))
      .on('mouseout', event => {
        d3.select(event.target).attr('stroke-width', 1).attr('stroke', '#ccc');
        hideTooltip();
      });
  });
}

// -------------------
// Draw Sunburst Chart
function drawSunburst(filteredData) {
  d3.select('#sunburstChart').html('');
  const width = document.getElementById('sunburstChart').clientWidth;
  const height = 500;
  const radius = Math.min(width, height) / 2;
  const svg = d3.select('#sunburstChart').append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

  const root = d3.hierarchy({children: Array.from(d3.group(filteredData, d => d.Disaster_Type), ([k,v]) => ({name: k, children: v}))})
    .sum(d => d.Total_Deaths)
    .sort((a, b) => b.value - a.value);

  d3.partition().size([2 * Math.PI, radius])(root);
  const arc = d3.arc().startAngle(d => d.x0).endAngle(d => d.x1).innerRadius(d => d.y0).outerRadius(d => d.y1);
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, root.children.length + 1));

  svg.selectAll('path')
    .data(root.descendants().filter(d => d.depth))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.name))
    .attr('stroke', '#fff')
    .on('mouseover', (event, d) => showTooltip(event.pageX, event.pageY, `${d.data.name}<br/>Deaths: ${Math.round(d.value)}`))
    .on('mousemove', event => moveTooltip(event.pageX, event.pageY))
    .on('mouseout', hideTooltip);
}

// -------------------
// Draw Bubble Pack Chart
function drawBubblePack(filteredData) {
  d3.select('#bubbleChart').html('');
  const width = document.getElementById('bubbleChart').clientWidth;
  const height = 500;
  
  const svg = d3.select('#bubbleChart').append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2}, ${height/2})`);

  const root = d3.pack()
    .size([width - 10, height - 10])
    .padding(5)(
      d3.hierarchy({children: filteredData}).sum(d => d.Total_Deaths)
    );

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const nodes = svg.selectAll('g')
    .data(root.leaves())
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x - width/2}, ${d.y - height/2})`);

  nodes.append('circle')
    .attr('r', d => d.r)
    .style('fill', d => color(d.data.Disaster_Type))
    .style('opacity', 0.8)
    .attr('stroke', '#000')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', d.r * 1.08);

      d3.select(this.parentNode).select('text')
        .transition()
        .duration(200)
        .style('font-size', Math.min(d.r / 1.8, 18) + 'px');

      showTooltip(event.pageX, event.pageY, 
        `${d.data.Disaster_Type}<br/>
         Country: ${d.data.Country}<br/>
         Deaths: ${d.data.Total_Deaths}<br/>
         Damages: ${Math.round(d.data.Total_Damages_USD)}k USD<br/>
         Affected: ${Math.round(d.data.Total_Affected)}`);
    })
    .on('mousemove', event => moveTooltip(event.pageX, event.pageY))
    .on('mouseout', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', d.r);

      d3.select(this.parentNode).select('text')
        .transition()
        .duration(200)
        .style('font-size', Math.min(d.r / 2.5, 14) + 'px');

      hideTooltip();
    });

  nodes.append('text')
    .text(d => d.data.Country.length > 10 ? d.data.Country.slice(0, 10) + '...' : d.data.Country)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .style('fill', 'white')
    .style('pointer-events', 'none')
    .style('font-size', d => Math.min(d.r / 2.5, 14) + 'px')
    .style('font-weight', 'bold')
    .style('transition', 'font-size 0.3s');
}

// -------------------
// Tooltip Functions
const tooltip = d3.select('body').append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0);

function showTooltip(x, y, content) {
  tooltip.style('left', `${x+10}px`).style('top', `${y-20}px`)
    .html(content).transition().duration(200).style('opacity', 0.9);
}

function moveTooltip(x, y) {
  tooltip.style('left', `${x+10}px`).style('top', `${y-20}px`);
}

function hideTooltip() {
  tooltip.transition().duration(200).style('opacity', 0);
}
