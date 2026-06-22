/* =====================
   支出管理アプリ app.js
   Day 3 of 30 — 2026-06-13
   ===================== */

'use strict';

// ---- カテゴリーアイコン ------------------------------------------------------

const DEFAULT_CATEGORY_ICONS = {
  '食費':   '🍙',
  '日用品': '🧺',
  '交通':   '🚃',
  '娯楽':   '🎮',
  '医療':   '💊',
  'その他': '📦',
};

let customCategories = loadCustomCategories(); // { name: icon, ... }

function getCategoryIcons() {
  return { ...DEFAULT_CATEGORY_ICONS, ...customCategories };
}

// ---- 状態 -----------------------------------------------------------------

/** @type {{ id: number, amount: number, desc: string, category: string, date: string }[]} */
let expenses = loadExpenses();
let selectedCategory = '食費';

// ---- DOM 参照 --------------------------------------------------------------

const expenseForm  = document.getElementById('expenseForm');
const amountInput  = document.getElementById('amountInput');
const descInput    = document.getElementById('descInput');
const categoryGrid = document.getElementById('categoryGrid');
const categoryBtns = () => document.querySelectorAll('.category-btn[data-category]');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const newCategoryForm = document.getElementById('newCategoryForm');
const newCategoryInput = document.getElementById('newCategoryInput');
const newCategoryIcon = document.getElementById('newCategoryIcon');
const newCategoryAddBtn = document.getElementById('newCategoryAddBtn');
const expenseList  = document.getElementById('expenseList');
const emptyState   = document.getElementById('emptyState');
const listCount    = document.getElementById('listCount');
const totalAmount  = document.getElementById('totalAmount');
const summaryLabel = document.getElementById('summaryLabel');

// ---- 初期化 ----------------------------------------------------------------

renderCategoryButtons();
render();

// ---- イベント --------------------------------------------------------------

expenseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addExpense();
});

addCategoryBtn.addEventListener('click', () => {
  newCategoryForm.classList.toggle('open');
  addCategoryBtn.classList.toggle('active');
  if (newCategoryForm.classList.contains('open')) {
    newCategoryInput.focus();
  }
});

newCategoryAddBtn.addEventListener('click', addCustomCategory);

newCategoryInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addCustomCategory();
  }
});

// ---- 機能 ------------------------------------------------------------------

function addExpense() {
  const amount = parseInt(amountInput.value, 10);
  const desc = descInput.value.trim();

  if (!amount || amount <= 0 || !desc) {
    return;
  }

  const now = new Date();

  expenses.unshift({
    id: Date.now(),
    amount,
    desc,
    category: selectedCategory,
    date: now.toISOString(),
  });

  amountInput.value = '';
  descInput.value = '';
  amountInput.focus();

  saveExpenses();
  render();
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  saveExpenses();
  render();
}

// ---- カテゴリー管理 ----------------------------------------------------------

function renderCategoryButtons() {
  // 既存のカテゴリーボタン（追加ボタンより前）を一旦削除
  categoryGrid.querySelectorAll('.category-btn[data-category]').forEach(btn => btn.remove());

  const icons = getCategoryIcons();

  Object.entries(icons).forEach(([name, icon]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-btn';
    btn.dataset.category = name;
    if (name === selectedCategory) btn.classList.add('active');

    btn.innerHTML = `<span class="cat-icon">${icon}</span><span>${escapeHtml(name)}</span>`;

    btn.addEventListener('click', () => {
      selectedCategory = name;
      categoryBtns().forEach(b => b.classList.toggle('active', b === btn));
    });

    // カスタムカテゴリーは長押しで削除可能
    if (customCategories[name]) {
      let pressTimer = null;
      const startPress = () => {
        pressTimer = setTimeout(() => {
          if (confirm(`「${name}」を削除しますか？`)) {
            removeCustomCategory(name);
          }
        }, 600);
      };
      const cancelPress = () => clearTimeout(pressTimer);

      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('touchstart', startPress);
      ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(ev =>
        btn.addEventListener(ev, cancelPress)
      );
    }

    // 追加ボタンの直前に挿入
    categoryGrid.insertBefore(btn, addCategoryBtn);
  });
}

