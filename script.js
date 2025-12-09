// DOM Elements
const healthScoreDisplay = document.getElementById('health-score');
const healthCircle = document.querySelector('.score-circle');
const healthMessage = document.getElementById('health-message');

// Helper to get value and convert to monthly
function getVal(id) {
    const el = document.getElementById(id);
    return el ? (parseFloat(el.value) || 0) : 0;
}

function getMonthly(valId, freqId) {
    const val = getVal(valId);
    if (!freqId) return val; // No frequency selector means it's already a rate or flat value
    const freq = getVal(freqId); // 1 for month, 12 for year
    return freq > 0 ? val / freq : val;
}

function calculateHealth() {
    // --- INCOME ---
    const grossIncome =
        getMonthly('inc-salary', 'freq-salary') +
        getMonthly('inc-pension', 'freq-pension') +
        getMonthly('inc-invest', 'freq-invest') +
        getMonthly('inc-other', 'freq-other');

    const taxRate = getVal('inc-tax');
    const monthlyTax = grossIncome * (taxRate / 100);
    const netIncome = grossIncome - monthlyTax;

    // --- EXPENSES ---

    // 1. Housing & Utilities
    const housing =
        getMonthly('exp-mortgage', 'freq-mortgage') +
        getMonthly('exp-propertytax', 'freq-propertytax') +
        getMonthly('exp-rental', 'freq-rental') +
        getMonthly('exp-insurance', 'freq-insurance') +
        getMonthly('exp-hoa', 'freq-hoa') +
        getMonthly('exp-home-maint', 'freq-home-maint') +
        getMonthly('exp-utilities-home', 'freq-utilities-home');

    // 2. Transportation
    const transport =
        getMonthly('exp-auto-loan', 'freq-auto-loan') +
        getMonthly('exp-auto-ins', 'freq-auto-ins') +
        getMonthly('exp-gas', 'freq-gas') +
        getMonthly('exp-auto-maint', 'freq-auto-maint') +
        getMonthly('exp-parking', 'freq-parking') +
        getMonthly('exp-transport-other', 'freq-transport-other');

    // 3. Debt
    const debt =
        getMonthly('exp-creditcard', 'freq-creditcard') +
        getMonthly('exp-student', 'freq-student') +
        getMonthly('exp-loans-other', 'freq-loans-other');

    // 4. Living
    const living =
        getMonthly('exp-food', 'freq-food') +
        getMonthly('exp-clothing', 'freq-clothing') +
        getMonthly('exp-supplies', 'freq-supplies') +
        getMonthly('exp-meals', 'freq-meals') +
        getMonthly('exp-living-other', 'freq-living-other');

    // 5. Healthcare
    const healthcare =
        getMonthly('exp-med-ins', 'freq-med-ins') +
        getMonthly('exp-med-spend', 'freq-med-spend');

    // 6. Children
    const children =
        getMonthly('exp-child-care', 'freq-child-care') +
        getMonthly('exp-tuition', 'freq-tuition') +
        getMonthly('exp-child-support', 'freq-child-support') +
        getMonthly('exp-child-other', 'freq-child-other');

    // 7. Savings (Contributions)
    const savingsContrib =
        getMonthly('exp-401k', 'freq-401k') +
        getMonthly('exp-college', 'freq-college') +
        getMonthly('exp-invest-contrib', 'freq-invest-contrib') +
        getMonthly('exp-emergency', 'freq-emergency');

    // 8. Miscellaneous
    const misc =
        getMonthly('exp-pet', 'freq-pet') +
        getMonthly('exp-gifts', 'freq-gifts') +
        getMonthly('exp-hobbies', 'freq-hobbies') +
        getMonthly('exp-entertainment', 'freq-entertainment') +
        getMonthly('exp-vacation', 'freq-vacation') +
        getMonthly('exp-misc-final', 'freq-misc-final');


    const totalExpenses = housing + transport + debt + living + healthcare + children + misc;
    const totalOutflow = totalExpenses + savingsContrib;

    // Remaining cash (can be treated as extra savings or buffer)
    const remaining = Math.max(0, netIncome - totalOutflow);
    const totalSavings = savingsContrib + remaining;

    // --- SCORING LOGIC ---
    // Needs: Housing, Utilities, Debt, Health, Groceries(Food), Transport, Child Care
    // Wants: Meals Out, Hobbies, Ent, Vacation, Gifts, Pet, Clothing (simplified), Misc

    // Note: We need granular split for accurate "Needs vs Wants". 
    // Simplified Mapping: 
    // Needs = Housing + Transport + Debt + Healthcare + Children + (Food + Supplies from Living)
    // Wants = (Meals + Clothing + LivingOther) + Misc

    // Let's refine Living:
    const foodAndSupplies = getMonthly('exp-food', 'freq-food') + getMonthly('exp-supplies', 'freq-supplies');
    const livingWants = living - foodAndSupplies;

    const needs = housing + transport + debt + healthcare + children + foodAndSupplies;
    const wants = livingWants + misc;

    // Calc Score
    let score = 0;
    const savingsRate = netIncome > 0 ? (totalSavings / netIncome) * 100 : 0;

    if (netIncome <= 0 && totalOutflow > 0) {
        updateUI(0, "Enter Income to start", 0, 0, 0);
        return;
    }

    if (totalOutflow > netIncome) {
        score = 10; // Overspending
    } else {
        // Base score on Savings Rate (Target 20%+) and Needs (Target <50%)
        let savingsScore = Math.min(savingsRate * 2.5, 50); // Up to 50 pts for 20% savings
        let needsRatio = (needs / netIncome) * 100;
        let needsScore = 0;

        if (needsRatio <= 50) needsScore = 50;
        else needsScore = Math.max(0, 50 - (needsRatio - 50));

        score = Math.floor(savingsScore + needsScore);
    }

    updateUI(score, getMessage(score), needs, wants, totalSavings, netIncome, {
        housing, transport, debt, living, healthcare, children, savingsContrib, misc
    });
}

