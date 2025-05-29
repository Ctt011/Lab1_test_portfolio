import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale; // <-- make these global

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
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
          enumerable: false,
          configurable: true,
          writable: false,
        });
  
        return ret;
      });
  }
  

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');
  
    // Total lines of code
    dl.append('dt').html('Total <abbr title="Lines of Code">LOC</abbr>');
    dl.append('dd').text(data.length);
  
    // Total number of commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);
  
    // Number of files
    dl.append('dt').text('Number of files');
    dl.append('dd').text(d3.group(data, d => d.file).size);
  
    // Maximum file depth
    dl.append('dt').text('Max depth');
    dl.append('dd').text(d3.max(data, d => d.depth));
  }

function setupScrollytelling(commits) {
  const ITEM_HEIGHT = 50;
  const VISIBLE_COUNT = 10;
  const totalHeight = (commits.length - 1) * ITEM_HEIGHT;

  const scrollContainer = d3.select('#scroll-container');
  const spacer = d3.select('#spacer');
  const itemsContainer = d3.select('#items-container');

  spacer.style('height', `${totalHeight}px`);

  scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex, commits);
  });

  renderItems(0, commits);
}

function setupFileScrollytelling(commits) {
  const ITEM_HEIGHT = 50;
  const VISIBLE_COUNT = 10;
  const totalHeight = (commits.length - 1) * ITEM_HEIGHT;

  const scrollContainer = d3.select('#scroll-container-files');
  const spacer = d3.select('#spacer-files');
  const itemsContainer = d3.select('#items-container-files');

  spacer.style('height', `${totalHeight}px`);

  scrollContainer.on('scroll', () => {
    const scrollTop = scrollContainer.property('scrollTop');
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderFileItems(startIndex, commits);
  });

  renderFileItems(0, commits);
}


let data = await loadData();
let commits = processCommits(data);
commits = d3.sort(commits, d => d.datetime);
let filteredCommits = commits;
console.log(commits);

renderCommitInfo(data, commits);

let commitProgress = 100;
let timeScale = d3.scaleTime()
  .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
  .range([0, 100]);


let commitMaxTime = timeScale.invert(commitProgress);

const timeSlider = document.getElementById('commit-progress');
const selectedTime = d3.select('#selected-time');


renderScatterPlot(data, commits);

function onTimeSliderChange() {
  commitProgress = Number(timeSlider.value);
  timeSlider.setAttribute("aria-valuenow", commitProgress); // ✅ update ARIA attribute dynamically

  commitMaxTime = timeScale.invert(commitProgress);
  selectedTime.text(commitMaxTime.toLocaleString("en", { dateStyle: "long", timeStyle: "short" }));

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(data, filteredCommits);
  displayCommitFiles(filteredCommits);
}

timeSlider.addEventListener('input', onTimeSliderChange);
onTimeSliderChange();  // Call once on load
// Step 3.2: Generate commit text for scrollytelling

// Add .step entries for each commit in scatter-story
// This should go after commits are sorted

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html((d, i) => `
    On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
    I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first glorious commit'}</a>.
    It edited ${d.totalLines} lines across
    ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.
    Then I looked over all I had made, and I saw that it was very good.
  `);

// Step 3.3: Use Scrollama to sync scroll steps with slider & scatter

function onStepEnter(response) {
  const commit = response.element.__data__;
  commitProgress = timeScale(commit.datetime);
  timeSlider.value = commitProgress;
  onTimeSliderChange();
}

scrollama()
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

// Rest of your code (renderScatterPlot, updateScatterPlot, brushed, etc.) remains unchanged


// This goes last
setupScrollytelling(commits);
setupFileScrollytelling(commits);


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

displayCommitFiles(); 


function renderScatterPlot(commits) {
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale = d3
  .scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([usableArea.left, usableArea.right])
  .nice();

  yScale = d3
  .scaleLinear()
  .domain([0, 24])
  .range([usableArea.bottom, usableArea.top]);


  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  
  const rScale = d3
    .scaleSqrt() // scaleSqrt fixes area-perception bias
    .domain([minLines, maxLines])
    .range([3, 20]); // tweak as needed for visibility


  const dots = svg.append('g').attr('class', 'dots');

    // Tooltip


    /*dots.selectAll('circle')
  .data(commits, d => d.id)
  .join(
    enter => enter.append('circle')
      .attr('r', 0) // optional: fade in with radius 0
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .transition().duration(500)
      .attr('r', d => rScale(d.totalLines)),
    update => update
      .transition().duration(500)
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines))
  )
  .attr('fill', 'steelblue')
  .style('fill-opacity', 0.7); */
dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')               // ✅ keep this!
    .style('fill-opacity', 0.7)              // ✅ add this
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
  


    // Add horizontal gridlines BEFORE axes so they're behind everything
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
    d3.axisLeft(yScale)
    .tickFormat('') // no labels
    .tickSize(-usableArea.width) // full width gridlines
    );


  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
    .call(yAxis);

 const brush = d3.brush()
  .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
  .on('start brush end', brushed);

