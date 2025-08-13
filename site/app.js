/* SQL Playground App (sql.js powered) */

const SQL_JS_VERSION = '1.10.2';
const SQL_JS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQL_JS_VERSION}`;

let sqlJsModule = null;
let database = null;
let currentLessonId = null;

const select = (q) => document.querySelector(q);
const selectAll = (q) => Array.from(document.querySelectorAll(q));

const editorEl = () => select('#sql-editor');
const resultsEl = () => select('#results');
const schemaEl = () => select('#schema');
const lessonListEl = () => select('#lesson-list');
const lessonDetailEl = () => select('#lesson-detail');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function base64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64Decode(str) {
  try { return decodeURIComponent(escape(atob(str))); } catch (e) { return ''; }
}

async function initializeSqlJs() {
  sqlJsModule = await initSqlJs({
    locateFile: (file) => `${SQL_JS_CDN}/${file}`
  });
}

function createNewDatabase() {
  if (database) database.close();
  database = new sqlJsModule.Database();
  seedDatabase(database);
  renderSchema();
}

function seedDatabase(db) {
  const seedStatements = `
BEGIN;
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  salary REAL NOT NULL,
  hire_date TEXT NOT NULL,
  manager_id INTEGER,
  FOREIGN KEY(department_id) REFERENCES departments(id),
  FOREIGN KEY(manager_id) REFERENCES employees(id)
);
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  order_date TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

INSERT INTO departments (id, name) VALUES
  (1, 'Engineering'),
  (2, 'Sales'),
  (3, 'HR');

INSERT INTO employees (id, name, department_id, salary, hire_date, manager_id) VALUES
  (1, 'Alice', 1, 120000, '2018-01-15', NULL),
  (2, 'Bob', 1, 90000, '2019-03-20', 1),
  (3, 'Carol', 2, 80000, '2020-07-10', NULL),
  (4, 'Dan', 2, 70000, '2021-04-05', 3),
  (5, 'Erin', 3, 60000, '2017-11-30', NULL);

INSERT INTO customers (id, name, city) VALUES
  (1, 'Acme Corp', 'New York'),
  (2, 'Globex', 'San Francisco'),
  (3, 'Umbrella', 'Chicago'),
  (4, 'Initech', 'New York');

