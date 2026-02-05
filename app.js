// API Configuration
const API_BASE_URL = 'https://api.escuelajs.co/api/v1';
const API_ENDPOINTS = {
    products: `${API_BASE_URL}/products`,
    product: (id) => `${API_BASE_URL}/products/${id}`,
    categories: `${API_BASE_URL}/categories`
};

// Application State
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortOrder = {
    title: null, // null, 'asc', 'desc'
    price: null
};
let searchQuery = '';
let currentProductId = null;

// Bootstrap Modal Instances
let detailModal, editModal, createModal;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeModals();
    attachEventListeners();
    loadProducts();
});

// Initialize Bootstrap Modals
function initializeModals() {
    detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    createModal = new bootstrap.Modal(document.getElementById('createModal'));
}

// Attach Event Listeners
function attachEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        currentPage = 1;
        filterAndRenderProducts();
    });

    // Items per page
    document.getElementById('itemsPerPage').addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        filterAndRenderProducts();
    });

    // Sort buttons
    document.getElementById('sortTitle').addEventListener('click', () => {
        toggleSort('title');
    });

    document.getElementById('sortPrice').addEventListener('click', () => {
        toggleSort('price');
    });

    // Export CSV
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    // Create button
    document.getElementById('createBtn').addEventListener('click', () => {
        resetCreateForm();
        createModal.show();
    });

    // Edit button in detail modal
    document.getElementById('editBtn').addEventListener('click', () => {
        detailModal.hide();
        showEditModal(currentProductId);
    });

    // Forms
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    document.getElementById('createForm').addEventListener('submit', handleCreateSubmit);
}

// Load Products from API
async function loadProducts() {
    console.log('🚀 Starting to load products...');
    console.log('📡 API URL:', API_ENDPOINTS.products);
    showLoading(true);
    try {
        console.log('⏳ Fetching data from API...');
        const response = await fetch(API_ENDPOINTS.products);
        console.log('📥 Response received:', response.status, response.statusText);
        console.log('📋 Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) throw new Error('Failed to fetch products');
        
        // Get the raw text first
        const rawText = await response.text();
        console.log('📄 Raw response (first 500 chars):', rawText.substring(0, 500));
        console.log('📏 Raw response length:', rawText.length);
        
        // Parse JSON
        allProducts = JSON.parse(rawText);
        console.log('✅ Data loaded successfully!');
        console.log('📊 Total products:', allProducts.length);
        console.log('🔍 Type of allProducts:', typeof allProducts, Array.isArray(allProducts));
        console.log('📦 First product:', allProducts[0]);
        
        filterAndRenderProducts();
        showToast('Đã tải dữ liệu thành công!', 'success');
    } catch (error) {
        console.error('❌ Error loading products:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        showToast('Lỗi khi tải dữ liệu: ' + error.message, 'danger');
        
        // Show error in table
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-danger">
                    <i class="bi bi-exclamation-triangle fs-1 d-block mb-3"></i>
                    <p class="mb-0"><strong>Lỗi khi tải dữ liệu!</strong></p>
                    <p class="small">${error.message}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise me-2"></i>Thử lại
                    </button>
                </td>
            </tr>
        `;
    } finally {
        showLoading(false);
    }
}

// Filter and Render Products
function filterAndRenderProducts() {
    console.log('🔍 Filtering products...');
    console.log('🔎 Search query:', searchQuery);
    console.log('📦 All products count:', allProducts.length);
    
    // Filter by search query
    filteredProducts = allProducts.filter(product => 
        product.title.toLowerCase().includes(searchQuery)
    );
    
    console.log('✅ Filtered products count:', filteredProducts.length);

    // Apply sorting
    if (sortOrder.title) {
        filteredProducts.sort((a, b) => {
            const comparison = a.title.localeCompare(b.title);
            return sortOrder.title === 'asc' ? comparison : -comparison;
        });
        console.log('📊 Sorted by title:', sortOrder.title);
    } else if (sortOrder.price) {
        filteredProducts.sort((a, b) => {
            return sortOrder.price === 'asc' ? a.price - b.price : b.price - a.price;
        });
        console.log('📊 Sorted by price:', sortOrder.price);
    }

    renderTable();
    renderPagination();
}

// Render Table
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = filteredProducts.slice(startIndex, endIndex);

    if (pageProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-3"></i>
                    <p class="mb-0">Không tìm thấy sản phẩm nào</p>
                </td>
            </tr>
        `;
        return;
    }

    pageProducts.forEach(product => {
        const row = document.createElement('tr');
        row.classList.add('product-row');
        row.style.cursor = 'pointer';
        
        // Add hover tooltip for description
        row.setAttribute('data-bs-toggle', 'tooltip');
        row.setAttribute('data-bs-placement', 'top');
        row.setAttribute('title', product.description || 'No description');
        
        row.innerHTML = `
            <td class="fw-semibold">${product.id}</td>
            <td>${escapeHtml(product.title)}</td>
            <td class="text-success fw-bold">$${product.price.toFixed(2)}</td>
            <td>
                <span class="badge bg-primary">${escapeHtml(product.category?.name || 'N/A')}</span>
            </td>
            <td>
                <div class="product-images">
                    ${product.images && product.images.length > 0 
                        ? `<img src="${product.images[0]}" alt="${escapeHtml(product.title)}" class="img-thumbnail" style="width: 50px; height: 50px; object-fit: cover;">`
                        : '<span class="text-muted">No image</span>'
                    }
                    ${product.images && product.images.length > 1 
                        ? `<span class="badge bg-secondary ms-2">+${product.images.length - 1}</span>`
                        : ''
                    }
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary view-detail-btn" data-product-id="${product.id}">
                    <i class="bi bi-eye"></i> Xem
                </button>
            </td>
        `;

        // Add click event for view details
        row.querySelector('.view-detail-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showDetailModal(product.id);
        });

        tableBody.appendChild(row);
    });

    // Initialize tooltips
    initializeTooltips();
}

// Render Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.getElementById('paginationInfo');

    // Update info
    const startItem = filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredProducts.length);
    paginationInfo.textContent = `Hiển thị ${startItem} đến ${endItem} trong tổng số ${filteredProducts.length} sản phẩm`;

    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    if (currentPage > 1) {
        prevLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            currentPage--;
            filterAndRenderProducts();
        });
    }
    pagination.appendChild(prevLi);

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        addPageButton(1);
        if (startPage > 2) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<a class="page-link">...</a>';
            pagination.appendChild(ellipsisLi);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        addPageButton(i);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisLi = document.createElement('li');
            ellipsisLi.className = 'page-item disabled';
            ellipsisLi.innerHTML = '<a class="page-link">...</a>';
            pagination.appendChild(ellipsisLi);
        }
        addPageButton(totalPages);
    }

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    if (currentPage < totalPages) {
        nextLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            currentPage++;
            filterAndRenderProducts();
        });
    }
    pagination.appendChild(nextLi);
}

