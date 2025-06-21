document.addEventListener("DOMContentLoaded", function () {
  fetch("data/index.json")
    .then((response) => response.json())
    .then((data) => {
      // Filter out fabricated breaches
      data = data.filter((item) => item.IsFabricated === false);

      // Show statistics
      showNumberOfBreachedDistinctApps(data);
      showNumberOfBreachedAccounts(data);
      showNumberOfBreaches(data);

      // Plot charts
      createBreachesPerYearChart(data);
      createPwnedPerYearChart(data);
      createPwnedPerBreachRatioChart(data);
      createPwnedDataClassesPerYearChart(data);
      createPwnedIndustryPerYearChart(data);
      createMeanTimeToHIBPPublishChart(data);

      // Create tables
      createMostBreachedAppsTable(data);
      createLatestBreachesTable(data);
      createMostImpactfulBreachesTable(data);
    });
});

//
// Statistics
//

function showNumberOfBreaches(data) {
  document.getElementById("breaches-count-stat").innerHTML = data.length;
}

function showNumberOfBreachedDistinctApps(data) {
  const allApps = data.map((item) => item.Domain);
  const apps = Array.from(new Set(allApps));

  document.getElementById("breached-distinct-apps-count-stat").innerHTML =
    apps.length;
}

function showNumberOfBreachedAccounts(data) {
  const totalPwned = data.reduce((acc, item) => {
    return acc + (item.PwnCount || 0);
  }, 0);

  document.getElementById("breached-accounts-count-stat").innerHTML =
    totalPwned.toLocaleString();
}

//
// Graphs
//

function createBarPlotWithProperty(data, accumulateFunc, chartID, label) {
  const breachesCountPerYear = data.reduce((acc, item) => {
    const year = new Date(item.BreachDate).getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {});

  const breachesPerYear = data.reduce((acc, item) => {
    const year = new Date(item.BreachDate).getFullYear();
    acc[year] =
      accumulateFunc(breachesCountPerYear[year], acc[year], item) || 0;
    return acc;
  }, {});

  const years = Object.keys(breachesPerYear).sort();
  const counts = years.map((year) => breachesPerYear[year]);

  const ctx = document.getElementById(chartID).getContext("2d");
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
  const accumulateFunc = (totalBreachesInYear, yearAcc, item) => {
    return (yearAcc || 0) + 1;
  };

  createBarPlotWithProperty(
    data,
    accumulateFunc,
    "breaches-per-year-chart",
    "Breaches per Year"
  );
}

function createPwnedPerYearChart(data) {
  const accumulateFunc = (totalBreachesInYear, yearAcc, item) => {
    return (yearAcc || 0) + item.PwnCount;
  };

  createBarPlotWithProperty(
    data,
    accumulateFunc,
    "pwned-per-year-chart",
    "Pwned Accounts per Year"
  );
}

function createPwnedPerBreachRatioChart(data) {
  const accumulateFunc = (totalBreaches, yearAcc, item) => {
    return yearAcc + (item.PwnCount || 0) / (totalBreaches || 1);
  };

  createBarPlotWithProperty(
    data,
    accumulateFunc,
    "pwned-per-branch-ratio-chart",
    "Mean Pwned Accounts per Breach per Year"
  );
}

function createStackedBarPlotWithProperty(accessorFunc, data, chartID) {
  const allValues = new Set();
  data.forEach((item) => {
    (accessorFunc(item) || []).forEach((dc) => allValues.add(dc));
  });
  const values = Array.from(allValues);

  const perYear = {};
  data.forEach((item) => {
    if (!item.Domain || item.Domain === "") return;

    const year = new Date(item.BreachDate).getFullYear();

    if (!perYear[year]) perYear[year] = {};
    (accessorFunc(item) || []).forEach((dc) => {
      perYear[year][dc] = (perYear[year][dc] || 0) + item.PwnCount;
    });
  });

  const years = Object.keys(perYear).sort();
  const datasets = values.map((dc) => ({
    label: dc,
    data: years.map((year) => perYear[year][dc] || 0),
    backgroundColor: `hsl(${Math.floor(Math.random() * 360)},70%,70%)`,
    stack: "stack",
  }));

  const ctx = document.getElementById(chartID).getContext("2d");
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

function createPwnedDataClassesPerYearChart(data) {
  const accessorFunc = (item) => {
    return item.DataClasses || [];
  };

  createStackedBarPlotWithProperty(
    accessorFunc,
    data,
    "data-classes-per-year-chart"
  );
}

function createPwnedIndustryPerYearChart(data) {
  fetch("data/domains.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const lines = csvText.trim().split("\n");
      const domainCategoryMap = {};
      lines.forEach((line, idx) => {
        if (idx === 0) return;

        const [domain, category] = line.split(",");

        domainCategoryMap[domain.trim()] = category.trim();
      });

      const accessorFunc = (item) => {
        const cat = domainCategoryMap[item.Domain];

        return cat ? [cat] : ["Unknown"];
      };

      createStackedBarPlotWithProperty(accessorFunc, data, "industry-per-year");
    });
}

function createMeanTimeToHIBPPublishChart(data) {
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

  const ctx = document
    .getElementById("hibp-time-to-publish-chart")
    .getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        {
          label: "Mean Time to HIBP Publish (in days)",
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

//
// Tables
//

function createMostBreachedAppsTable(data) {
  const allApps = data.map((item) => item.Domain);

  const appsCounts = allApps.reduce((acc, domain) => {
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  const filteredApps = Object.entries(appsCounts)
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

  filteredApps.forEach(([domain, count]) => {
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

  const mostBreached = document.getElementById("most-breached-table");
  mostBreached.appendChild(table);
}

function createTableWithBreaches(canvasID, data) {
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

  data.forEach((item) => {
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

  const selectedBreachesContainer = document.getElementById(canvasID);
  selectedBreachesContainer.appendChild(table);
}

function createLatestBreachesTable(data) {
  const selectedBreaches = data
    .sort((a, b) => new Date(b.BreachDate) - new Date(a.BreachDate))
    .filter((item) => item.Domain !== "")
    .slice(0, 10);

  createTableWithBreaches("latest-breaches-table", selectedBreaches);
}

function createMostImpactfulBreachesTable(data) {
  const selectedBreaches = data
    .sort((a, b) => b.PwnCount - a.PwnCount)
    .filter((item) => item.Domain !== "")
    .slice(0, 10);

  createTableWithBreaches("most-impactful-breaches-table", selectedBreaches);
}
