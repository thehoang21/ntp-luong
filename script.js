let currentNetSalary = 0;

// Function to format numbers as Vietnamese currency
function formatCurrency(value) {
    if (isNaN(value)) value = 0;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// Function to add dot separators to an input field
function formatNumberInput(input) {
    if (!input) return;
    let value = input.value.replace(/\./g, '');
    if (!isNaN(value) && value.trim() !== '') {
        input.value = new Intl.NumberFormat('de-DE').format(value);
    } else {
        input.value = '';
    }
}

// Function to get the numeric value from a formatted input
function getNumericValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const value = el.value.replace(/\./g, '') || '0';
    return parseFloat(value);
}

function resetForm() {
    // Reset salary form fields and current cash
    const salaryFormIds = ['agreedSalary', 'insuranceSalary', 'otherAllowances', 'otherDeductions', 'currentCash'];
    salaryFormIds.forEach(id => document.getElementById(id).value = '0');

    document.getElementById('actualWorkdays').value = '0';
    document.getElementById('paidLeaveDays').value = '0';
    document.getElementById('dependents').value = '0';

    // Re-format the '0' values to have dot separators
    document.querySelectorAll('#agreedSalary, #insuranceSalary, #otherAllowances, #otherDeductions, #currentCash').forEach(el => formatNumberInput(el));

    // Recalculate to show 0 values instead of hiding the cards
    calculateAll();
}

function updateExpenseNumbers() {
    const expenseRows = document.querySelectorAll('.expense-row');
    expenseRows.forEach((row, index) => {
        const numberSpan = row.querySelector('.expense-number');
        if (numberSpan) {
            numberSpan.textContent = `${index + 1}.`;
        }
    });
}

function calculateExpenses() {
    // Sum all expense amounts (no fixed/variable distinction)
    let totalExpenses = 0;

    const expenseRows = document.querySelectorAll('.expense-row');
    expenseRows.forEach(row => {
        const amountInput = row.querySelector('.expense-amount');
        const amount = parseFloat((amountInput && amountInput.value.replace(/\./g, '')) || '0');
        totalExpenses += amount;
    });

    const currentCash = getNumericValue('currentCash');
    const totalFunds = currentCash + currentNetSalary;
    const remainingBalance = totalFunds - totalExpenses;

    // Update UI (only total-related fields remain)
    const totalFundsEl = document.getElementById('summary-total-funds');
    if (totalFundsEl) totalFundsEl.innerText = formatCurrency(totalFunds);

    const totalExpensesEl = document.getElementById('total-expenses');
    if (totalExpensesEl) totalExpensesEl.innerText = `- ${formatCurrency(totalExpenses)}`;

    const remainingEl = document.getElementById('remaining-balance');
    if (remainingEl) remainingEl.innerText = formatCurrency(remainingBalance);
}

function addExpenseRow() {
    const expenseList = document.getElementById('expense-list');
    const newRow = document.createElement('div');
    newRow.className = 'expense-row sm:flex sm:items-center sm:gap-x-3 space-y-2 sm:space-y-0 animate-fade-in';

    newRow.innerHTML = `
        <div class="flex-shrink-0 w-8 text-center text-gray-500">
            <span class="expense-number font-medium"></span>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center sm:gap-x-3 flex-1">
            <input type="text" placeholder="Nội dung chi (ví dụ: Tiền nhà)" class="expense-description flex-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mb-2 sm:mb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
            <input type="text" inputmode="numeric" placeholder="Số tiền" class="expense-amount flex-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
        </div>
        <div class="flex-shrink-0">
             <button type="button" onclick="this.closest('.expense-row').remove(); updateAllCalculations();" class="remove-expense-btn inline-flex items-center justify-center rounded-md text-sm font-medium text-red-600 hover:bg-red-50 h-10 w-10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
        </div>
    `;
    expenseList.appendChild(newRow);

    const amountInput = newRow.querySelector('.expense-amount');
    amountInput.addEventListener('input', () => {
        formatNumberInput(amountInput);
        calculateExpenses();
    });
    newRow.querySelector('input.expense-description').addEventListener('input', calculateExpenses);
    newRow.querySelector('.remove-expense-btn').addEventListener('click', () => {
        newRow.remove();
        updateAllCalculations();
    });

    // expense amount and description already trigger calculateExpenses

    updateExpenseNumbers();
}

