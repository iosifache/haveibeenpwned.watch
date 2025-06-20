document.addEventListener("DOMContentLoaded", function () {
  fetch("index.json")
    .then((response) => response.json())
    .then((data) => {
      // Filter out fabricated breaches
      data = data.filter((item) => item.IsFabricated === false);

      // Compute and plot the statistics
      showNumberOfBreachedCompanies(data);
      showNumberOfBreachedAccounts(data);
      showNumberOfBreaches(data);
      createMostBreachedTable(data);
      createBreachesPerYearChart(data);
      createPwnedPerYearChart(data);
      createDataClassesPerYearChart(data);
      createMeanTimeToPublishChart(data);
      createLatestBreachesTable(data);
    });
});

function showNumberOfBreaches(data) {
  document.getElementById("total-breaches").innerHTML = data.length;
}

function showNumberOfBreachedCompanies(data) {
  const allCompanies = data.map((item) => item.Domain);
  const companies = Array.from(new Set(allCompanies));

  document.getElementById("total-breached-companies").innerHTML =
    companies.length;
}

function showNumberOfBreachedAccounts(data) {
  const totalPwned = data.reduce((acc, item) => {
    return acc + (item.PwnCount || 0);
  }, 0);

  document.getElementById("total-breached-accounts").innerHTML =
    totalPwned.toLocaleString();
}

function createMostBreachedTable(data) {
  const allCompanies = data.map((item) => item.Domain);

  const companyCounts = allCompanies.reduce((acc, domain) => {
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  const filteredCompanies = Object.entries(companyCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  const table = document.createElement("table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const domainHeader = document.createElement("th");
  domainHeader.textContent = "Domain";
  headerRow.appendChild(domainHeader);

  const countHeader = document.createElement("th");
  countHeader.textContent = "# of Breaches";
  headerRow.appendChild(countHeader);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  filteredCompanies.forEach(([domain, count]) => {
    if (domain === "") return;

    const row = document.createElement("tr");

    const domainCell = document.createElement("td");
    domainCell.innerHTML = `<code>${domain}</code>`;
    row.appendChild(domainCell);

    const countCell = document.createElement("td");
    countCell.textContent = count;
    row.appendChild(countCell);

    table.appendChild(row);
  });

  const mostBreached = document.getElementById("most-breached");
  mostBreached.appendChild(table);
}

function createBarPlotWithProperty(data, accumulateFunc, graphID, label) {
  const breachesPerYear = data.reduce((acc, item) => {
    const year = new Date(item.BreachDate).getFullYear();

    acc[year] = accumulateFunc(acc[year], item) || 0;

    return acc;
  }, {});

  const years = Object.keys(breachesPerYear).sort();
  const counts = years.map((year) => breachesPerYear[year]);

  const ctx = document.getElementById(graphID).getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        {
          label: label,
          data: counts,
          backgroundColor: "rgba(236, 240, 241, 1.0)",
          borderColor: "rgba(189, 195, 199, 1.0)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function createBreachesPerYearChart(data) {
  const accumulateFunc = (yearAcc, _) => {
    return (yearAcc || 0) + 1;
  };

  createBarPlotWithProperty(
    data,
    accumulateFunc,
    "breaches-per-year",
    "Breaches per Year"
  );
}

function createPwnedPerYearChart(data) {
  const accumulateFunc = (yearAcc, item) => {
    return (yearAcc || 0) + item.PwnCount;
  };

  createBarPlotWithProperty(
    data,
    accumulateFunc,
    "pwned-per-year",
    "Pwned Accounts per Year"
  );
}

function createDataClassesPerYearChart(data) {
  const allDataClasses = new Set();
  data.forEach((item) => {
    (item.DataClasses || []).forEach((dc) => allDataClasses.add(dc));
  });
  const dataClasses = Array.from(allDataClasses);

  const perYear = {};
  data.forEach((item) => {
    const year = new Date(item.BreachDate).getFullYear();

    if (!perYear[year]) perYear[year] = {};
    (item.DataClasses || []).forEach((dc) => {
      perYear[year][dc] = (perYear[year][dc] || 0) + item.PwnCount;
    });
  });

  const years = Object.keys(perYear).sort();
  const datasets = dataClasses.map((dc) => ({
    label: dc,
    data: years.map((year) => perYear[year][dc] || 0),
    backgroundColor: `hsl(${Math.floor(Math.random() * 360)},70%,70%)`,
    stack: "stack",
  }));

  const ctx = document.getElementById("data-per-year").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: years,
      datasets: datasets,
    },
    options: {
      plugins: {
        legend: { position: "bottom" },
      },
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true },
      },
    },
  });
}

function createMeanTimeToPublishChart(data) {
  const perYear = {};
  data.forEach((item) => {
    const year = new Date(item.BreachDate).getFullYear();
    if (!perYear[year]) perYear[year] = [];

    if (item.AddedDate && item.BreachDate) {
      const breachDate = new Date(item.BreachDate);
      const addedDate = new Date(item.AddedDate);
      const diffDays = (addedDate - breachDate) / (1000 * 60 * 60 * 24);
      perYear[year].push(diffDays);
    }
  });

  const years = Object.keys(perYear).sort();
  const means = years.map((year) => {
    const times = perYear[year];
    return times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  });

  const ctx = document.getElementById("time-to-publish").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Mean Time to Publish (in days)",
          data: means,
          backgroundColor: "rgba(236, 240, 241, 1.0)",
          borderColor: "rgba(189, 195, 199, 1.0)",
          fill: true,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

function createLatestBreachesTable(data) {
  const latestBreaches = data
    .sort((a, b) => new Date(b.BreachDate) - new Date(a.BreachDate))
    .filter((item) => item.Domain !== "")
    .slice(0, 10);

  const table = document.createElement("table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  const dateHeader = document.createElement("th");
  dateHeader.textContent = "Breach Date";
  headerRow.appendChild(dateHeader);

  const domainHeader = document.createElement("th");
  domainHeader.textContent = "Domain";
  headerRow.appendChild(domainHeader);

  const pwnedHeader = document.createElement("th");
  pwnedHeader.textContent = "Pwned Accounts";
  headerRow.appendChild(pwnedHeader);

  const dataClassesHeader = document.createElement("th");
  dataClassesHeader.textContent = "Data Classes";
  headerRow.appendChild(dataClassesHeader);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  latestBreaches.forEach((item) => {
    const row = document.createElement("tr");

    const dateCell = document.createElement("td");
    dateCell.textContent = new Date(item.BreachDate).toLocaleDateString();
    row.appendChild(dateCell);

    const domainCell = document.createElement("td");
    domainCell.innerHTML = `<code>${item.Domain}</code>`;
    row.appendChild(domainCell);

    if (item.PwnCount) {
      const pwnedCell = document.createElement("td");
      pwnedCell.textContent = item.PwnCount.toLocaleString();
      row.appendChild(pwnedCell);
    }

    const dataClassesCell = document.createElement("td");
    if (item.DataClasses && item.DataClasses.length > 0) {
      dataClassesCell.textContent = item.DataClasses.join(", ");
    } else {
      dataClassesCell.textContent = "None";
    }
    row.appendChild(dataClassesCell);

    table.appendChild(row);
  });

  const latestBreachesContainer = document.getElementById("latest-breaches");
  latestBreachesContainer.appendChild(table);
}