function addCustomCategory() {
  const name = newCategoryInput.value.trim();
  const icon = newCategoryIcon.value;

  if (!name) {
    newCategoryInput.focus();
    return;
  }

  const icons = getCategoryIcons();
  if (icons[name]) {
    alert('同じ名前のカテゴリーが既にあります');
    return;
  }

  customCategories[name] = icon;
  saveCustomCategories();

  selectedCategory = name;
  renderCategoryButtons();

  newCategoryInput.value = '';
  newCategoryForm.classList.remove('open');
  addCategoryBtn.classList.remove('active');
}

function removeCustomCategory(name) {
  delete customCategories[name];
  saveCustomCategories();

  if (selectedCategory === name) {
    selectedCategory = '食費';
  }
  renderCategoryButtons();
}

// ---- 集計 ------------------------------------------------------------------

function getMonthlyTotal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return expenses
    .filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

// ---- 描画 ------------------------------------------------------------------

function render() {
  // 合計表示
  const monthTotal = getMonthlyTotal();
  totalAmount.textContent = formatYen(monthTotal);

  const now = new Date();
  summaryLabel.textContent = `${now.getMonth() + 1}月の合計`;

  // 件数
  listCount.textContent = `${expenses.length}件`;

  // リスト描画
  expenseList.innerHTML = '';

  expenses.forEach(expense => {
    expenseList.appendChild(createExpenseElement(expense));
  });

  // 空ステート
  emptyState.classList.toggle('visible', expenses.length === 0);
}

/**
 * @param {{ id: number, amount: number, desc: string, category: string, date: string }} expense
 * @returns {HTMLLIElement}
 */
function createExpenseElement(expense) {
  const li = document.createElement('li');
  li.className = 'expense-item';

  const icon = document.createElement('div');
  icon.className = 'expense-icon';
  icon.textContent = getCategoryIcons()[expense.category] || '📦';

  const info = document.createElement('div');
  info.className = 'expense-info';

  const desc = document.createElement('span');
  desc.className = 'expense-desc';
  desc.textContent = expense.desc;

  const meta = document.createElement('span');
  meta.className = 'expense-meta';
  meta.innerHTML = `
    <span class="category-tag">${escapeHtml(expense.category)}</span>
    <span>・</span>
    <span>${formatDate(expense.date)}</span>
  `;

  info.appendChild(desc);
  info.appendChild(meta);

  const amount = document.createElement('span');
  amount.className = 'expense-amount';
  amount.textContent = `¥${formatYen(expense.amount)}`;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.setAttribute('aria-label', '削除');
  deleteBtn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <line x1="18" y1="6"  x2="6"  y2="18"/>
      <line x1="6"  y1="6"  x2="18" y2="18"/>
    </svg>`;
  deleteBtn.addEventListener('click', () => deleteExpense(expense.id));

  li.appendChild(icon);
  li.appendChild(info);
  li.appendChild(amount);
  li.appendChild(deleteBtn);

  return li;
}

// ---- ユーティリティ ----------------------------------------------------------

function formatYen(num) {
  return num.toLocaleString('ja-JP');
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- 永続化（localStorage） ------------------------------------------------

function saveExpenses() {
  try {
    localStorage.setItem('expense_records', JSON.stringify(expenses));
  } catch (e) {
    console.warn('保存に失敗しました:', e);
  }
}

function loadExpenses() {
  try {
    const raw = localStorage.getItem('expense_records');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomCategories() {
  try {
    localStorage.setItem('expense_custom_categories', JSON.stringify(customCategories));
  } catch (e) {
    console.warn('保存に失敗しました:', e);
  }
}

function loadCustomCategories() {
  try {
    const raw = localStorage.getItem('expense_custom_categories');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}