// Add Page Button Helper
function addPageButton(pageNum) {
    const li = document.createElement('li');
    li.className = `page-item ${pageNum === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${pageNum}</a>`;
    li.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = pageNum;
        filterAndRenderProducts();
    });
    document.getElementById('pagination').appendChild(li);
}

// Toggle Sort
function toggleSort(field) {
    // Reset other field
    if (field === 'title') {
        sortOrder.price = null;
        document.getElementById('sortPrice').innerHTML = '<i class="bi bi-arrow-down-up"></i>';
    } else {
        sortOrder.title = null;
        document.getElementById('sortTitle').innerHTML = '<i class="bi bi-arrow-down-up"></i>';
    }

    // Toggle current field
    if (sortOrder[field] === null) {
        sortOrder[field] = 'asc';
    } else if (sortOrder[field] === 'asc') {
        sortOrder[field] = 'desc';
    } else {
        sortOrder[field] = null;
    }

    // Update icon
    const button = field === 'title' ? document.getElementById('sortTitle') : document.getElementById('sortPrice');
    if (sortOrder[field] === 'asc') {
        button.innerHTML = '<i class="bi bi-arrow-up"></i>';
    } else if (sortOrder[field] === 'desc') {
        button.innerHTML = '<i class="bi bi-arrow-down"></i>';
    } else {
        button.innerHTML = '<i class="bi bi-arrow-down-up"></i>';
    }

    currentPage = 1;
    filterAndRenderProducts();
}

