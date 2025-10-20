document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const elements = {
        productListDiv: document.getElementById('product-list'),
        autoCalculateToggle: document.getElementById('auto-calculate'),
        calculateBtn: document.getElementById('calculate-btn'),
        saveBtn: document.getElementById('save-btn'),
        resetBtn: document.getElementById('reset-btn'),
        totalAmountSpan: document.getElementById('total-amount'),
        totalCratesSpan: document.getElementById('total-crates'),
        toast: document.getElementById('toast'),
        searchInput: document.getElementById('search-input'),
        searchClearBtn: document.getElementById('search-clear-btn'),
        loadLastOrderBtn: document.getElementById('load-last-order-btn'),
        historyModal: document.getElementById('history-modal'),
        orderDetailsModal: document.getElementById('order-details-modal'),
        settingsModal: document.getElementById('settings-modal'),
        editProductModal: document.getElementById('edit-product-modal'),
        modalTabs: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        historyBtn: document.getElementById('history-btn'),
        closeHistoryBtn: document.getElementById('close-history'),
        historyListDiv: document.getElementById('history-list'),
        startDateFilter: document.getElementById('start-date-filter'),
        endDateFilter: document.getElementById('end-date-filter'),
        applyFilterBtn: document.getElementById('apply-filter-btn'),
        downloadBtn: document.getElementById('download-btn'),
        selectAllHistoryBtn: document.getElementById('select-all-history-btn'),
        deleteSelectedHistoryBtn: document.getElementById('delete-selected-history-btn'),
        analyticsMonthFilter: document.getElementById('analytics-month-filter'),
        runAnalyticsBtn: document.getElementById('run-analytics-btn'),
        analyticsContent: document.getElementById('analytics-content'),
        downloadAnalyticsPdfBtn: document.getElementById('download-analytics-pdf-btn'),
        closeOrderDetailsBtn: document.getElementById('close-order-details'),
        orderDetailsListDiv: document.getElementById('order-details-list'),
        settingsBtn: document.getElementById('settings-btn'),
        closeSettingsBtn: document.getElementById('close-settings'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        themeIcon: document.getElementById('theme-toggle-btn').querySelector('i'),
        exportDataBtn: document.getElementById('export-data-btn'),
        importFileInput: document.getElementById('import-file-input'),
        addProductForm: document.getElementById('add-product-form'),
        manageProductListDiv: document.getElementById('manage-product-list'),
        editProductForm: document.getElementById('edit-product-form'),
        closeEditProductBtn: document.getElementById('close-edit-product')
    };

    let allProducts = [];
    let charts = {};

    // --- STORAGE & DATA FUNCTIONS ---
    const getProducts = () => JSON.parse(localStorage.getItem('amulCalcProducts')) || [];
    const saveProducts = (products) => localStorage.setItem('amulCalcProducts', JSON.stringify(products));
    const getHistory = () => (JSON.parse(localStorage.getItem('amulCalcHistory')) || []).sort((a,b) => new Date(b.date) - new Date(a.date));
    const saveHistory = (history) => localStorage.setItem('amulCalcHistory', JSON.stringify(history));
    const getTheme = () => localStorage.getItem('theme') || 'dark';
    const saveTheme = (theme) => localStorage.setItem('theme', theme);

    // --- CORE FUNCTIONS ---
    const showToast = (message) => {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');
        setTimeout(() => elements.toast.classList.remove('show'), 2000);
    };

    const calculateTotal = () => {
        let total = 0;
        let crateCount = 0;
        document.querySelectorAll('.product-card').forEach(card => {
            if (card.style.display === 'none') return;
            const quantity = parseInt(card.querySelector('.quantity-display').value) || 0;
            const price = parseFloat(card.dataset.price);
            // POINT 6: Crate Calculation Fix
            const container = (card.dataset.container || '').toLowerCase();
            
            total += quantity * price;
            if (container === 'crate') {
                crateCount += quantity;
            }
        });
        elements.totalAmountSpan.textContent = `₹ ${total.toFixed(2)}`;
        elements.totalCratesSpan.textContent = crateCount;
        return { total, crateCount };
    };

    const resetQuantities = () => {
        document.querySelectorAll('.quantity-display').forEach(input => input.value = '0');
        calculateTotal();
    }

    const createProductCardHTML = (p) => `
        <div class="product-card" data-id="${p.id}" data-price="${p.price}" data-name="${p.name} - ${p.size}" data-container="${p.container}">
            <div class="product-info">
                <div class="product-name">${p.name} - ${p.size}</div>
                <div class="product-price">Rate: ₹${p.price.toFixed(2)}</div>
            </div>
            <div class="quantity-stepper">
                <button class="quantity-btn minus-btn"><i class="fas fa-minus"></i></button>
                <input type="number" class="quantity-display" value="0" min="0" pattern="[0-9]*">
                <button class="quantity-btn plus-btn"><i class="fas fa-plus"></i></button>
            </div>
        </div>`;
    
    const displayProducts = () => {
        allProducts = getProducts();
        const grouped = allProducts.reduce((acc, p) => {
            acc[p.category] = [...(acc[p.category] || []), p];
            return acc;
        }, {});
        
        const html = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([category, items]) => `
            <div class="category-header" data-category="${category}">
                <h2 class="category-title">${category}</h2>
                <i class="fas fa-chevron-down category-toggle-icon"></i>
            </div>
            <div class="products-container" data-category-content="${category}">
                ${items.sort((a,b) => a.name.localeCompare(b.name)).map(createProductCardHTML).join('')}
            </div>
        `).join('');
        elements.productListDiv.innerHTML = html || "<p>No products found. Add products in Settings.</p>";
    };
    
    // --- HISTORY & DOWNLOAD FUNCTIONS ---
    const getFilteredHistory = () => {
        const history = getHistory();
        const startDate = elements.startDateFilter.value ? new Date(elements.startDateFilter.value).setHours(0,0,0,0) : null;
        const endDate = elements.endDateFilter.value ? new Date(elements.endDateFilter.value).setHours(23,59,59,999) : null;
        return history.filter(item => {
            const itemDate = new Date(item.date);
            if (startDate && itemDate < startDate) return false;
            if (endDate && itemDate > endDate) return false;
            return true;
        });
    }

    const displayHistory = () => {
        const filteredHistory = getFilteredHistory();
        elements.historyListDiv.innerHTML = filteredHistory.length === 0 ? '<p class="text-center">No records for selected dates.</p>' : filteredHistory.map(item => {
            const totalCrates = item.items
                .filter(i => {
                    const product = allProducts.find(p => p.id === i.id);
                    return product && (product.container || '').toLowerCase() === 'crate';
                })
                .reduce((sum, i) => sum + i.quantity, 0);
            return `<div class="history-list-item">
                <input type="checkbox" class="history-checkbox" data-date="${item.date}">
                <div>
                    <span>${new Date(item.date).toLocaleDateString('en-GB')}</span>
                    <small style="display: block; opacity: 0.7;">${new Date(item.date).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'})}</small>
                </div>
                <div><strong>₹ ${item.total.toFixed(2)}</strong>${totalCrates > 0 ? `<small style="display: block; opacity: 0.7;">Crates: ${totalCrates}</small>` : ''}</div>
                <button class="view-order-btn" data-date="${item.date}">View</button>
            </div>`;
        }).join('');
    };

    // --- ANALYTICS FUNCTIONS ---
    const destroyCharts = () => {
        Object.values(charts).forEach(chart => chart.destroy());
        charts = {};
    };

    const renderChart = (canvasId, type, data, options) => {
        const ctx = document.getElementById(canvasId).getContext('2d');
        if (charts[canvasId]) charts[canvasId].destroy();
        charts[canvasId] = new Chart(ctx, { type, data, options });
    };

    const displayAnalytics = () => {
        destroyCharts();
        const monthYear = elements.analyticsMonthFilter.value;
        if (!monthYear) {
            elements.analyticsContent.innerHTML = `<p class="text-center">Select a month and click 'Generate'.</p>`;
            elements.downloadAnalyticsPdfBtn.classList.add('hidden');
            return;
        }
        const [year, month] = monthYear.split('-').map(Number);
        const filtered = getHistory().filter(order => {
            const d = new Date(order.date);
            return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

        if (filtered.length === 0) {
            elements.analyticsContent.innerHTML = `<p class="text-center">No data found for the selected month.</p>`;
            elements.downloadAnalyticsPdfBtn.classList.add('hidden');
            return;
        }

        const totalSales = filtered.reduce((sum, order) => sum + order.total, 0);
        const productSales = {};
        filtered.forEach(order => {
            order.items.forEach(item => {
                const product = allProducts.find(p => p.id === item.id);
                const name = product ? `${product.name} ${product.size}` : 'Unknown';
                productSales[name] = (productSales[name] || 0) + (item.quantity * item.price);
            });
        });
        const topProducts = Object.entries(productSales).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const salesByDay = {};
        for(let i = 1; i <= new Date(year, month, 0).getDate(); i++) salesByDay[i] = 0;
        filtered.forEach(order => {
            const day = new Date(order.date).getDate();
            salesByDay[day] = (salesByDay[day] || 0) + order.total;
        });

        elements.analyticsContent.innerHTML = `
            <div class="analytics-item"><h4>Total Sales</h4><p style="font-size: 1.5rem; font-weight: bold;">₹ ${totalSales.toFixed(2)}</p></div>
            <div class="analytics-item"><h4>Top 5 Selling Products (by Value)</h4><canvas id="topProductsChart"></canvas></div>
            <div class="analytics-item"><h4>Day-wise Sales Graph</h4><canvas id="dayWiseSalesChart"></canvas></div>`;
        
        renderChart('topProductsChart', 'bar', {
            labels: topProducts.map(p => p[0]),
            datasets: [{ label: 'Sales (₹)', data: topProducts.map(p => p[1].toFixed(2)), backgroundColor: '#0066cc' }]
        }, { responsive: true, indexAxis: 'y' });
        
        renderChart('dayWiseSalesChart', 'line', {
            labels: Object.keys(salesByDay),
            datasets: [{ label: 'Sales (₹)', data: Object.values(salesByDay), backgroundColor: '#d9232a', borderColor: '#d9232a', fill: false, tension: 0.1 }]
        }, { responsive: true });

        elements.downloadAnalyticsPdfBtn.classList.remove('hidden');
    };

    // --- DOWNLOAD FUNCTIONS ---
    const downloadData = async () => {
        const format = document.querySelector('input[name="download-format"]:checked').value;
        const filteredHistory = getFilteredHistory();
        if (filteredHistory.length === 0) return showToast("No filtered data to download.");
        const dateString = new Date().toISOString().split('T')[0];

        switch(format) {
            case 'image':
                try {
                    elements.historyListDiv.classList.add('capture-mode');
                    const canvas = await html2canvas(elements.historyListDiv, { useCORS: true });
                    elements.historyListDiv.classList.remove('capture-mode');
                    const link = document.createElement('a');
                    link.download = `Amul_History_${dateString}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                } catch(e) { console.error(e); showToast("Failed to generate image."); }
                break;
            case 'pdf':
                // POINT 8: Better PDF Export
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(20);
                doc.text("Mother Milk Palace & Dairy", 105, 15, { align: 'center' });
                doc.setFontSize(12);
                doc.text("Daily Order History Report", 105, 22, { align: 'center' });
                doc.setFontSize(8);
                doc.text(`Generated on: ${new Date().toLocaleString('en-GB')}`, 105, 27, { align: 'center' });
                
                const tableHead = [['Date', 'Product', 'Qty', 'Rate', 'Total']];
                const tableBody = [];
                let grandTotal = 0;
                
                filteredHistory.forEach(order => {
                    const dateStr = new Date(order.date).toLocaleDateString('en-GB');
                    tableBody.push([{ content: `Order: ${dateStr}`, colSpan: 5, styles: { fillColor: '#e2e8f0', textColor: '#000', fontStyle: 'bold' } }]);
                    order.items.forEach(item => {
                        const product = allProducts.find(p => p.id === item.id) || { name: 'Unknown', size: '' };
                        tableBody.push(['', `${product.name} ${product.size}`, item.quantity, `₹${item.price.toFixed(2)}`, `₹${(item.quantity * item.price).toFixed(2)}`]);
                    });
                    tableBody.push([{ content: `Subtotal: ₹${order.total.toFixed(2)}`, colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } }]);
                    grandTotal += order.total;
                });
        
                doc.autoTable({
                    head: tableHead,
                    body: tableBody,
                    startY: 35,
                    theme: 'grid',
                    headStyles: { fillColor: [0, 102, 204] },
                    didDrawPage: data => doc.setFontSize(10).text('Page ' + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 10)
                });
                
                doc.setFontSize(14).text(`Grand Total: ₹ ${grandTotal.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 15);
                doc.save(`Amul_History_${dateString}.pdf`);
                break;
            case 'csv':
                let csvContent = "Date,Time,Product Name,Size,Price,Quantity,Item Total,Order Total\n";
                filteredHistory.forEach(order => {
                    const date = new Date(order.date).toLocaleDateString('en-GB');
                    const time = new Date(order.date).toLocaleTimeString('en-GB');
                    order.items.forEach(item => {
                        const product = allProducts.find(p => p.id === item.id) || {};
                        csvContent += `"${date}","${time}","${product.name || 'Unknown'}","${product.size || ''}","${item.price.toFixed(2)}","${item.quantity}","${(item.price * item.quantity).toFixed(2)}","${order.total.toFixed(2)}"\n`;
                    });
                });
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Amul_History_${dateString}.csv`;
                link.click();
                break;
        }
    };
    
    // --- SETTINGS FUNCTIONS ---
    const applyTheme = (theme) => {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        elements.themeIcon.className = `fas fa-${theme === 'dark' ? 'sun' : 'moon'}`;
    };

    const displayManageProducts = () => {
        const products = getProducts();
        elements.manageProductListDiv.innerHTML = products.sort((a,b) => a.name.localeCompare(b.name)).map(p => `
            <div class="managed-product-item" data-id="${p.id}">
                <span>${p.name} - ${p.size} (₹${p.price}) [${p.container}]</span>
                <div class="product-actions">
                     <button class="edit-product-btn" data-id="${p.id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                     <button class="delete-product-btn" data-id="${p.id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join('');
    };

    const exportData = () => {
        const data = { products: getProducts(), history: getHistory() };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `AmulCalc_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        showToast("Data exported!");
    };
    
    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.products && data.history) {
                    if (confirm("This will overwrite all current data. Continue?")) {
                        saveProducts(data.products);
                        saveHistory(data.history);
                        initializeApp();
                        showToast("Data imported successfully!");
                    }
                } else { showToast("Invalid backup file."); }
            } catch (error) { showToast("Error reading file."); console.error(error); }
        };
        reader.readAsText(file);
        event.target.value = null;
    };

    // --- EVENT HANDLERS ---
    elements.productListDiv.addEventListener('click', e => {
        const card = e.target.closest('.product-card');
        if (!card) {
            if (e.target.closest('.category-header')) {
                const header = e.target.closest('.category-header');
                const content = document.querySelector(`.products-container[data-category-content="${header.dataset.category}"]`);
                header.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
            }
            return;
        }
        if (e.target.closest('.quantity-btn')) {
            const quantityInput = card.querySelector('.quantity-display');
            let quantity = parseInt(quantityInput.value) || 0;
            if (e.target.closest('.plus-btn')) quantity++;
            else if (e.target.closest('.minus-btn') && quantity > 0) quantity--;
            quantityInput.value = quantity;
            if (elements.autoCalculateToggle.checked) calculateTotal();
        } else if (e.target.classList.contains('quantity-display')) { e.target.select(); }
    });

    // POINT 4: Double-click to focus
    elements.productListDiv.addEventListener('dblclick', e => {
        const infoDiv = e.target.closest('.product-info');
        if (infoDiv) {
            const card = infoDiv.closest('.product-card');
            const quantityInput = card.querySelector('.quantity-display');
            quantityInput.focus();
            quantityInput.select();
        }
    });

    // POINT 5: 'Enter' to navigate
    elements.productListDiv.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.classList.contains('quantity-display')) {
            e.preventDefault();
            const allInputs = Array.from(document.querySelectorAll('.product-card:not([style*="display: none"]) .quantity-display'));
            const currentIndex = allInputs.indexOf(e.target);
            const nextInput = allInputs[currentIndex + 1];
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
            } else {
                e.target.blur();
            }
        }
    });

    elements.productListDiv.addEventListener('input', e => {
         if(e.target.classList.contains('quantity-display') && elements.autoCalculateToggle.checked) { calculateTotal(); }
    });

    elements.resetBtn.addEventListener('click', () => {
        const { total } = calculateTotal();
        if (total <= 0) return;
        if (confirm("Are you sure you want to reset all quantities?")) {
            resetQuantities();
            showToast("Reset successfully!");
        }
    });
    
    elements.settingsBtn.addEventListener('click', () => {
        displayManageProducts();
        elements.settingsModal.classList.add('visible');
    });

    elements.manageProductListDiv.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const productId = button.dataset.id;

        if (button.classList.contains('delete-product-btn')) {
            if (confirm("Delete this product?")) {
                let products = getProducts().filter(p => p.id !== productId);
                saveProducts(products);
                initializeApp(); // Reload UI
                displayManageProducts(); // Refresh list in modal
                showToast("Product deleted!");
            }
        } else if (button.classList.contains('edit-product-btn')) {
            const product = getProducts().find(p => p.id === productId);
            if(product) {
                document.getElementById('edit-product-id').value = product.id;
                document.getElementById('edit-product-name').value = product.name;
                document.getElementById('edit-product-size').value = product.size;
                document.getElementById('edit-product-price').value = product.price;
                document.getElementById('edit-product-category').value = product.category;
                document.querySelector(`input[name="edit-container-type"][value="${product.container}"]`).checked = true;
                elements.editProductModal.classList.add('visible');
            }
        }
    });
    
    // POINT 1: Product Edit Fix
    elements.editProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const productId = document.getElementById('edit-product-id').value;
        let products = getProducts();
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex !== -1) {
            products[productIndex] = {
                ...products[productIndex],
                name: document.getElementById('edit-product-name').value.trim(),
                size: document.getElementById('edit-product-size').value.trim(),
                price: parseFloat(document.getElementById('edit-product-price').value),
                category: document.getElementById('edit-product-category').value.trim(),
                container: document.querySelector('input[name="edit-container-type"]:checked').value
            };
            saveProducts(products);
            initializeApp();
            displayManageProducts();
            elements.editProductModal.classList.remove('visible');
            showToast("Product updated!");
        } else {
            showToast("Error: Product not found.");
        }
    });

    elements.saveBtn.addEventListener('click', () => {
        const { total } = calculateTotal();
        if (total <= 0) return showToast("Nothing to save.");
        const items = Array.from(document.querySelectorAll('.product-card:not([style*="display: none"])')).map(card => ({
            id: card.dataset.id,
            price: parseFloat(card.dataset.price),
            quantity: parseInt(card.querySelector('.quantity-display').value) || 0,
        })).filter(item => item.quantity > 0);
        if (items.length === 0) return showToast("Add items before saving.");;
        let history = getHistory();
        history.unshift({ date: new Date().toISOString(), total, items });
        saveHistory(history);
        showToast("Order Saved & Reset successfully!");
        resetQuantities();
    });

    elements.themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        saveTheme(newTheme);
        applyTheme(newTheme);
    });

    elements.exportDataBtn.addEventListener('click', exportData);
    elements.importFileInput.addEventListener('change', importData);

    elements.addProductForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const products = getProducts();
        const newProduct = {
            id: `custom_${new Date().getTime()}`,
            name: document.getElementById('product-name').value.trim(),
            size: document.getElementById('product-size').value.trim(),
            price: parseFloat(document.getElementById('product-price').value),
            category: document.getElementById('product-category').value.trim(),
            container: document.querySelector('input[name="container-type"]:checked').value,
        };
        products.push(newProduct);
        saveProducts(products);
        initializeApp();
        displayManageProducts();
        elements.addProductForm.reset();
        showToast("Product added!");
    });

    elements.searchInput.addEventListener('input', () => {
        const searchTerm = elements.searchInput.value.toLowerCase();
        elements.searchClearBtn.classList.toggle('hidden', searchTerm.length === 0);
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.display = card.dataset.name.toLowerCase().includes(searchTerm) ? 'flex' : 'none';
        });
        document.querySelectorAll('.category-header').forEach(header => {
            const category = header.dataset.category;
            const hasVisibleProducts = document.querySelector(`.products-container[data-category-content="${category}"] .product-card:not([style*="display: none"])`);
            header.style.display = hasVisibleProducts ? 'flex' : 'none';
        });
        if (elements.autoCalculateToggle.checked) calculateTotal();
    });

    elements.searchClearBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.searchInput.dispatchEvent(new Event('input'));
        elements.searchInput.focus();
    });

    elements.loadLastOrderBtn.addEventListener('click', () => {
        const history = getHistory();
        if (history.length === 0) return showToast("No saved orders!");
        const lastOrder = history[0];
        resetQuantities();
        document.querySelectorAll('.product-card').forEach(card => {
            const item = lastOrder.items.find(i => i.id === card.dataset.id);
            if(item) { card.querySelector('.quantity-display').value = item.quantity; }
        });
        calculateTotal();
        showToast("Last order loaded!");
    });

    elements.historyBtn.addEventListener('click', () => {
         elements.startDateFilter.value = '';
         elements.endDateFilter.value = '';
         displayHistory();
         elements.historyModal.classList.add('visible');
    });

    elements.applyFilterBtn.addEventListener('click', displayHistory);
    elements.downloadBtn.addEventListener('click', downloadData);

    elements.selectAllHistoryBtn.addEventListener('click', (e) => {
        const checkboxes = elements.historyListDiv.querySelectorAll('.history-checkbox');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        e.target.textContent = allChecked ? 'Select All' : 'Deselect All';
    });

    elements.deleteSelectedHistoryBtn.addEventListener('click', () => {
        const checkedBoxes = elements.historyListDiv.querySelectorAll('.history-checkbox:checked');
        if (checkedBoxes.length === 0) return showToast("No items selected.");
        if (!confirm(`Delete ${checkedBoxes.length} record(s)?`)) return;
        const datesToDelete = new Set(Array.from(checkedBoxes).map(cb => cb.dataset.date));
        let history = getHistory().filter(item => !datesToDelete.has(item.date));
        saveHistory(history);
        showToast(`${checkedBoxes.length} record(s) deleted.`);
        displayHistory();
    });

    elements.historyListDiv.addEventListener('click', e => {
        if(e.target.classList.contains('view-order-btn')) {
            const date = e.target.dataset.date;
            const order = getHistory().find(h => h.date === date);
            if (!order) return;
            elements.orderDetailsListDiv.innerHTML = order.items.map(item => {
                 const product = allProducts.find(p => p.id === item.id);
                 const name = product ? `${product.name} - ${product.size}` : 'Unknown Product';
                 return `<div class="order-detail-item"><span>${item.quantity} x ${name} (@ ₹${item.price.toFixed(2)})</span><span>₹${(item.quantity * item.price).toFixed(2)}</span></div>`;
            }).join('') + `<div class="order-detail-item" style="font-weight: bold; margin-top: 1rem; border-top: 1px solid var(--history-border-color); padding-top: 0.5rem;"><span>Total:</span><span>₹ ${order.total.toFixed(2)}</span></div>`;
            elements.orderDetailsModal.classList.add('visible');
        }
    });

    elements.modalTabs.forEach(tab => tab.addEventListener('click', () => {
        elements.modalTabs.forEach(t => t.classList.remove('active'));
        elements.tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    }));

    elements.runAnalyticsBtn.addEventListener('click', displayAnalytics);

    elements.autoCalculateToggle.addEventListener('change', () => {
        elements.calculateBtn.classList.toggle('hidden', elements.autoCalculateToggle.checked);
        if(elements.autoCalculateToggle.checked) calculateTotal();
    });

    elements.calculateBtn.addEventListener('click', calculateTotal);
    elements.closeHistoryBtn.addEventListener('click', () => elements.historyModal.classList.remove('visible'));
    elements.closeOrderDetailsBtn.addEventListener('click', () => elements.orderDetailsModal.classList.remove('visible'));
    elements.closeSettingsBtn.addEventListener('click', () => elements.settingsModal.classList.remove('visible'));
    elements.closeEditProductBtn.addEventListener('click', () => elements.editProductModal.classList.remove('visible'));
    
    // --- INITIALIZATION ---
    const initializeApp = async () => {
        applyTheme(getTheme());
        let currentProducts = getProducts();
        if (currentProducts.length === 0) {
            try {
                const response = await fetch('products.json');
                const defaultProducts = await response.json();
                saveProducts(defaultProducts);
            } catch (error) { console.error("Failed to load initial products:", error); }
        }
        displayProducts();
        calculateTotal();
        elements.calculateBtn.classList.toggle('hidden', elements.autoCalculateToggle.checked);
        elements.analyticsMonthFilter.value = new Date().toISOString().slice(0, 7);
    };

    initializeApp();
});
