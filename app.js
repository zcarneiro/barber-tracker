// CONFIG
const WEBHOOK_URL = '[I WILL ADD LATER]'; // User to replace this

// STATE
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let fixedExpenses = JSON.parse(localStorage.getItem('fixed_expenses')) || [];

// DOM ELEMENTS
const locationSelect = document.getElementById('locationSelect');
const monthSelect = document.getElementById('monthSelect');
const els = {
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),
    netProfit: document.getElementById('netProfit'),
    partnerProfit: document.getElementById('partnerProfit'),
    list: document.getElementById('transactionList'),

    // Modals
    backdrop: document.getElementById('modalBackdrop'),
    modal: document.getElementById('transactionModal'),
    modalTitle: document.getElementById('modalTitle'),
    form: document.getElementById('transactionForm'),

    // Inputs
    entryType: document.getElementById('entryType'),
    categoryGroup: document.getElementById('categoryGroup'),
    categoryInput: document.getElementById('categoryInput'),
    employeeGroup: document.getElementById('employeeGroup'),
    employeeInput: document.getElementById('employeeInput'),
    conceptInput: document.getElementById('conceptInput'),
    amountInput: document.getElementById('amountInput'),

    // Fixed Modal
    fixedModal: document.getElementById('fixedManagerModal'),
    fixedList: document.getElementById('fixedList'),
    fixedLocDisplay: document.getElementById('fixedLocationDisplay'),
    fixedCategory: document.getElementById('fixedCategory'),
    fixedAmount: document.getElementById('fixedAmount'),
    btnAddFixed: document.getElementById('btnAddFixed'),

    // Buttons
    btnApplyFixed: document.getElementById('btnApplyFixed'),
    btnManageFixed: document.getElementById('btnManageFixed')
};

// INIT
function init() {
    // Set default month to today
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    // Recover last selection or default
    monthSelect.value = localStorage.getItem('lastMonth') || `${yyyy}-${mm}`;
    locationSelect.value = localStorage.getItem('lastLocation') || 'Santiago';

    updateDashboard();
}

// LISTENERS
locationSelect.addEventListener('change', () => {
    localStorage.setItem('lastLocation', locationSelect.value);
    updateDashboard();
});

monthSelect.addEventListener('change', () => {
    localStorage.setItem('lastMonth', monthSelect.value);
    updateDashboard();
});

els.form.addEventListener('submit', handleFormSubmit);

els.btnManageFixed.addEventListener('click', openFixedModal);
els.btnAddFixed.addEventListener('click', addFixedExpense);
els.btnApplyFixed.addEventListener('click', applyFixedExpenses);


// CORE FUNCTIONS

function updateDashboard() {
    const loc = locationSelect.value;
    const mon = monthSelect.value;

    // Filter
    const currentItems = transactions.filter(t => t.location === loc && t.month === mon);

    // Calc
    let income = 0;
    let expense = 0;

    currentItems.forEach(t => {
        if (t.type === 'income') {
            income += t.amount;
        } else {
            // variable, fixed, salary
            expense += t.amount;
        }
    });

    const net = income - expense;
    const partner = net / 2;

    // Render Cards
    els.totalIncome.textContent = formatMoney(income);
    els.totalExpense.textContent = formatMoney(expense);
    els.netProfit.textContent = formatMoney(net);
    els.partnerProfit.textContent = formatMoney(partner);

    // Render List
    renderList(currentItems);
}

function renderList(items) {
    els.list.innerHTML = '';

    if (items.length === 0) {
        els.list.innerHTML = '<div class="empty-state">No hay movimientos.</div>';
        return;
    }

    // Sort by newest first (using created_at implied or simply index if added sequentially)
    // We'll reverse for display so newest is top
    const displayItems = [...items].reverse();

    displayItems.forEach(t => {
        const div = document.createElement('div');
        div.className = `transaction-item type-${t.type}`;

        let meta = t.category || 'Ingreso';
        if (t.type === 'salary') meta = `Nómina: ${t.concept}`; // Concept holds employee name in salary logic below? Or specific field?
        // Let's standardize: Concept is main, Category is meta

        div.innerHTML = `
            <div class="t-info">
                <span class="t-concept">${t.concept}</span>
                <span class="t-meta">${t.category || t.type}</span>
            </div>
            <span class="t-amount">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</span>
        `;
        els.list.appendChild(div);
    });
}

// TRANSACTION HANDLING

