import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
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
          url: 'https://github.com/YOUR_REPO/commit/' + commit,
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

let data = await loadData();
let commits = processCommits(data);
console.log(commits);
renderCommitInfo(data, commits);

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

renderScatterPlot(commits);


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
dots
    .selectAll('circle')
    .data(sortedCommits)
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
    .call(xAxis);

  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

 const brush = d3.brush()
  .extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]])
  .on('start brush end', brushed);

svg.call(brush);

// Raise dots above the brush layer so hover still works
svg.selectAll('.dots').raise();

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
  

  

  
  