function getMessage(score) {
    if (score >= 90) return "Financial Freedom! Excellent job.";
    if (score >= 75) return "Great health! You are on the right track.";
    if (score >= 50) return "Good, but room for improvement.";
    if (score >= 30) return "Fair. Watch your expenses.";
    return "Action Needed! You are overspending.";
}

function updateUI(score, message, needs, wants, savings, income, categories) {
    // Score
    healthScoreDisplay.textContent = score;
    healthMessage.textContent = message;

    // Circle Color
    let color = '#FF416C';
    if (score >= 50) color = '#FFB75E';
    if (score >= 75) color = '#00f260';

    healthCircle.style.borderColor = color;
    healthCircle.style.boxShadow = `0 0 30px ${color}40`;

    // Breakdown Bar
    if (income > 0) {
        const needsPct = Math.min((needs / income) * 100, 100);
        const wantsPct = Math.min((wants / income) * 100, 100 - needsPct);
        const savePct = Math.max(0, 100 - needsPct - wantsPct);

        const barNeeds = document.getElementById('bar-needs');
        const barWants = document.getElementById('bar-wants');
        const barSavings = document.getElementById('bar-savings');

        if (barNeeds) barNeeds.style.width = `${needsPct}%`;
        if (barWants) barWants.style.width = `${wantsPct}%`;
        if (barSavings) barSavings.style.width = `${savePct}%`;
    }

    updateTips(score, needs, wants, income);
    if (categories) updateChart(categories);
}

function updateTips(score, needs, wants, income) {
    const tipsContainer = document.getElementById('tips-container');
    const tipsList = document.getElementById('tips-list');
    tipsList.innerHTML = '';

    if (income <= 0) {
        tipsContainer.classList.add('hidden');
        return;
    }
    tipsContainer.classList.remove('hidden');

    const tips = [];
    const needsPct = (needs / income) * 100;
    const wantsPct = (wants / income) * 100;
    const savePct = 100 - needsPct - wantsPct;

    if (needsPct > 55) tips.push(`Needs are ${needsPct.toFixed(0)}% (Target 50%). Review Housing & Transport costs.`);
    if (wantsPct > 35) tips.push(`Wants are ${wantsPct.toFixed(0)}% (Target 30%). Cut back on Misc, Dining, or Shopping.`);
    if (savePct < 15) tips.push(`Savings are ${savePct.toFixed(0)}% (Target 20%). Pay yourself first!`);
    if (score > 80) tips.push("Excellent work! Consider maximizing 401k or IRA contributions.");

    if (tips.length === 0) tips.push("Your 50/30/20 balance looks good. Keep it up!");

    tips.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        tipsList.appendChild(li);
    });
}

// Chart
let expenseChart = null;
function updateChart(cats) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChart) expenseChart.destroy();

    // Data for Chart (Expenses + Tax Maybe? Just Expenses for now)
    const data = [
        cats.housing,
        cats.transport,
        cats.debt,
        cats.living,
        cats.healthcare,
        cats.children,
        cats.savingsContrib, // Show savings in chart? Prompt says "Spending data". Savings is spending on future. Let's include it or user choice. Usually budgets include savings slice.
        cats.misc
    ];

    if (data.reduce((a, b) => a + b, 0) === 0) return;

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Housing', 'Transport', 'Debt', 'Living', 'Health', 'Kids', 'Savings', 'Misc'],
            datasets: [{
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FF9F40', '#FFCD56', '#4BC0C0', '#9966FF', '#00f260', '#C9CBCF'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#aaa', font: { family: "'Outfit', sans-serif" } } }
            }
        }
    });
}

// Global Event Listener
document.addEventListener('input', (e) => {
    if (e.target.matches('input') || e.target.matches('select')) {
        calculateHealth();
    }
});

// Initial Calc
// Initial Calc
calculateHealth();

// Preset Buttons Logic (Optional: update for new IDs if needed, but existing ones might be broken differently. I'll remove or update logic.)
// The old preset buttons were for Debt/Investments in the top card which I didn't touch?
// Wait, I replaced lines 130-183. 
// Assets & Liabilities card (lines 68-128) contains preset buttons.
// I didn't change Assets & Liabilities card. So those buttons still exist.
// Their data-targets might be valid if IDs like 'inv-portfolio' exist.
// Checking Index.html... 'inv-portfolio' is in Assets card. 'debt-principal' is in Assets card.
// So those still work.
// I should keep the preset logic.

document.querySelectorAll('.preset-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const targetId = button.getAttribute('data-target');
        const value = button.getAttribute('data-value');
        const targetInput = document.getElementById(targetId);
        if (targetInput) {
            targetInput.value = value;
            calculateHealth();
        }
    });
});

// --- Theme Handling ---
const themeBtn = document.getElementById('theme-btn');
const themeIcon = themeBtn.querySelector('i');
const html = document.documentElement;

// Check saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    html.setAttribute('data-theme', 'light');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
}

themeBtn.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');

    if (currentTheme === 'light') {
        // Switch to Dark
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    } else {
        // Switch to Light
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
});
