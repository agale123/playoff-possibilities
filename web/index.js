let ORIGINAL_MATCHES;
d3.csv("2025.csv").then((data) => {
  ORIGINAL_MATCHES = data;

  updateForm();
  updateTable();
});

document
  .getElementsByTagName("form")
  .item(0)
  .addEventListener("input", () => {
    updateTable();
  });

document.getElementById("reset").addEventListener("click", () => {
  const inputs = document.getElementsByTagName("input");
  for (const input of inputs) {
    input.value = "";
  }
  updateTable();
});

document.getElementById("fill").addEventListener("click", () => {
  const inputs = document.getElementsByTagName("input");
  for (const input of inputs) {
    input.value = 0;
  }
  updateTable();
});

const WEEKS = 26;
const TEAMS = 14;

function updateForm() {
  const formEl = document.getElementsByTagName("form")[0];

  const gamesRemaining = ORIGINAL_MATCHES.filter(
    (el) => el["home_score"] === ""
  );

  const weeksRemaining = Math.ceil(gamesRemaining.length / (TEAMS / 2));

  let index = 0;
  for (let i = 0; i < weeksRemaining; i++) {
    const weekDiv = document.createElement("div");
    weekDiv.classList.add("match-week");
    const headerWrapper = document.createElement("div");
    headerWrapper.classList.add("match-bubble");
    const header = document.createElement("h4");
    const week = WEEKS - weeksRemaining + i + 1;
    header.innerText = "Week " + week;
    headerWrapper.appendChild(header);
    weekDiv.appendChild(headerWrapper);

    const matchesThisWeek = Math.min(
      TEAMS / 2,
      gamesRemaining.length - (weeksRemaining - i - 1) * (TEAMS / 2)
    );
    for (let j = 0; j < matchesThisWeek; j++) {
      const home = gamesRemaining[index]["home"];
      const away = gamesRemaining[index]["away"];
      index += 1;

      const match = document.createElement("div");
      match.classList = "match-bubble";
      match.innerHTML = `
      <span class="logo">
        <img src="images/${home}.png" />
        <span>${home}</span>
      </span>
      <input type="text" inputmode="numeric" pattern="[0-9]*" id="${home}"/>
      <span class="dash">-</span>
      <input type="text" inputmode="numeric" pattern="[0-9]*" id="${away}" />
      <span class="logo">
        <img src="images/${away}.png" />
        <span>${away}</span>
      </span>
      `;
      weekDiv.appendChild(match);
    }
    formEl.appendChild(weekDiv);
    formEl.appendChild(document.createElement("br"));
  }

  const elements = formEl.querySelectorAll("input");

  for (var i = 0; i < elements.length; i++) {
    elements[i].addEventListener(
      "blur",
      function () {
        if (!this.validity.valid) {
          this.value = "";
        }
      },
      false
    );
  }
}

let COLS = ["#", "Team", "MP", "W", "L", "D", "GF", "GA", "GD", "Pts", "Max"];

function colIndex(col) {
  return COLS.indexOf(col) - 2;
}

function updateTable() {
  const matchesCopy = ORIGINAL_MATCHES.map((a) => {
    return { ...a };
  });

  // Add matches to MATCHES
  for (const match of document.getElementsByClassName("match-bubble")) {
    if (match.children.length == 1) {
      // This is a header element
      continue;
    }
    const homeEl = match.children.item(1);
    const awayEl = match.children.item(3);
    const home = homeEl.id;
    const away = awayEl.id;
    const homeScore = homeEl.value;
    const awayScore = awayEl.value;

    const m = matchesCopy.filter(
      (el) => el["home"] == home && el["away"] == away
    );
    m[0]["home_score"] = homeScore;
    m[0]["away_score"] = awayScore;
  }

  renderTable(calculateTable(matchesCopy));
}

function calculateTable(matches) {
  const teams = [...new Set(matches.map((m) => m["home"]))];
  const table = {};

  // Generate empty table dictionary for tracking stats
  for (let i = 0; i < teams.length; i++) {
    table[teams[i]] = new Array(COLS.length - 2).fill(0);
  }

  const showProjected = true;

  // Add results from matches
  for (const m of matches) {
    const home = table[m["home"]];
    const away = table[m["away"]];
    if (m["home_score"] === "" && m["away_score"] === "") {
      home[colIndex("Max")] += 3;
      away[colIndex("Max")] += 3;
      continue;
    }
    const homeScore = parseInt(m["home_score"]) || 0;
    const awayScore = parseInt(m["away_score"]) || 0;
    home[colIndex("GF")] += homeScore;
    away[colIndex("GF")] += awayScore;
    home[colIndex("GA")] += awayScore;
    away[colIndex("GA")] += homeScore;
    home[colIndex("GD")] = home[colIndex("GF")] - home[colIndex("GA")];
    away[colIndex("GD")] = away[colIndex("GF")] - away[colIndex("GA")];
    home[colIndex("MP")] += 1;
    away[colIndex("MP")] += 1;

    if (homeScore > awayScore) {
      home[colIndex("W")] += 1;
      home[colIndex("Pts")] += 3;
      away[colIndex("L")] += 1;
      home[colIndex("Max")] += 3;
    } else if (homeScore < awayScore) {
      home[colIndex("L")] += 1;
      away[colIndex("W")] += 1;
      away[colIndex("Pts")] += 3;
      away[colIndex("Max")] += 3;
    } else {
      home[colIndex("D")] += 1;
      home[colIndex("Pts")] += 1;
      away[colIndex("D")] += 1;
      away[colIndex("Pts")] += 1;
      home[colIndex("Max")] += 1;
      away[colIndex("Max")] += 1;
    }
  }

  // Convert from dictionary to table
  const result = [];
  for (const [team, stats] of Object.entries(table)) {
    const teamImage = `<img src="images/${team}.png" />`;
    result.push([0, teamImage + team, ...stats]);
  }

  const sortOrder = ["Pts", "GD", "W", "GF"];

  // Sort table
  result.sort((a, b) => {
    for (const col of sortOrder) {
      if (a[COLS.indexOf(col)] != b[COLS.indexOf(col)]) {
        return b[COLS.indexOf(col)] - a[COLS.indexOf(col)];
      }
    }
    return 0;
  });

  // Add ranks
  let prev;
  let ind = 1;
  for (const row of result) {
    if (!prev) {
      row[0] = ind;
      ind += 1;
      prev = row;
      continue;
    }

    let tie = true;
    for (const col of sortOrder) {
      if (row[COLS.indexOf(col)] != prev[COLS.indexOf(col)]) {
        tie = false;
        continue;
      }
    }

    if (tie) {
      row[0] = prev[0];
    } else {
      row[0] = ind;
    }

    ind += 1;
    prev = row;
  }

  return result;
}

function renderTable(table) {
  const tbody = document.getElementsByTagName("tbody").item(0);
  tbody.innerHTML = "";
  for (const row of table) {
    const tr = document.createElement("tr");
    let i = 0;
    for (const col of row) {
      const td = document.createElement("td");
      td.innerHTML = col;
      if (i == 1) {
        td.classList.add("big-col");
      }
      tr.appendChild(td);
      i++;
    }
    tbody.appendChild(tr);
  }
}
