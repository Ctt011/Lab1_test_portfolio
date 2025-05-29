import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
    let first = lines[0];
    let { author, date, time, timezone, datetime } = first;
    let ret = {
      id: commit,
      url: 'https://github.com/Ctt011/Lab1_test_portfolio/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };

    Object.defineProperty(ret, 'lines', {
      value: lines,
      configurable: true,
      writable: true,
      enumerable: false,
    });

    return ret;
  });
}

function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleDateString('en', {
    dateStyle: 'full',
  });
  document.getElementById('commit-time').textContent = commit.datetime.toLocaleTimeString('en', {
    timeStyle: 'short',
  });
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

let commitProgress = 100;
let data = await loadData();
let commits = processCommits(data).sort((a, b) => d3.ascending(a.datetime, b.datetime));
let filteredCommits = commits;
let timeScale = d3.scaleTime()
  .domain([d3.min(commits, (d) => d.datetime), d3.max(commits, (d) => d.datetime)])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);

// ✅ Only one story block retained
const scatterStory = d3.select('#scatter-story');
scatterStory.selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
      On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
      I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>.
      I edited ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.
      Then I looked over all I had made, and I saw that it was very good.
    `
  );

function onStepEnter(response) {
  console.log(response.element.__data__.datetime);
  filteredCommits = commits.filter((d) => d.datetime <= response.element.__data__.datetime);
  updateScatterPlot(data, filteredCommits);
}

const scroller = scrollama();
scroller.setup({
  container: '#scrolly-1',
  step: '#scrolly-1 .step',
}).onStepEnter(onStepEnter);

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart svg');

  xScale.domain(d3.extent(commits, d => d.datetime));

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([3, 20]);

  const colorScale = d3.scaleLinear()
    .domain([0, 6, 12, 18, 24])
    .range(['#00008B', '#FFDC00', '#FFDC00', 'steelblue', '#00008B']);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(d3.axisBottom(xScale));

  const dots = svg.select('g.dots');
  dots.selectAll('circle')
    .data(commits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', d => colorScale(d.hourFrac))
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', event => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

// Slider logic using consistent ID
const timeSlider = document.getElementById('commit-progress');
const selectedTime = d3.select('#commit-time');

function onTimeSliderChange() {
  commitProgress = Number(timeSlider.value);
  commitMaxTime = timeScale.invert(commitProgress);
  selectedTime.text(commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' }));

  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  displayCommitFiles(filteredCommits);
}

timeSlider.addEventListener('input', onTimeSliderChange);
onTimeSliderChange();
