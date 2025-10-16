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

// General validation for otherDeductions based on selected unit (percent or VND)
function validateOtherDeductions() {
    const unitEl = document.getElementById('otherDeductionsUnit');
    const input = document.getElementById('otherDeductions');
    const errEl = document.getElementById('otherDeductions-error');
    const calcBtn = document.getElementById('calculate-btn');
    if (!unitEl || !input || !errEl) {
        if (calcBtn) calcBtn.disabled = false;
        return true;
    }

    const unit = unitEl.value;
    const raw = (input.value || '').toString().trim();

    // Helper to mark invalid
    function markInvalid(msg) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'otherDeductions-error');
        if (calcBtn) calcBtn.disabled = true;
    }

    // Helper to mark valid
    function markValid() {
        errEl.classList.add('hidden');
        errEl.innerText = '\u00A0';
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
        if (calcBtn) calcBtn.disabled = false;
    }

    if (unit === 'percent') {
        if (raw === '') {
            // empty considered zero -> valid
            markValid();
            return true;
        }
        const norm = raw.replace(/\s+/g, '').replace(/,/g, '.');
        const num = Number(norm);
        if (isNaN(num)) {
            markInvalid('Giá trị không hợp lệ — hãy nhập một số (ví dụ: 1.5)');
            return false;
        }
        if (num < 0) {
            markInvalid('Phần trăm phải lớn hơn hoặc bằng 0');
            return false;
        }
        if (num > 100) {
            markInvalid('Phần trăm phải nhỏ hơn hoặc bằng 100');
            return false;
        }
        markValid();
        return true;
    }

    // VND mode: allow empty or numeric (with dots separators). Normalize and test
    if (unit === 'vnd') {
        if (raw === '') {
            markValid();
            return true;
        }
        const norm = raw.replace(/\./g, '').replace(/,/g, '.').replace(/\s+/g, '');
        const num = Number(norm);
        if (isNaN(num)) {
            markInvalid('Số tiền không hợp lệ');
            return false;
        }
        if (num < 0) {
            markInvalid('Số tiền phải lớn hơn hoặc bằng 0');
            return false;
        }
        markValid();
        return true;
    }

    // fallback: valid
    markValid();
    return true;
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

    if (insuranceSalary <= 0) {
        insuranceSalary = agreedSalary;
    }

    // Determine otherDeductions based on unit selector (VND or percent)
    let otherDeductions = 0;
    const otherUnitEl = document.getElementById('otherDeductionsUnit');
    const rawOtherInput = document.getElementById('otherDeductions');
        // if percent mode, validate before proceeding
        if (otherUnitEl && otherUnitEl.value === 'percent') {
            if (!validateOtherDeductions()) {
                // focus the input and abort
                rawOtherInput.focus();
                return;
            }
        // parse as percent (allow decimal commas/dots)
        const pctRaw = (rawOtherInput && rawOtherInput.value) ? rawOtherInput.value.replace(/,/g, '.') : '0';
        const pct = parseFloat(pctRaw) || 0;
        otherDeductions = (insuranceSalary) * (pct / 100);
    } else {
        // vnd mode
        otherDeductions = getNumericValue('otherDeductions');
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
            // Validate otherDeductions on load
            validateOtherDeductions();

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
        } else if (id === 'otherDeductions') {
            // For otherDeductions we need to respect the unit selector (VND or %)
            const unitSelect = document.getElementById('otherDeductionsUnit');
            if (unitSelect) {
                // When unit is VND, format with dots; when percent, keep raw numeric input
                input.addEventListener('input', () => {
                    if (unitSelect.value === 'vnd') {
                        formatNumberInput(input);
                    } else {
                        // allow only numbers and decimal point for percent
                        input.value = input.value.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
                    }
                });

                // when unit changes, adjust formatting
                unitSelect.addEventListener('change', () => {
                    if (unitSelect.value === 'vnd') {
                        // convert percent-looking value to formatted VND if possible
                        input.value = input.value.replace(/\./g, '').replace(/,/g, '.');
                        formatNumberInput(input);
                        input.setAttribute('inputmode', 'numeric');
                    } else {
                        // percent mode: remove thousand separators and normalize decimal mark to dot
                        input.value = input.value.replace(/\./g, '').replace(/,/g, '.');
                        input.setAttribute('inputmode', 'decimal');
                    }
                    // re-run validation when unit changes
                    validateOtherDeductions();
                });
            } else {
                input.addEventListener('input', () => formatNumberInput(input));
            }
        } else {
            input.addEventListener('input', () => formatNumberInput(input));
        }

        // Format initial value
        formatNumberInput(input);
        // Live-validate percent-mode when typing into otherDeductions
        if (id === 'otherDeductions') {
            input.addEventListener('input', () => validateOtherDeductions());
        }
    });

    document.getElementById('calculate-btn').addEventListener('click', calculateAll);
    document.getElementById('add-expense-btn').addEventListener('click', addExpenseRow);
    document.getElementById('reset-btn').addEventListener('click', resetForm);

    // Add live calculation for expense-related inputs
    document.getElementById('currentCash').addEventListener('input', calculateExpenses);

    // --- Custom dropdown for otherDeductionsUnit ---
    (function setupOtherDeductionsDropdown() {
        const trigger = document.getElementById('otherDeductionsTrigger');
        const list = document.getElementById('otherDeductionsList');
        const hidden = document.getElementById('otherDeductionsUnit');
        const selectedSpan = document.getElementById('otherDeductionsSelected');
        if (!trigger || !list || !hidden || !selectedSpan) return;

        let items = Array.from(list.querySelectorAll('.select-item'));
        let open = false;
        let focusedIndex = -1;

        function openList() {
            list.classList.remove('hidden');
            list.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            document.getElementById('otherDeductionsDropdown').setAttribute('aria-expanded', 'true');
            open = true;
            focusedIndex = items.findIndex(it => it.dataset.value === hidden.value);
            focusItem(focusedIndex >= 0 ? focusedIndex : 0);
        }

        function closeList() {
            list.classList.remove('open');
            // allow animation then hide
            setTimeout(() => list.classList.add('hidden'), 180);
            trigger.setAttribute('aria-expanded', 'false');
            document.getElementById('otherDeductionsDropdown').setAttribute('aria-expanded', 'false');
            open = false;
            focusedIndex = -1;
        }

        function focusItem(idx) {
            if (idx < 0) idx = 0;
            if (idx >= items.length) idx = items.length - 1;
            items.forEach((it, i) => {
                it.classList.toggle('focused', i === idx);
                it.setAttribute('aria-selected', i === idx ? 'true' : 'false');
            });
            focusedIndex = idx;
            // scroll into view
            const el = items[focusedIndex];
            if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
        }

        function selectItem(idx) {
            const it = items[idx];
            if (!it) return;
            const val = it.dataset.value;
            // delegate to central setter to keep behavior consistent
            setOtherDeductionsUnit(val, it);
            // trigger input formatting update: switch inputmode/formatting for otherDeductions
            const otherInput = document.getElementById('otherDeductions');
            if (val === 'vnd') {
                // format existing value as VND
                otherInput.value = otherInput.value.replace(/\./g, '').replace(/,/g, '.');
                formatNumberInput(otherInput);
                otherInput.setAttribute('inputmode', 'numeric');
            } else {
                // percent mode
                otherInput.value = otherInput.value.replace(/\./g, '').replace(/,/g, '.');
                otherInput.setAttribute('inputmode', 'decimal');
            }
            // re-validate percent input after selection (handled by setter)
        }

        // central setter used by selectItem and can be reused elsewhere
        function setOtherDeductionsUnit(val, itemEl) {
            hidden.value = val;
            selectedSpan.textContent = val === 'percent' ? '%' : '₫';
            items.forEach(i => i.classList.remove('selected'));
            if (itemEl) itemEl.classList.add('selected');
            closeList();
            // update input formatting and validate
            const otherInput = document.getElementById('otherDeductions');
            if (val === 'vnd') {
                otherInput.value = otherInput.value.replace(/\./g, '').replace(/,/g, '.');
                formatNumberInput(otherInput);
                otherInput.setAttribute('inputmode', 'numeric');
            } else {
                otherInput.value = otherInput.value.replace(/\./g, '').replace(/,/g, '.');
                otherInput.setAttribute('inputmode', 'decimal');
            }
            if (typeof validateOtherDeductions === 'function') validateOtherDeductions();
        }

        // click trigger toggles
        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (open) closeList(); else openList();
        });

        // click item
        items.forEach((it, idx) => {
            it.addEventListener('click', function (e) {
                e.stopPropagation();
                selectItem(idx);
            });
        });

        // keyboard support on trigger
        trigger.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown' || e.key === 'Down') {
                e.preventDefault();
                if (!open) openList(); else focusItem((focusedIndex + 1) % items.length);
            } else if (e.key === 'ArrowUp' || e.key === 'Up') {
                e.preventDefault();
                if (!open) openList(); else focusItem((focusedIndex - 1 + items.length) % items.length);
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!open) openList(); else selectItem(focusedIndex >= 0 ? focusedIndex : 0);
            } else if (e.key === 'Escape' || e.key === 'Esc') {
                if (open) { e.preventDefault(); closeList(); }
            }
        });

        // trap focus inside the dropdown when open
        list.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (focusedIndex <= 0) {
                        e.preventDefault();
                        trigger.focus();
                    } else {
                        focusItem(focusedIndex - 1);
                    }
                } else {
                    if (focusedIndex >= items.length - 1) {
                        e.preventDefault();
                        trigger.focus();
                    } else {
                        focusItem(focusedIndex + 1);
                    }
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                selectItem(focusedIndex >= 0 ? focusedIndex : 0);
            } else if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                closeList();
                trigger.focus();
            }
        });

        // global click closes
        document.addEventListener('click', function (ev) {
            if (!document.getElementById('otherDeductionsDropdown').contains(ev.target)) {
                if (open) closeList();
            }
        });

        // set initial selected visual
        const initial = hidden.value || 'vnd';
        const initIdx = items.findIndex(it => it.dataset.value === initial);
        if (initIdx >= 0) {
            items[initIdx].classList.add('selected');
            selectedSpan.textContent = items[initIdx].textContent.trim();
        }
    })();

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

