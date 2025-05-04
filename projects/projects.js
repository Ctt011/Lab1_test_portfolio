import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { fetchJSON, renderProjects } from '../global.js';

let projects = await fetchJSON('../projects.json');
let query = '';
let selectedIndex = -1;

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');
const svg = d3.select('svg');
const legend = d3.select('.legend');

// Initial render
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(getFilteredProjects());

// Handle input search
searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  const filtered = getFilteredProjects();
  renderProjects(filtered, projectsContainer, 'h2');
  renderPieChart(filtered);
});

// Filter by search query
function filterByQuery(projectsList) {
  return projectsList.filter((project) => {
    const values = Object.values(project).join(' ').toLowerCase();
    return values.includes(query.toLowerCase());
  });
}

// Filter by both query and selected year
function getFilteredProjects() {
  const temp = filterByQuery(projects);
  return selectedIndex === -1
    ? temp
    : temp.filter((p) => p.year == getSelectedYear());
}

// Get selected year from pie chart data
function getSelectedYear() {
  const rolled = d3.rollups(projects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));
  return selectedIndex === -1 ? null : data[selectedIndex].label;
}

// Draw pie chart and legend
function renderPieChart(dataProjects) {
  const rolled = d3.rollups(dataProjects, v => v.length, d => d.year);
  const data = rolled.map(([year, count]) => ({ label: year, value: count }));

  const sliceGenerator = d3.pie().value(d => d.value);
  const arcData = sliceGenerator(data);
  const arcGen = d3.arc().innerRadius(0).outerRadius(50);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  svg.selectAll('path').remove();
  legend.html('');

  // Pie wedges
  arcData.forEach((d, i) => {
    svg
      .append('path')
      .attr('d', arcGen(d))
      .attr('fill', colors(i))
      .attr('class', selectedIndex === i ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

        legend.selectAll('li')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

        const filtered = getFilteredProjects();
        renderProjects(filtered, projectsContainer, 'h2');
      });
  });

  // Legend items
  data.forEach((d, i) => {
    legend
      .append('li')
      .attr('style', `--color: ${colors(i)}`)
      .attr('class', selectedIndex === i ? 'selected' : '')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

        legend.selectAll('li')
          .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

        const filtered = getFilteredProjects();
        renderProjects(filtered, projectsContainer, 'h2');
      });
  });
}