function calculateAll() {
    // 1. Get all input values
    const agreedSalary = getNumericValue('agreedSalary');
    let insuranceSalary = getNumericValue('insuranceSalary');
    const actualWorkdays = parseFloat(document.getElementById('actualWorkdays').value) || 0;
    const paidLeaveDays = parseFloat(document.getElementById('paidLeaveDays').value) || 0;
    const dependents = parseInt(document.getElementById('dependents').value) || 0;
    const otherAllowances = getNumericValue('otherAllowances');
    let otherDeductions = getNumericValue('otherDeductions');

    if (insuranceSalary <= 0) {
        insuranceSalary = agreedSalary;
    }

    // Do NOT auto-default otherDeductions here. User must enter it manually.

    // 2. Calculate Gross Salary components
    let workdaySalary = 0;
    if (actualWorkdays < 22) {
        workdaySalary = (agreedSalary / 22) * actualWorkdays;
    } else if (actualWorkdays >= 22 && actualWorkdays <= 26) {
        workdaySalary = agreedSalary;
    } else {
        workdaySalary = (agreedSalary / 26) * actualWorkdays;
    }
    const paidLeaveSalary = paidLeaveDays > 0 ? (insuranceSalary / 26) * paidLeaveDays : 0;
    const totalIncome = workdaySalary + paidLeaveSalary + otherAllowances;

    // 3. Calculate insurance deductions
    const bhxh = insuranceSalary * 0.08;
    const bhyt = insuranceSalary * 0.015;
    const bhtn = insuranceSalary * 0.01;
    const totalInsurance = bhxh + bhyt + bhtn;

    // 4. Calculate Personal Income Tax (PIT)
    const personalDeduction = 11000000;
    const dependentDeduction = dependents * 4400000;
    let taxableIncome = Math.max(0, totalIncome - totalInsurance - personalDeduction - dependentDeduction);

    let pit = 0;
    const taxBrackets = [
        { limit: 5000000, rate: 0.05 }, { limit: 10000000, rate: 0.10 },
        { limit: 18000000, rate: 0.15 }, { limit: 32000000, rate: 0.20 },
        { limit: 52000000, rate: 0.25 }, { limit: 80000000, rate: 0.30 },
        { limit: Infinity, rate: 0.35 }
    ];

    let remainingIncome = taxableIncome;
    let previousLimit = 0;
    for (const bracket of taxBrackets) {
        if (remainingIncome <= 0) break;
        const taxableInBracket = Math.min(remainingIncome, bracket.limit - previousLimit);
        pit += taxableInBracket * bracket.rate;
        remainingIncome -= taxableInBracket;
        previousLimit = bracket.limit;
    }

    // 5. Calculate Net Salary
    const totalDeductions = totalInsurance + otherDeductions;
    const netSalary = totalIncome - totalDeductions;
    currentNetSalary = netSalary;

    // 6. Display salary results
    document.getElementById('res-workday-salary').innerText = formatCurrency(workdaySalary);
    document.getElementById('res-actual-workdays-detail').innerText = `(${actualWorkdays} ngày)`;
    document.getElementById('res-paid-leave-salary').innerText = formatCurrency(paidLeaveSalary);
    document.getElementById('res-paid-leave-detail').innerText = `(${paidLeaveDays} ngày)`;
    document.getElementById('res-allowances').innerText = `+ ${formatCurrency(otherAllowances)}`;
    document.getElementById('res-gross-salary').innerText = formatCurrency(totalIncome);
    document.getElementById('res-bhxh').innerText = `- ${formatCurrency(bhxh)}`;
    document.getElementById('res-bhyt').innerText = `- ${formatCurrency(bhyt)}`;
    document.getElementById('res-bhtn').innerText = `- ${formatCurrency(bhtn)}`;
    document.getElementById('res-other-deductions').innerText = `- ${formatCurrency(otherDeductions)}`;
    document.getElementById('res-total-deductions').innerText = `${formatCurrency(totalDeductions)}`;
    document.getElementById('res-net-salary').innerText = formatCurrency(netSalary);
    document.getElementById('res-pit').innerText = formatCurrency(pit);

    document.getElementById('results').classList.remove('hidden');

    // 7. Show and update expense tracker
    document.getElementById('expense-tracker').classList.remove('hidden');
    if (document.querySelectorAll('.expense-row').length === 0) {
        addExpenseRow();
    }
    calculateExpenses();
}

window.addEventListener('load', function () {
    // Initial calculations and event listeners
    const currencyInputIds = ['currentCash', 'agreedSalary', 'insuranceSalary', 'otherAllowances', 'otherDeductions'];
    currencyInputIds.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        if (id === 'insuranceSalary') {
            // Live-format insuranceSalary as the user types (dot separators)
            input.addEventListener('input', () => {
                formatNumberInput(input);
            });
            // Final formatting + calculation on blur
            input.addEventListener('blur', () => {
                formatNumberInput(input);
                // calculateAll();
            });
        } else {
            input.addEventListener('input', () => formatNumberInput(input));
        }

        // Format initial value
        formatNumberInput(input);
    });

    document.getElementById('calculate-btn').addEventListener('click', calculateAll);
    document.getElementById('add-expense-btn').addEventListener('click', addExpenseRow);
    document.getElementById('reset-btn').addEventListener('click', resetForm);

    // Add live calculation for expense-related inputs
    document.getElementById('currentCash').addEventListener('input', calculateExpenses);

    // Custom Select Logic (using event delegation)
    document.getElementById('expense-list').addEventListener('click', function (e) {
        const trigger = e.target.closest('.custom-select-trigger');
        const option = e.target.closest('.custom-select-option');
        const selectContainer = e.target.closest('.custom-select');

        // Close all other dropdowns
        document.querySelectorAll('.custom-select-options').forEach(opt => {
            if (!selectContainer || !selectContainer.contains(opt)) {
                opt.classList.add('hidden');
            }
        });

        if (trigger) {
            const options = trigger.nextElementSibling;
            options.classList.toggle('hidden');
        }

        if (option) {
            const container = option.closest('.custom-select');
            const hiddenInput = container.querySelector('.expense-type');
            const triggerSpan = container.querySelector('.custom-select-trigger span');

            hiddenInput.value = option.dataset.value;
            triggerSpan.textContent = option.textContent;
            container.querySelector('.custom-select-options').classList.add('hidden');
            calculateExpenses();
        }
    });

    // Initial calculation and reveal UI
    calculateAll();
    document.body.classList.remove('is-loading');
});