function openModal(type) {
    els.entryType.value = type;
    els.form.reset();

    // UI Logic
    if (type === 'income') {
        els.modalTitle.textContent = 'Nuevo Ingreso';
        els.categoryGroup.classList.add('hidden');
        els.employeeGroup.classList.add('hidden');
    } else if (type === 'salary') {
        els.modalTitle.textContent = 'Nueva Nómina';
        els.categoryGroup.classList.add('hidden');
        els.employeeGroup.classList.remove('hidden');
    } else {
        // Expense
        els.modalTitle.textContent = 'Nuevo Gasto';
        els.categoryGroup.classList.remove('hidden');
        els.employeeGroup.classList.add('hidden');
    }

    els.backdrop.classList.remove('hidden');
    els.modal.classList.remove('hidden');
    setTimeout(() => els.amountInput.focus(), 100);
}

function closeModal() {
    els.backdrop.classList.add('hidden');
    els.modal.classList.add('hidden');
}

function closeFixedModal() {
    els.backdrop.classList.add('hidden');
    els.fixedModal.classList.add('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const type = els.entryType.value;
    const amount = parseFloat(els.amountInput.value);
    const loc = locationSelect.value;
    const mon = monthSelect.value;

    if (!amount || isNaN(amount)) return;

    let payload = {
        location: loc,
        month: mon,
        amount: amount,
        type: type === 'expense' ? 'variable' : type // variable, salary, income
    };

    if (type === 'income') {
        payload.concept = els.conceptInput.value || 'Ingreso Varios';
        payload.category = 'Ingreso';
    } else if (type === 'salary') {
        const emp = els.employeeInput.value || 'Empleado';
        payload.concept = `Nómina ${emp}`; // Store Name in concept for simplicity or modify schema
        payload.category = 'Salarios';
    } else {
        // Expense
        payload.category = els.categoryInput.value;
        payload.concept = els.conceptInput.value || payload.category;
    }

    // 1. Save Local
    saveTransactionLocal(payload);

    // 2. Refresh UI
    updateDashboard();
    closeModal();
    showToast('Guardando...');

    // 3. Send Webhook
    try {
        await sendToWebhook(payload);
        showToast('Guardado correctamente');
    } catch (err) {
        showToast('Error al enviar (Guardado local)');
        console.error(err);
    }
}

function saveTransactionLocal(data) {
    transactions.push(data);
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// FIXED EXPENSES

function openFixedModal() {
    els.fixedLocDisplay.textContent = locationSelect.value;
    renderFixedList();

    els.backdrop.classList.remove('hidden');
    els.fixedModal.classList.remove('hidden');
}

function renderFixedList() {
    const loc = locationSelect.value;
    const items = fixedExpenses.filter(f => f.location === loc);

    els.fixedList.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'fixed-item';
        li.innerHTML = `
            <span>${item.category}: <strong>${item.amount}€</strong></span>
            <button onclick="removeFixed('${item.id}')">&times;</button>
        `;
        els.fixedList.appendChild(li);
    });
}

function addFixedExpense() {
    const amount = parseFloat(els.fixedAmount.value);
    if (!amount) return;

    const newItem = {
        id: Date.now().toString(),
        location: locationSelect.value,
        category: els.fixedCategory.value,
        amount: amount
    };

    fixedExpenses.push(newItem);
    localStorage.setItem('fixed_expenses', JSON.stringify(fixedExpenses));

    els.fixedAmount.value = '';
    renderFixedList();
}

window.removeFixed = function (id) {
    fixedExpenses = fixedExpenses.filter(i => i.id !== id);
    localStorage.setItem('fixed_expenses', JSON.stringify(fixedExpenses));
    renderFixedList();
}

async function applyFixedExpenses() {
    const loc = locationSelect.value;
    const mon = monthSelect.value;

    const itemsToApply = fixedExpenses.filter(f => f.location === loc);

    if (itemsToApply.length === 0) {
        showToast('No hay gastos fijos definidos');
        return;
    }

    if (!confirm(`¿Añadir ${itemsToApply.length} gastos fijos a ${mon}?`)) return;

    showToast('Aplicando gastos...');

    for (const item of itemsToApply) {
        const payload = {
            location: loc,
            month: mon,
            category: item.category,
            concept: 'Gasto Fijo Mensual',
            amount: item.amount,
            type: 'fixed'
        };

        saveTransactionLocal(payload);
        // We trigger webhook for each - normally you'd batch, but n8n structure is single item
        // We'll do fire-and-forget to speed up UI
        sendToWebhook(payload).catch(console.error);
    }

    updateDashboard();
    showToast('Gastos fijos aplicados');
}

// UTILS

async function sendToWebhook(data) {
    if (WEBHOOK_URL.includes('ADD LATER')) {
        console.warn('Webhook URL not set');
        return;
    }

    const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error('Network response was not ok');
    return await res.json();
}

function formatMoney(amount) {
    return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// START
init();