svg.call(brush);

// Raise dots above the brush layer so hover still works
svg.selectAll('.dots').raise();

}
/*
function updateScatterPlot(data) {
  // Clear previous plot
  d3.select('#chart svg').remove();

  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };

  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  xScale = d3.scaleTime()
    .domain(d3.extent(filteredCommits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  const [minLines, maxLines] = d3.extent(filteredCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines, maxLines])
    .range([3, 20]);

  const dots = svg.append('g').attr('class', 'dots');

  dots.selectAll('circle')
    .data(filteredCommits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', () => {
      d3.selectAll('circle').style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  // Axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`);

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);
}*/

function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart svg');

  xScale.domain(d3.extent(commits, d => d.datetime));

  const rScale = d3.scaleSqrt()
    .domain(d3.extent(commits, d => d.totalLines))
    .range([3, 20]);

  // ✅ Clear and update x-axis only
  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(d3.axisBottom(xScale));

  // ✅ Update circles using D3's join pattern
  const dots = svg.select('g.dots');
  dots.selectAll('circle')
    .data(commits, d => d.id) // use commit ID to keep transitions stable
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
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


function brushed(event) {
    const selection = event.selection;
  
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d)
    );
  
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }
  
  function isCommitSelected(selection, commit) {
    if (!selection) return false;
  
    const [[x0, y0], [x1, y1]] = selection;
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
  
    return x0 <= x && x <= x1 && y0 <= y && y <= y1;
  }
  function renderSelectionCount(selection) {
    const selected = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    document.getElementById('selection-count').textContent =
      selected.length > 0 ? `${selected.length} commits selected` : 'No commits selected';
  }
  
  function renderLanguageBreakdown(selection) {
    const selected = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
  
    const lines = selected.flatMap((d) => d.lines);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type);
  
    const container = document.getElementById('language-breakdown');
    container.innerHTML = '';
  
    for (const [lang, count] of breakdown) {
      const percent = d3.format('.1%')(count / lines.length);
      container.innerHTML += `<dt>${lang}</dt><dd>${count} lines (${percent})</dd>`;
    }
  }


function displayCommitFiles(commits = filteredCommits) {
  const lines = commits.flatMap((d) => d.lines);

  const files = d3.groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length); // optional sort

  const fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

  const container = d3.select('#files');
  container.selectAll('div').remove(); // Clear old file entries

  const filesContainer = container.selectAll('div')
    .data(files, d => d.name)
    .join(
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        })
    );

  filesContainer.select('dt > code')
    //.text(d => d.name)
    .html(d => `${d.name}<br><small>${d.lines.length} lines</small>`);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc') // matches lab class
    .attr('style', d => `--color: ${fileTypeColors(d.type)}`);
}


function renderItems(startIndex, commits) {
  const itemsContainer = d3.select('#items-container');
  itemsContainer.selectAll('div').remove();

  const endIndex = Math.min(startIndex + 10, commits.length);
  const newCommitSlice = commits.slice(startIndex, endIndex);

  filteredCommits = newCommitSlice;
  updateScatterPlot(data, filteredCommits);
  displayCommitFiles();

  itemsContainer.selectAll('div')
    .data(newCommitSlice)
    .enter()
    .append('div')
    .attr('class', 'item')
    .html((commit, i) => `
      <p>
        On <strong>${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}</strong>, 
        I made <a href="${commit.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first glorious commit'}</a>.
        It edited ${commit.totalLines} lines across 
        ${d3.rollups(commit.lines, D => D.length, d => d.file).length} files.
      </p>
    `);
}

function renderFileItems(startIndex, commits) {
  const itemsContainer = d3.select('#items-container-files');
  itemsContainer.selectAll('div').remove();

  const endIndex = Math.min(startIndex + 10, commits.length);
  const commitSlice = commits.slice(startIndex, endIndex);

  // Update files visualization for this subset
  filteredCommits = commitSlice;

  itemsContainer.selectAll('div')
    .data(commitSlice)
    .enter()
    .append('div')
    .attr('class', 'item')
    .html((commit, i) => `
      <p>
        After the <strong>${i + 1}${getOrdinal(i + 1)}</strong> commit on 
        ${commit.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })}, 
        we edited ${commit.totalLines} lines.
      </p>
    `);
}

function getOrdinal(n) {
  return ['st','nd','rd'][((n+90)%100-10)%10-1] || 'th';
}