INSERT INTO orders (id, customer_id, amount, order_date) VALUES
  (1, 1, 250.50, '2023-01-10'),
  (2, 1, 99.99, '2023-02-14'),
  (3, 2, 500.00, '2023-03-03'),
  (4, 3, 80.25, '2023-03-05'),
  (5, 4, 200.00, '2023-04-01');

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
COMMIT;`;
  try { db.exec(seedStatements); } catch (e) { console.error('Seed error', e); }
}

function renderSchema() {
  if (!database) return;
  const tables = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const container = schemaEl();
  container.innerHTML = '';
  const title = document.createElement('h3');
  title.textContent = 'Schema';
  container.appendChild(title);

  if (!tables.length) {
    container.insertAdjacentHTML('beforeend', `<div class="message">No user tables found.</div>`);
    return;
  }

  for (const row of tables[0].values) {
    const tableName = row[0];
    const cols = database.exec(`PRAGMA table_info(${escapeIdentifier(tableName)});`);
    const div = document.createElement('div');
    div.className = 'tbl';
    const colsList = cols[0]?.values?.map(c => `${c[1]} ${c[2]}`).join(', ') || '';
    div.innerHTML = `<div><strong>${escapeHtml(tableName)}</strong></div><div class="cols">(${escapeHtml(colsList)})</div>`;
    container.appendChild(div);
  }
}

function escapeIdentifier(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '');
}

function renderResults(execResults, infoMessage = '') {
  const container = resultsEl();
  container.innerHTML = '';

  if (infoMessage) {
    container.insertAdjacentHTML('beforeend', `<div class="message ok">${escapeHtml(infoMessage)}</div>`);
  }

  if (!execResults || execResults.length === 0) {
    if (!infoMessage) container.insertAdjacentHTML('beforeend', `<div class="message">Statement executed. No rows returned.</div>`);
    return;
  }

  execResults.forEach((result, idx) => {
    const { columns, values } = result;
    const table = document.createElement('table');
    table.className = 'table';

    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    values.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        td.innerHTML = escapeHtml(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    if (execResults.length > 1) {
      const caption = document.createElement('div');
      caption.className = 'message';
      caption.textContent = `Result set ${idx + 1}`;
      container.appendChild(caption);
    }
    container.appendChild(table);
  });
}

function runSql(sql) {
  try {
    const results = database.exec(sql);
    renderResults(results);
  } catch (err) {
    resultsEl().innerHTML = `<div class="message err">${escapeHtml(err.message)}</div>`;
  }
}

function wireShortcuts() {
  document.addEventListener('keydown', (e) => {
    const isMeta = e.ctrlKey || e.metaKey;
    if (isMeta && e.key.toLowerCase() === 'enter') {
      e.preventDefault();
      select('#run-query').click();
    }
  });
}

function buildLessonList() {
  const container = lessonListEl();
  container.innerHTML = '';

  LESSONS.forEach(group => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'lesson-group';

    const title = document.createElement('div');
    title.className = 'lesson-group-title';
    title.textContent = group.title;
    groupDiv.appendChild(title);

    group.items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'lesson-item';
      btn.textContent = item.title;
      btn.dataset.lessonId = item.id;
      btn.addEventListener('click', () => showLesson(item.id));
      groupDiv.appendChild(btn);
    });

    container.appendChild(groupDiv);
  });
}

function showLesson(lessonId) {
  currentLessonId = lessonId;
  selectAll('.lesson-item').forEach(b => b.classList.toggle('active', b.dataset.lessonId === String(lessonId)));

  const lesson = findLesson(lessonId);
  if (!lesson) return;

  lessonDetailEl().innerHTML = `
    <h2>${escapeHtml(lesson.title)}</h2>
    <p>${escapeHtml(lesson.description)}</p>
    <div>
      <div class="lesson-example-label">Example</div>
      <pre><code>${escapeHtml(lesson.example)}</code></pre>
    </div>
  `;
}

function findLesson(id) {
  for (const group of LESSONS) {
    for (const item of group.items) {
      if (String(item.id) === String(id)) return item;
    }
  }
  return null;
}

function filterLessons(query) {
  const q = query.trim().toLowerCase();
  selectAll('.lesson-item').forEach(btn => {
    const match = btn.textContent.toLowerCase().includes(q);
    btn.style.display = match ? '' : 'none';
  });
}

function handleLoadExample() {
  const lesson = findLesson(currentLessonId);
  if (!lesson) return;
  editorEl().value = lesson.example.trim() + (lesson.example.trim().endsWith(';') ? '' : ';');
  editorEl().focus();
}

function handleRunQuery() {
  const sql = editorEl().value;
  if (!sql.trim()) {
    resultsEl().innerHTML = `<div class="message">Type a SQL statement to run.</div>`;
    return;
  }
  runSql(sql);
}

function handleResetDb() {
  createNewDatabase();
  resultsEl().innerHTML = `<div class="message ok">Database reset.</div>`;
}

function handleShowSchema() {
  renderSchema();
}

function handleShareLink() {
  const sql = editorEl().value || '';
  const encoded = base64Encode(sql);
  const url = new URL(window.location.href);
  url.searchParams.set('sql', encoded);
  window.history.replaceState({}, '', url.toString());
  const msg = document.createElement('div');
  msg.className = 'message ok';
  msg.textContent = 'Share link updated in the address bar.';
  resultsEl().prepend(msg);
  setTimeout(() => msg.remove(), 2500);
}

function loadFromUrl() {
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get('sql');
  if (encoded) {
    const sql = base64Decode(encoded);
    if (sql) editorEl().value = sql;
  }
}

const LESSONS = [
  {
    title: 'Basics',
    items: [
      { id: 'select', title: 'SELECT', description: 'Retrieve columns from a table.', example: 'SELECT id, name FROM employees;' },
      { id: 'where', title: 'WHERE', description: 'Filter rows based on a condition.', example: 'SELECT name, salary FROM employees WHERE salary > 80000;' },
      { id: 'order', title: 'ORDER BY', description: 'Sort results by one or more columns.', example: 'SELECT name, hire_date FROM employees ORDER BY hire_date DESC;' },
      { id: 'limit', title: 'LIMIT', description: 'Limit the number of rows returned.', example: 'SELECT * FROM employees ORDER BY salary DESC LIMIT 3;' },
      { id: 'distinct', title: 'DISTINCT', description: 'Return unique values only.', example: 'SELECT DISTINCT city FROM customers ORDER BY city;' },
      { id: 'alias', title: 'AS (alias)', description: 'Give a column or table a temporary name.', example: 'SELECT e.name AS employee, d.name AS department FROM employees e JOIN departments d ON e.department_id = d.id;' }
    ]
  },
  {
    title: 'Filtering',
    items: [
      { id: 'like', title: 'LIKE', description: 'Pattern matching.', example: "SELECT name FROM customers WHERE name LIKE 'A%';" },
      { id: 'in', title: 'IN', description: 'Match a list of values.', example: 'SELECT name FROM employees WHERE department_id IN (1, 3);' },
      { id: 'between', title: 'BETWEEN', description: 'Match a range (inclusive).', example: 'SELECT name, salary FROM employees WHERE salary BETWEEN 70000 AND 100000;' },
      { id: 'isnull', title: 'IS NULL', description: 'Test for NULL values.', example: 'SELECT name FROM employees WHERE manager_id IS NULL;' },
      { id: 'case', title: 'CASE', description: 'Conditional expressions.', example: "SELECT name, CASE WHEN salary >= 100000 THEN 'High' WHEN salary >= 80000 THEN 'Medium' ELSE 'Low' END AS salary_band FROM employees;" }
    ]
  },
  {
    title: 'Aggregation',
    items: [
      { id: 'count', title: 'COUNT', description: 'Count rows.', example: 'SELECT COUNT(*) AS num_employees FROM employees;' },
      { id: 'avg', title: 'AVG', description: 'Average of a column.', example: 'SELECT d.name AS department, ROUND(AVG(e.salary), 2) AS avg_salary FROM employees e JOIN departments d ON e.department_id = d.id GROUP BY d.name;' },
      { id: 'group', title: 'GROUP BY', description: 'Group rows and aggregate.', example: 'SELECT d.name AS department, COUNT(*) AS num FROM employees e JOIN departments d ON e.department_id = d.id GROUP BY d.name HAVING COUNT(*) >= 2;' },
      { id: 'having', title: 'HAVING', description: 'Filter aggregated groups.', example: 'SELECT department_id, COUNT(*) AS num FROM employees GROUP BY department_id HAVING COUNT(*) > 1;' }
    ]
  },
  {
    title: 'Joins',
    items: [
      { id: 'join', title: 'INNER JOIN', description: 'Return matching rows from both tables.', example: 'SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id;' },
      { id: 'left', title: 'LEFT JOIN', description: 'All rows from left table, matched on right.', example: 'SELECT c.name, ROUND(IFNULL(SUM(o.amount),0),2) AS total_spent FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id ORDER BY total_spent DESC;' },
      { id: 'cross', title: 'CROSS JOIN', description: 'Cartesian product of two tables.', example: 'SELECT d.name AS department, c.city FROM departments d CROSS JOIN (SELECT DISTINCT city FROM customers) c ORDER BY d.name, c.city;' },
      { id: 'self', title: 'SELF JOIN', description: 'Join a table to itself.', example: 'SELECT e1.name AS employee, e2.name AS manager FROM employees e1 LEFT JOIN employees e2 ON e1.manager_id = e2.id ORDER BY employee;' }
    ]
  },
  {
    title: 'Set operations',
    items: [
      { id: 'union', title: 'UNION', description: 'Combine result sets, remove duplicates.', example: "SELECT city FROM customers WHERE city LIKE 'New%' UNION SELECT city FROM customers WHERE city LIKE 'San%';" },
      { id: 'intersect', title: 'INTERSECT', description: 'Rows common to both result sets.', example: "SELECT city FROM customers WHERE city LIKE '%o%' INTERSECT SELECT city FROM customers WHERE city LIKE '%i%';" },
      { id: 'except', title: 'EXCEPT', description: 'Rows from first not in second.', example: "SELECT city FROM customers EXCEPT SELECT city FROM customers WHERE city='Chicago';" }
    ]
  },
  {
    title: 'DDL & Indexes',
    items: [
      { id: 'create-table', title: 'CREATE TABLE', description: 'Create a new table.', example: 'CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, department_id INTEGER);' },
      { id: 'insert', title: 'INSERT', description: 'Insert rows into a table.', example: "INSERT INTO projects (name, department_id) VALUES ('Migration', 1); SELECT * FROM projects;" },
      { id: 'update', title: 'UPDATE', description: 'Modify existing rows.', example: 'UPDATE employees SET salary = salary * 1.05 WHERE department_id = 2; SELECT name, salary FROM employees WHERE department_id = 2 ORDER BY salary DESC;' },
      { id: 'delete', title: 'DELETE', description: 'Remove rows from a table.', example: 'DELETE FROM orders WHERE amount < 100; SELECT * FROM orders ORDER BY id;' },
      { id: 'alter', title: 'ALTER TABLE', description: 'Change table structure (limited in SQLite).', example: "ALTER TABLE employees ADD COLUMN email TEXT; UPDATE employees SET email = lower(name) || '@example.com'; SELECT name, email FROM employees ORDER BY id;" },
      { id: 'drop-table', title: 'DROP TABLE', description: 'Remove a table.', example: 'DROP TABLE projects; SELECT name FROM sqlite_master WHERE type = \u0027table\u0027;' },
      { id: 'create-index', title: 'CREATE INDEX', description: 'Add an index to speed up lookups.', example: 'CREATE INDEX idx_employees_dept ON employees(department_id); SELECT name FROM sqlite_master WHERE type=\u0027index\u0027;' }
    ]
  },
  {
    title: 'Transactions & Subqueries',
    items: [
      { id: 'transaction', title: 'BEGIN/COMMIT/ROLLBACK', description: 'Group statements into a transaction.', example: 'BEGIN; UPDATE employees SET salary = salary - 1000 WHERE id = 2; ROLLBACK; SELECT id, name, salary FROM employees WHERE id = 2;' },
      { id: 'exists', title: 'EXISTS', description: 'Test for existence of related rows.', example: 'SELECT name FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.amount > 200);' }
    ]
  }
];

async function start() {
  await initializeSqlJs();
  createNewDatabase();
  buildLessonList();
  showLesson('select');
  loadFromUrl();

  select('#lesson-search').addEventListener('input', (e) => filterLessons(e.target.value));
  select('#load-example').addEventListener('click', handleLoadExample);
  select('#run-query').addEventListener('click', handleRunQuery);
  select('#reset-db').addEventListener('click', handleResetDb);
  select('#show-schema').addEventListener('click', handleShowSchema);
  select('#share-link').addEventListener('click', handleShareLink);
  wireShortcuts();
}

window.addEventListener('DOMContentLoaded', start);