// --- Export to Excel logic ---
function openExportModal() {
    const modal = document.getElementById('export-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    // focus first checkbox for accessibility
    setTimeout(() => {
        const first = document.getElementById('export-salary');
        if (first) first.focus();
    }, 50);
    // lock background scroll
    document.documentElement.classList.add('modal-open');
    // install focus trap
    if (!modal._cleanupFocusTrap) modal._cleanupFocusTrap = trapFocusInModal(modal);
}
function closeExportModal() {
    const modal = document.getElementById('export-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    // unlock background scroll
    document.documentElement.classList.remove('modal-open');
    // remove focus trap
    if (modal._cleanupFocusTrap) { modal._cleanupFocusTrap(); modal._cleanupFocusTrap = null; }
}

// Focus trap for export modal
function trapFocusInModal(modalEl) {
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(modalEl.querySelectorAll(focusableSelector)).filter(n => n.offsetParent !== null);
    if (nodes.length === 0) return function () {};
    const first = nodes[0];
    const last = nodes[nodes.length - 1];

    function keyHandler(e) {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        } else if (e.key === 'Escape') {
            // allow Escape to close via existing handler
            closeExportModal();
        }
    }
    document.addEventListener('keydown', keyHandler);
    return function cleanup() { document.removeEventListener('keydown', keyHandler); };
}

function buildSalarySheet() {
    // Build a simple key/value table for salary results and inputs
    const rows = [];
    rows.push(['Trường', 'Giá trị']);
    // Determine how to represent otherDeductions in the export
    const otherUnitEl = document.getElementById('otherDeductionsUnit');
    const otherRaw = document.getElementById('otherDeductions') ? document.getElementById('otherDeductions').value : '';
    let otherExportValue = '';
    if (otherUnitEl && otherUnitEl.value === 'percent') {
        const pctRaw = otherRaw ? otherRaw.replace(/,/g, '.') : '0';
        const pct = parseFloat(pctRaw) || 0;
        const insuranceSalary = getNumericValue('insuranceSalary') || getNumericValue('agreedSalary');
        const computed = insuranceSalary * (pct / 100);
        otherExportValue = `${pct}% (${formatCurrency(computed)})`;
    } else {
        // re-validate when building export for VND mode
        validateOtherDeductions();
        otherExportValue = formatCurrency(getNumericValue('otherDeductions'));
    }

    const fields = [
        ['Lương thỏa thuận (Gross)', getNumericValue('agreedSalary')],
        ['Lương đóng bảo hiểm', getNumericValue('insuranceSalary')],
        ['Số ngày công thực tế', document.getElementById('actualWorkdays').value || 0],
        ['Số ngày nghỉ hưởng lương', document.getElementById('paidLeaveDays').value || 0],
        ['Phụ cấp & Thưởng khác', getNumericValue('otherAllowances')],
        ['Các khoản trừ khác', otherExportValue]
    ];

    fields.forEach(f => rows.push([f[0], f[1]]));

    // If results are visible, include computed rows
    if (!document.getElementById('results').classList.contains('hidden')) {
        rows.push([]);
        rows.push(['Kết quả', 'Số tiền']);
        const resultIds = [
            ['Lương theo ngày công thực tế', 'res-workday-salary'],
            ['Lương ngày nghỉ hưởng lương', 'res-paid-leave-salary'],
            ['Phụ cấp & Thưởng', 'res-allowances'],
            ['Tổng thu nhập (Gross)', 'res-gross-salary'],
            ['Bảo hiểm xã hội (8%)', 'res-bhxh'],
            ['Bảo hiểm y tế (1.5%)', 'res-bhyt'],
            ['Bảo hiểm thất nghiệp (1%)', 'res-bhtn'],
            ['Các khoản trừ khác', 'res-other-deductions'],
            ['Tổng khấu trừ', 'res-total-deductions'],
            ['Lương thực nhận (NET)', 'res-net-salary']
        ];
        resultIds.forEach(r => rows.push([r[0], document.getElementById(r[1]).innerText || '']));
    }

    return XLSX.utils.aoa_to_sheet(rows);
}

function buildExpenseSheet() {
    const rows = [];
    rows.push(['#', 'Nội dung', 'Số tiền']);
    const expenseRows = document.querySelectorAll('.expense-row');
    expenseRows.forEach((row, i) => {
        const desc = row.querySelector('.expense-description') ? row.querySelector('.expense-description').value : '';
        const amt = row.querySelector('.expense-amount') ? row.querySelector('.expense-amount').value : '';
        rows.push([i + 1, desc, amt]);
    });

    // Summary rows
    rows.push([]);
    rows.push(['Tổng quỹ', document.getElementById('summary-total-funds') ? document.getElementById('summary-total-funds').innerText : '']);
    rows.push(['Tổng chi tiêu', document.getElementById('total-expenses') ? document.getElementById('total-expenses').innerText : '']);
    rows.push(['Số tiền còn lại', document.getElementById('remaining-balance') ? document.getElementById('remaining-balance').innerText : '']);

    return XLSX.utils.aoa_to_sheet(rows);
}

function exportSelectedSheets() {
    const wantSalary = document.getElementById('export-salary').checked;
    const wantExpenses = document.getElementById('export-expenses').checked;
    if (!wantSalary && !wantExpenses) {
        alert('Vui lòng chọn ít nhất một báo cáo để xuất.');
        return;
    }

    const wb = XLSX.utils.book_new();
    if (wantSalary) {
        const s = buildSalarySheet();
        XLSX.utils.book_append_sheet(wb, s, 'Bang_luong');
    }
    if (wantExpenses) {
        const s2 = buildExpenseSheet();
        XLSX.utils.book_append_sheet(wb, s2, 'Chi_tieu');
    }

    const fileName = `bao_cao_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    closeExportModal();
}

// Wire export buttons (use closest to handle clicks on nested SVGs etc.)
document.addEventListener('click', function (e) {
    const btn = e.target && e.target.closest ? e.target.closest('button, [role="button"], [data-action]') : null;
    if (btn) {
        const id = btn.id || btn.getAttribute('data-action') || '';
        if (id === 'export-btn') { openExportModal(); return; }
        if (id === 'export-cancel' || id === 'export-cancel-2') { closeExportModal(); return; }
        if (id === 'export-confirm') { exportSelectedSheets(); return; }
    }

    // allow clicking on the backdrop to close
    if (e.target && e.target.classList && e.target.classList.contains('export-backdrop')) {
        const modal = document.getElementById('export-modal');
        if (modal && !modal.classList.contains('hidden')) closeExportModal();
    }
});

// close modal with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('export-modal');
        if (modal && !modal.classList.contains('hidden')) closeExportModal();
    }
});

