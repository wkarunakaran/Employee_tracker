// =========================
// ADMIN DASHBOARD SCRIPT
// =========================

// ✅ Use your Render backend URL directly
const BASE_URL = "https://employee-tracker-vgqx.onrender.com";
console.log("✅ Admin panel connected to API:", BASE_URL);

// Pagination and filter setup
let currentPage = 1;
let currentFilters = {
    search: '',
    domain: 'all',
    techLead: 'all',
    status: 'all',
    dateRange: 'all',
    dateFrom: '',
    dateTo: ''
};

let allSubmissions = [];
let filteredSubmissions = [];

// =========================
// FETCH SUBMISSIONS
// =========================
async function fetchSubmissions() {
    try {
        const response = await fetch(`${BASE_URL}/api/employee-progress`);
        if (!response.ok) throw new Error('Failed to fetch submissions');
        allSubmissions = await response.json();
        console.log('✅ Fetched submissions:', allSubmissions);

        applyFilters();
    } catch (error) {
        console.error('❌ Error fetching submissions:', error);
        alert('Error loading data. Please try again later.');
    }
}

// =========================
// APPLY FILTERS
// =========================
function applyFilters() {
    const search = currentFilters.search.toLowerCase();
    const domain = currentFilters.domain;
    const techLead = currentFilters.techLead;
    const status = currentFilters.status;
    const dateFrom = currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : null;
    const dateTo = currentFilters.dateTo ? new Date(currentFilters.dateTo) : null;

    filteredSubmissions = allSubmissions.filter(sub => {
        const matchSearch =
            sub.name.toLowerCase().includes(search) ||
            sub.email.toLowerCase().includes(search) ||
            sub.domain.toLowerCase().includes(search) ||
            sub.techLead.toLowerCase().includes(search);

        const matchDomain = domain === 'all' || sub.domain === domain;
        const matchLead = techLead === 'all' || sub.techLead === techLead;
        const matchStatus = status === 'all' || sub.status === status;

        const createdDate = new Date(sub.createdAt);
        const matchDate =
            (!dateFrom || createdDate >= dateFrom) &&
            (!dateTo || createdDate <= dateTo);

        return matchSearch && matchDomain && matchLead && matchStatus && matchDate;
    });

    renderSubmissions();
}

// =========================
// RENDER SUBMISSIONS TABLE
// =========================
function renderSubmissions() {
    const tableBody = document.querySelector('#submissionsTable tbody');
    tableBody.innerHTML = '';

    if (filteredSubmissions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8">No submissions found</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * 10;
    const pageData = filteredSubmissions.slice(startIndex, startIndex + 10);

    pageData.forEach(sub => {
        const fileLink = sub.filePath
            ? `<a href="${BASE_URL}/${sub.filePath}" target="_blank">View File</a>`
            : 'No File';

        const row = `
            <tr>
                <td>${sub.name}</td>
                <td>${sub.email}</td>
                <td>${sub.domain}</td>
                <td>${sub.techLead}</td>
                <td>${sub.status}</td>
                <td>${new Date(sub.createdAt).toLocaleDateString()}</td>
                <td>${fileLink}</td>
                <td>
                    <button onclick="deleteSubmission('${sub._id}')">🗑️ Delete</button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });

    renderPagination();
}

// =========================
// PAGINATION
// =========================
function renderPagination() {
    const totalPages = Math.ceil(filteredSubmissions.length / 10);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => {
            currentPage = i;
            renderSubmissions();
        });
        pagination.appendChild(btn);
    }
}

// =========================
// DELETE SUBMISSION
// =========================
async function deleteSubmission(id) {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
        const response = await fetch(`${BASE_URL}/api/employee-progress/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete submission');

        alert('✅ Submission deleted successfully');
        fetchSubmissions();
    } catch (error) {
        console.error('❌ Error deleting submission:', error);
        alert('Error deleting submission');
    }
}

// =========================
// FILTER HANDLERS
// =========================
document.getElementById('searchInput').addEventListener('input', e => {
    currentFilters.search = e.target.value;
    applyFilters();
});

document.getElementById('domainFilter').addEventListener('change', e => {
    currentFilters.domain = e.target.value;
    applyFilters();
});

document.getElementById('techLeadFilter').addEventListener('change', e => {
    currentFilters.techLead = e.target.value;
    applyFilters();
});

document.getElementById('statusFilter').addEventListener('change', e => {
    currentFilters.status = e.target.value;
    applyFilters();
});

document.getElementById('dateFrom').addEventListener('change', e => {
    currentFilters.dateFrom = e.target.value;
    applyFilters();
});

document.getElementById('dateTo').addEventListener('change', e => {
    currentFilters.dateTo = e.target.value;
    applyFilters();
});

// =========================
// INITIAL LOAD
// =========================
document.addEventListener('DOMContentLoaded', fetchSubmissions);