// Show Detail Modal
async function showDetailModal(productId) {
    currentProductId = productId;
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        showToast('Không tìm thấy sản phẩm!', 'danger');
        return;
    }

    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = `
        <div class="row">
            <div class="col-md-5">
                <div id="productCarousel" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-inner">
                        ${product.images && product.images.length > 0
                            ? product.images.map((img, index) => `
                                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                                    <img src="${img}" class="d-block w-100 rounded" alt="${escapeHtml(product.title)}" style="height: 300px; object-fit: cover;">
                                </div>
                            `).join('')
                            : '<div class="carousel-item active"><div class="bg-light d-flex align-items-center justify-content-center rounded" style="height: 300px;"><span class="text-muted">No images available</span></div></div>'
                        }
                    </div>
                    ${product.images && product.images.length > 1 ? `
                        <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        </button>
                    ` : ''}
                </div>
            </div>
            <div class="col-md-7">
                <h4 class="fw-bold mb-3">${escapeHtml(product.title)}</h4>
                <div class="mb-3">
                    <span class="badge bg-primary fs-6">${escapeHtml(product.category?.name || 'N/A')}</span>
                </div>
                <div class="mb-3">
                    <span class="text-muted">Giá:</span>
                    <span class="h3 text-success fw-bold ms-2">$${product.price.toFixed(2)}</span>
                </div>
                <div class="mb-3">
                    <h6 class="fw-semibold">Mô tả:</h6>
                    <p class="text-muted">${escapeHtml(product.description || 'No description available')}</p>
                </div>
                <div class="mb-3">
                    <h6 class="fw-semibold">Thông tin:</h6>
                    <ul class="list-unstyled">
                        <li><strong>ID:</strong> ${product.id}</li>
                        <li><strong>Category ID:</strong> ${product.category?.id || 'N/A'}</li>
                        <li><strong>Số lượng ảnh:</strong> ${product.images?.length || 0}</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    detailModal.show();
}

// Show Edit Modal
function showEditModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        showToast('Không tìm thấy sản phẩm!', 'danger');
        return;
    }

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editTitle').value = product.title;
    document.getElementById('editPrice').value = product.price;
    document.getElementById('editDescription').value = product.description || '';
    document.getElementById('editCategoryId').value = product.category?.id || '';
    document.getElementById('editImages').value = product.images?.join(', ') || '';

    editModal.show();
}

// Handle Edit Submit
async function handleEditSubmit(e) {
    e.preventDefault();

    const productId = document.getElementById('editProductId').value;
    const updatedData = {
        title: document.getElementById('editTitle').value,
        price: parseFloat(document.getElementById('editPrice').value),
        description: document.getElementById('editDescription').value,
        categoryId: parseInt(document.getElementById('editCategoryId').value),
        images: document.getElementById('editImages').value.split(',').map(url => url.trim()).filter(url => url)
    };

    try {
        const response = await fetch(API_ENDPOINTS.product(productId), {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) throw new Error('Failed to update product');

        const updatedProduct = await response.json();
        
        // Update in local array
        const index = allProducts.findIndex(p => p.id == productId);
        if (index !== -1) {
            allProducts[index] = updatedProduct;
        }

        filterAndRenderProducts();
        editModal.hide();
        showToast('Đã cập nhật sản phẩm thành công!', 'success');
    } catch (error) {
        console.error('Error updating product:', error);
        showToast('Lỗi khi cập nhật sản phẩm!', 'danger');
    }
}

// Reset Create Form
function resetCreateForm() {
    document.getElementById('createForm').reset();
}

// Handle Create Submit
async function handleCreateSubmit(e) {
    e.preventDefault();

    // Parse images from input
    const imagesInput = document.getElementById('createImages').value;
    const images = imagesInput.split(',').map(url => url.trim()).filter(url => url);
    
    // Ensure images array has at least one URL (API requirement)
    if (images.length === 0) {
        images.push('https://placehold.co/600x400?text=No+Image');
    }

    const newData = {
        title: document.getElementById('createTitle').value,
        price: parseFloat(document.getElementById('createPrice').value),
        description: document.getElementById('createDescription').value,
        categoryId: parseInt(document.getElementById('createCategoryId').value),
        images: images
    };

    console.log('📝 Creating product with data:', newData);

    try {
        const response = await fetch(API_ENDPOINTS.products, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newData)
        });

        console.log('📡 Create response status:', response.status);

        if (!response.ok) {
            // Get the error details from the API
            const errorData = await response.json().catch(() => null);
            console.error('❌ API Error Response:', errorData);
            throw new Error(errorData?.message || `API returned ${response.status}: ${response.statusText}`);
        }

        const createdProduct = await response.json();
        console.log('✅ Product created successfully:', createdProduct);
        
        // Add to local array
        allProducts.unshift(createdProduct);
        
        filterAndRenderProducts();
        createModal.hide();
        showToast('Đã tạo sản phẩm mới thành công!', 'success');
    } catch (error) {
        console.error('❌ Error creating product:', error);
        showToast('Lỗi khi tạo sản phẩm: ' + error.message, 'danger');
    }
}

// Export to CSV
function exportToCSV() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const dataToExport = filteredProducts.slice(startIndex, endIndex);

    if (dataToExport.length === 0) {
        showToast('Không có dữ liệu để xuất!', 'warning');
        return;
    }

    // CSV Headers
    const headers = ['ID', 'Title', 'Price', 'Category', 'Description', 'Images'];
    
    // CSV Rows
    const rows = dataToExport.map(product => [
        product.id,
        `"${(product.title || '').replace(/"/g, '""')}"`,
        product.price,
        `"${(product.category?.name || '').replace(/"/g, '""')}"`,
        `"${(product.description || '').replace(/"/g, '""')}"`,
        `"${(product.images?.join('; ') || '').replace(/"/g, '""')}"`
    ]);

    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `products_page_${currentPage}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Đã xuất file CSV thành công!', 'success');
}

// Show Loading
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const tableContainer = document.getElementById('tableContainer');
    
    if (show) {
        spinner.classList.remove('d-none');
        tableContainer.classList.add('d-none');
    } else {
        spinner.classList.add('d-none');
        tableContainer.classList.remove('d-none');
    }
}

// Show Toast
function showToast(message, type = 'info') {
    const toastElement = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    const toast = new bootstrap.Toast(toastElement);
    
    toastMessage.textContent = message;
    toastElement.className = `toast bg-${type} text-white`;
    
    toast.show();
}

// Initialize Tooltips
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        // Dispose existing tooltip if any
        const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);
        if (existingTooltip) {
            existingTooltip.dispose();
        }
        // Create new tooltip
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
