



const API_URL = '/api/products';
const ORDER_URL = '/api/orders';
const ACCOUNT_API = '/api';
const TOKEN_KEY = 'voidCustomerToken';
const CART_KEY = 'voidCart';

// =====================================
// MAIN ELEMENTS
// =====================================

const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const cartCount = document.getElementById('cartCount');

const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const drawerCartCount = document.getElementById('drawerCartCount');

const detailsModal = document.getElementById('detailsModal');
const detailsOverlay = document.getElementById('detailsOverlay');
const detailsImage = document.getElementById('detailsImage');
const detailsName = document.getElementById('detailsName');
const detailsCategory = document.getElementById('detailsCategory');
const detailsDescription = document.getElementById('detailsDescription');
const detailsPrice = document.getElementById('detailsPrice');
const detailsStock = document.getElementById('detailsStock');
const detailsAdd = document.getElementById('detailsAdd');
const detailsClose = document.getElementById('detailsClose');

const checkoutButton = document.getElementById('checkoutButton');
const checkoutModal = document.getElementById('checkoutModal');
const checkoutOverlay = document.getElementById('checkoutOverlay');
const checkoutClose = document.getElementById('checkoutClose');
const checkoutForm = document.getElementById('checkoutForm');
const checkoutMessage = document.getElementById('checkoutMessage');
const placeOrderButton = document.getElementById('placeOrderButton');

// Account elements
const accountButton = document.getElementById('accountButton');
const accountModal = document.getElementById('accountModal');
const accountOverlay = document.getElementById('accountOverlay');
const accountClose = document.getElementById('accountClose');
const accountGuest = document.getElementById('accountGuest');
const accountSignedIn = document.getElementById('accountSignedIn');
const authMessage = document.getElementById('authMessage');
const accountMessage = document.getElementById('accountMessage');
const accountOrders = document.getElementById('accountOrders');
const accountWelcome = document.getElementById('accountWelcome');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const refreshOrdersButton = document.getElementById('refreshOrders');
const logoutButton = document.getElementById('accountLogout');

let products = [];
let selectedCategory = 'all';
let selectedProductId = null;
let currentCustomer = null;
let cart = [];

try {
    const savedCart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    cart = Array.isArray(savedCart) ? savedCart : [];
} catch {
    cart = [];
}

// =====================================
// HELPERS
// =====================================

function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function formatPrice(value) {
    return `${Number(value || 0).toLocaleString('en-US')} EGP`;
}

function getProductIcon(category = '') {
    const value = String(category).toLowerCase();

    if (value.includes('mouse')) return '🖱️';
    if (value.includes('keyboard')) return '⌨️';
    if (value.includes('headset') || value.includes('audio')) return '🎧';
    if (value.includes('monitor') || value.includes('screen')) return '🖥️';
    if (value.includes('controller')) return '🎮';

    return '🎮';
}

function getCustomerToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setAuthMessage(message, isError = false) {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.style.color = isError ? '#ff8585' : '#b8ff3b';
}

function setOrdersMessage(message, isError = false) {
    if (!accountMessage) return;
    accountMessage.textContent = message;
    accountMessage.style.color = isError ? '#ff8585' : '#b8ff3b';
}

function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
}

// =====================================
// PRODUCTS
// =====================================

function renderProducts() {
    if (!productGrid || !searchInput) return;

    const search = searchInput.value.trim().toLowerCase();

    const filtered = products.filter(product => {
        const searchable = [
            product.name,
            product.description,
            product.category
        ].join(' ').toLowerCase();

        const matchesSearch = searchable.includes(search);
        const category = String(product.category || '').toLowerCase();

        const matchesCategory =
            selectedCategory === 'all' ||
            category.includes(selectedCategory);

        return matchesSearch && matchesCategory;
    });

    if (!filtered.length) {
        productGrid.innerHTML = `
            <p class="empty-state">
                No products found. Try another search or category.
            </p>`;
        return;
    }

    productGrid.innerHTML = filtered.map(product => {
        const name = escapeHTML(product.name);
        const description = escapeHTML(
            product.description || 'Ready for your next gaming session.'
        );
        const category = escapeHTML(product.category || 'Gaming Gear');

        const imageUrl = String(product.image_url || '');
        const safeImageUrl = /^https?:\/\//i.test(imageUrl)
            ? escapeHTML(imageUrl)
            : '';

        const visual = safeImageUrl
            ? `<img src="${safeImageUrl}" alt="${name}">`
            : `<span class="product-placeholder">${getProductIcon(product.category || '')}</span>`;

        const outOfStock = Number(product.stock) <= 0;

        return `
            <article class="product-card">
                <div class="product-visual">${visual}</div>
                <p class="eyebrow">${category}</p>
                <h3>${name}</h3>

                <button class="details-button"
                        data-details="${Number(product.id)}"
                        type="button">
                    View Details ↗
                </button>

                <p class="product-description">${description}</p>

                <div class="product-bottom">
                    <span class="product-price">
                        ${formatPrice(product.price)}
                    </span>

                    <button class="add-button"
                            data-add="${Number(product.id)}"
                            type="button"
                            ${outOfStock ? 'disabled' : ''}>
                        ${outOfStock ? 'Out of stock' : 'Add to cart +'}
                    </button>
                </div>
            </article>`;
    }).join('');
}

async function loadProducts() {
    if (!productGrid) return;

    productGrid.innerHTML = '<p class="loading">Loading products...</p>';

    try {
        const response = await fetch(API_URL, {
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();

        products = Array.isArray(result.data)
            ? result.data
            : Array.isArray(result) ? result : [];

        cart = cart.filter(item =>
            products.some(product => Number(product.id) === Number(item.id))
        );

        cart.forEach(item => {
            const product = products.find(
                entry => Number(entry.id) === Number(item.id)
            );

            if (!product) return;

            const stock = Number(product.stock);
            item.quantity = Math.min(
                Math.max(1, Number(item.quantity) || 1),
                Math.max(0, stock)
            );

            item.price = Number(product.price);
            item.name = product.name;
        });

        cart = cart.filter(item => item.quantity > 0);

        saveCart();
        renderProducts();
    } catch (error) {
        console.error('Could not load products:', error);

        productGrid.innerHTML = `
            <p class="empty-state">
                Couldn't load products. Make sure Laravel is running
                and refresh the page.
            </p>`;
    }
}

// =====================================
// CART
// =====================================

function openCart() {
    if (!cartDrawer || !cartOverlay) return;

    cartDrawer.classList.add('open');
    cartOverlay.classList.add('open');
    document.body.classList.add('cart-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    renderCart();
}

function closeCart() {
    cartDrawer?.classList.remove('open');
    cartOverlay?.classList.remove('open');
    document.body.classList.remove('cart-open');
    cartDrawer?.setAttribute('aria-hidden', 'true');
}

function renderCart() {
    if (!cartCount || !drawerCartCount || !cartTotal || !cartItems) return;

    const quantity = cart.reduce(
        (sum, item) => sum + Number(item.quantity || 0), 0
    );

    const total = cart.reduce(
        (sum, item) =>
            sum + Number(item.price || 0) * Number(item.quantity || 0), 0
    );

    cartCount.textContent = quantity;
    drawerCartCount.textContent = `(${quantity})`;
    cartTotal.textContent = formatPrice(total);

    if (!cart.length) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <div style="font-size:42px;margin-bottom:12px">🛒</div>
                <p>Your cart is empty.</p>
                <p style="font-size:12px;margin-top:8px">
                    Explore the collection and add your gear.
                </p>
            </div>`;
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <h3>${escapeHTML(item.name)}</h3>
                <div class="cart-item-price">
                    ${formatPrice(item.price)}
                </div>

                <div class="cart-item-actions">
                    <button class="quantity-button"
                            data-quantity="-1"
                            data-id="${Number(item.id)}"
                            aria-label="Decrease quantity"
                            type="button">−</button>

                    <span>${Number(item.quantity)}</span>

                    <button class="quantity-button"
                            data-quantity="1"
                            data-id="${Number(item.id)}"
                            aria-label="Increase quantity"
                            type="button">+</button>

                    <button class="remove-item"
                            data-remove="${Number(item.id)}"
                            type="button">Remove</button>
                </div>
            </div>

            <strong>
                ${formatPrice(Number(item.price) * Number(item.quantity))}
            </strong>
        </div>
    `).join('');
}

function addProductToCart(id) {
    const product = products.find(item => Number(item.id) === Number(id));

    if (!product || Number(product.stock) <= 0) return false;

    const existing = cart.find(item => Number(item.id) === Number(id));

    if (existing) {
        if (Number(existing.quantity) >= Number(product.stock)) {
            alert('You have reached the available stock.');
            return false;
        }

        existing.quantity++;
    } else {
        cart.push({
            id: Number(product.id),
            name: product.name,
            price: Number(product.price),
            quantity: 1
        });
    }

    saveCart();
    return true;
}

productGrid?.addEventListener('click', event => {
    const detailsButton = event.target.closest('[data-details]');

    if (detailsButton) {
        openProductDetails(Number(detailsButton.dataset.details));
        return;
    }

    const addButton = event.target.closest('[data-add]');

    if (!addButton || addButton.disabled) return;

    const added = addProductToCart(Number(addButton.dataset.add));

    if (added) {
        addButton.textContent = 'Added ✓';

        setTimeout(() => {
            if (addButton.isConnected && !addButton.disabled) {
                addButton.textContent = 'Add to cart +';
            }
        }, 900);
    }
});

cartItems?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove]');

    if (removeButton) {
        const id = Number(removeButton.dataset.remove);
        cart = cart.filter(item => Number(item.id) !== id);
        saveCart();
        return;
    }

    const quantityButton = event.target.closest('[data-quantity]');
    if (!quantityButton) return;

    const id = Number(quantityButton.dataset.id);
    const change = Number(quantityButton.dataset.quantity);
    const item = cart.find(entry => Number(entry.id) === id);

    if (!item) return;

    if (change > 0) {
        const product = products.find(entry => Number(entry.id) === id);

        if (!product || Number(item.quantity) >= Number(product.stock)) {
            alert('You have reached the available stock.');
            return;
        }

        item.quantity++;
    } else {
        item.quantity--;

        if (item.quantity <= 0) {
            cart = cart.filter(entry => Number(entry.id) !== id);
        }
    }

    saveCart();
});

document.getElementById('cartButton')?.addEventListener('click', openCart);
document.getElementById('closeCart')?.addEventListener('click', closeCart);
cartOverlay?.addEventListener('click', closeCart);

// =====================================
// PRODUCT DETAILS
// =====================================

function openProductDetails(id) {
    const product = products.find(item => Number(item.id) === Number(id));
    if (!product || !detailsModal || !detailsOverlay) return;

    selectedProductId = Number(product.id);

    detailsName.textContent = product.name;
    detailsCategory.textContent = product.category || 'GAMING GEAR';
    detailsDescription.textContent =
        product.description || 'Ready for your next gaming session.';
    detailsPrice.textContent = formatPrice(product.price);

    detailsStock.textContent = Number(product.stock) > 0
        ? `In stock: ${product.stock}`
        : 'Currently out of stock';

    detailsImage.replaceChildren();

    const imageUrl = String(product.image_url || '');

    if (/^https?:\/\//i.test(imageUrl)) {
        const image = document.createElement('img');
        image.src = imageUrl;
        image.alt = product.name;

        image.onerror = () => {
            const icon = document.createElement('span');
            icon.className = 'product-placeholder';
            icon.textContent = getProductIcon(product.category || '');
            detailsImage.replaceChildren(icon);
        };

        detailsImage.appendChild(image);
    } else {
        const icon = document.createElement('span');
        icon.className = 'product-placeholder';
        icon.textContent = getProductIcon(product.category || '');
        detailsImage.appendChild(icon);
    }

    detailsAdd.disabled = Number(product.stock) <= 0;
    detailsAdd.textContent = Number(product.stock) > 0
        ? 'Add to Cart +'
        : 'Out of Stock';

    detailsModal.classList.add('open');
    detailsOverlay.classList.add('open');
    detailsModal.setAttribute('aria-hidden', 'false');
}

function closeProductDetails() {
    detailsModal?.classList.remove('open');
    detailsOverlay?.classList.remove('open');
    detailsModal?.setAttribute('aria-hidden', 'true');
    selectedProductId = null;
}

detailsAdd?.addEventListener('click', () => {
    if (selectedProductId === null) return;

    if (addProductToCart(selectedProductId)) {
        closeProductDetails();
        openCart();
    }
});

detailsClose?.addEventListener('click', closeProductDetails);
detailsOverlay?.addEventListener('click', closeProductDetails);

// =====================================
// CUSTOMER API
// =====================================

async function accountRequest(path, options = {}) {
    const token = getCustomerToken();

    const headers = {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
    };

    const response = await fetch(`${ACCOUNT_API}${path}`, {
        ...options,
        headers
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = result.errors
            ? Object.values(result.errors).flat().join(' ')
            : result.message || `Request failed (${response.status})`;

        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    return result;
}

// =====================================
// ACCOUNT MODAL
// =====================================

function openAccount() {
    if (!accountModal || !accountOverlay) {
        alert('Account interface is missing from index.html.');
        return;
    }

    accountModal.classList.add('open');
    accountOverlay.classList.add('open');
    accountModal.setAttribute('aria-hidden', 'false');

    if (getCustomerToken()) {
        showCustomerAccount();
    } else {
        showGuestAccount('login');
    }
}

function closeAccount() {
    accountModal?.classList.remove('open');
    accountOverlay?.classList.remove('open');
    accountModal?.setAttribute('aria-hidden', 'true');
}

function showGuestAccount(tab = 'login') {
    if (!accountGuest || !accountSignedIn || !loginForm || !registerForm) return;

    accountGuest.hidden = false;
    accountSignedIn.hidden = true;

    loginForm.hidden = tab !== 'login';
    registerForm.hidden = tab !== 'register';

    document.querySelectorAll('[data-auth-tab]').forEach(button => {
        button.classList.toggle('active', button.dataset.authTab === tab);
    });

    setAuthMessage('');
}

function showCustomerAccount() {
    if (!accountGuest || !accountSignedIn) return;

    accountGuest.hidden = true;
    accountSignedIn.hidden = false;

    accountWelcome.textContent = currentCustomer?.name
        ? `Welcome, ${currentCustomer.name}`
        : 'Your account';

    loadCustomerOrders();
}

async function loadCustomerProfile() {
    if (!getCustomerToken()) {
        currentCustomer = null;
        return false;
    }

    try {
        const result = await accountRequest('/customer/me');
        currentCustomer = result.user || result;
        return true;
    } catch (error) {
        if (error.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            currentCustomer = null;
            return false;
        }

        throw error;
    }
}

async function handleAuthSubmit(event, endpoint) {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = 'Please wait...';
    setAuthMessage('');

    try {
        let data;

        if (endpoint === '/login') {
            data = {
                email: document.getElementById('loginEmail').value.trim(),
                password: document.getElementById('loginPassword').value
            };
        } else {
            const password =
                document.getElementById('registerPassword').value;

            const confirmation =
                document.getElementById('registerPasswordConfirmation').value;

            if (password !== confirmation) {
                throw new Error('Passwords do not match.');
            }

            data = {
                name: document.getElementById('registerName').value.trim(),
                email: document.getElementById('registerEmail').value.trim(),
                password,
                password_confirmation: confirmation
            };
        }

        const result = await accountRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!result.token) {
            throw new Error(
                'The API did not return a token. Check the authentication controller response.'
            );
        }

        localStorage.setItem(TOKEN_KEY, result.token);
        currentCustomer = result.user || null;

        if (!currentCustomer) {
            await loadCustomerProfile();
        }

        form.reset();
        setAuthMessage('Authentication successful.');

        showCustomerAccount();
    } catch (error) {
        setAuthMessage(error.message || 'Authentication failed.', true);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

loginForm?.addEventListener('submit', event => {
    handleAuthSubmit(event, '/login');
});

registerForm?.addEventListener('submit', event => {
    handleAuthSubmit(event, '/register');
});

document.querySelectorAll('[data-auth-tab]').forEach(button => {
    button.addEventListener('click', () => {
        showGuestAccount(button.dataset.authTab);
    });
});

accountButton?.addEventListener('click', openAccount);
accountClose?.addEventListener('click', closeAccount);
accountOverlay?.addEventListener('click', closeAccount);

// =====================================
// CUSTOMER ORDERS
// =====================================

function formatOrderStatus(status) {
    const labels = {
        pending: 'Pending',
        processing: 'Processing',
        shipped: 'Shipped',
        delivered: 'Delivered',
        cancelled: 'Cancelled'
    };

    return labels[String(status || '').toLowerCase()]
        || String(status || 'Unknown');
}

async function loadCustomerOrders() {
    if (!accountOrders) return;

    accountOrders.replaceChildren();
    setOrdersMessage('Loading your orders...');

    try {
        const result = await accountRequest('/customer/orders');
        const orders = Array.isArray(result.data)
            ? result.data
            : Array.isArray(result.orders) ? result.orders : [];

        if (!orders.length) {
            setOrdersMessage('You have not placed any orders yet.');
            return;
        }

        setOrdersMessage('');

        accountOrders.innerHTML = orders.map(order => `
            <article class="account-order">
                <div class="account-order-top">
                    <strong>Order #${Number(order.id)}</strong>
                    <span class="order-status">
                        ${escapeHTML(formatOrderStatus(order.status))}
                    </span>
                </div>

                <p>Total: ${formatPrice(order.total)}</p>

                <p>Date: ${escapeHTML(
                    order.created_at
                        ? new Date(order.created_at).toLocaleDateString()
                        : 'N/A'
                )}</p>

                <button class="order-details-button"
                        type="button"
                        data-customer-order="${Number(order.id)}">
                    View Details
                </button>

                <div class="order-details"
                     id="customerOrderDetails${Number(order.id)}"
                     hidden></div>
            </article>
        `).join('');
    } catch (error) {
        setOrdersMessage(error.message, true);

        if (error.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            currentCustomer = null;
            showGuestAccount('login');
        }
    }
}

accountOrders?.addEventListener('click', async event => {
    const button = event.target.closest('[data-customer-order]');
    if (!button) return;

    const id = Number(button.dataset.customerOrder);
    const details = document.getElementById(`customerOrderDetails${id}`);

    if (!details) return;

    if (!details.hidden) {
        details.hidden = true;
        button.textContent = 'View Details';
        return;
    }

    button.disabled = true;
    button.textContent = 'Loading...';

    try {
        const result = await accountRequest(`/customer/orders/${id}`);
        const order = result.order;

        if (!order) {
            throw new Error('Order details were not returned.');
        }

        const items = Array.isArray(order.items) ? order.items : [];

        details.innerHTML = `
            <p><strong>Order #${Number(order.id)}</strong></p>
            <p>Status: ${escapeHTML(formatOrderStatus(order.status))}</p>
            <p>Total: ${formatPrice(order.total)}</p>
            <p>Delivery address: ${escapeHTML(order.customer_address || '')}</p>
            <p>Items:</p>

            ${items.length ? items.map(item => `
                <p>
                    Product #${Number(item.product_id)}
                    — Quantity: ${Number(item.quantity)}
                    — ${formatPrice(item.price)}
                </p>
            `).join('') : '<p>No item details available.</p>'}
        `;

        details.hidden = false;
        button.textContent = 'Hide Details';
    } catch (error) {
        details.textContent = error.message;
        details.hidden = false;
        button.textContent = 'Hide Details';
    } finally {
        button.disabled = false;
    }
});

refreshOrdersButton?.addEventListener('click', loadCustomerOrders);

logoutButton?.addEventListener('click', async () => {
    try {
        if (getCustomerToken()) {
            await accountRequest('/customer/logout', { method: 'POST' });
        }
    } catch (error) {
        console.warn('Logout request failed:', error.message);
    } finally {
        localStorage.removeItem(TOKEN_KEY);
        currentCustomer = null;

        if (accountOrders) accountOrders.replaceChildren();

        showGuestAccount('login');
        setAuthMessage('You have been logged out.');
    }
});

// =====================================
// CHECKOUT
// =====================================

function openCheckout() {
    if (!cart.length) {
        alert('Your cart is empty.');
        return;
    }

    closeCart();

    if (checkoutMessage) checkoutMessage.textContent = '';

    checkoutModal?.classList.add('open');
    checkoutOverlay?.classList.add('open');
    checkoutModal?.setAttribute('aria-hidden', 'false');

    // Prefill customer details when logged in.
    if (currentCustomer && checkoutForm) {
        const nameInput = checkoutForm.elements.namedItem('customer_name');
        const emailInput = checkoutForm.elements.namedItem('customer_email');

        if (nameInput && !nameInput.value) {
            nameInput.value = currentCustomer.name || '';
        }

        if (emailInput && !emailInput.value) {
            emailInput.value = currentCustomer.email || '';
        }
    }
}

function closeCheckout() {
    checkoutModal?.classList.remove('open');
    checkoutOverlay?.classList.remove('open');
    checkoutModal?.setAttribute('aria-hidden', 'true');
}

checkoutButton?.addEventListener('click', openCheckout);
checkoutClose?.addEventListener('click', closeCheckout);
checkoutOverlay?.addEventListener('click', closeCheckout);

checkoutForm?.addEventListener('submit', async event => {
    event.preventDefault();

    if (!cart.length) {
        checkoutMessage.textContent = 'Your cart is empty.';
        return;
    }

    if (placeOrderButton.disabled) return;

    placeOrderButton.disabled = true;
    placeOrderButton.textContent = 'Placing order...';
    checkoutMessage.textContent = '';

    const formData = new FormData(checkoutForm);

    const orderData = {
        customer_name: String(formData.get('customer_name') || '').trim(),
        customer_email: String(formData.get('customer_email') || '').trim(),
        customer_phone: String(formData.get('customer_phone') || '').trim(),
        customer_address: String(formData.get('customer_address') || '').trim(),
        items: cart.map(item => ({
            product_id: Number(item.id),
            quantity: Number(item.quantity)
        }))
    };

    let orderSucceeded = false;

    try {
        const token = getCustomerToken();

        const response = await fetch(ORDER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = result.errors
                ? Object.values(result.errors).flat().join(' ')
                : result.message || 'Could not place your order.';

            throw new Error(message);
        }

        if (!result.order?.id) {
            throw new Error('The server response was unexpected.');
        }

        orderSucceeded = true;

        checkoutMessage.textContent =
            `Order placed successfully! Order number: ${result.order.id}`;

        cart = [];
        saveCart();
        checkoutForm.reset();

        // Refresh orders if the customer is logged in.
        if (getCustomerToken()) {
            setTimeout(() => {
                if (accountModal?.classList.contains('open')) {
                    loadCustomerOrders();
                }
            }, 500);
        }

        await loadProducts();

        setTimeout(() => {
            closeCheckout();
            if (checkoutMessage) checkoutMessage.textContent = '';
        }, 3000);
    } catch (error) {
        checkoutMessage.textContent =
            error.message || 'Something went wrong. Please try again.';
    } finally {
        // Always restore the button so another order can be placed.
        placeOrderButton.disabled = false;
        placeOrderButton.textContent = 'Place Order';
    }
});

// =====================================
// SEARCH AND CATEGORIES
// =====================================

searchInput?.addEventListener('input', renderProducts);

document.querySelectorAll('.category').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelector('.category.active')?.classList.remove('active');
        button.classList.add('active');

        selectedCategory = button.dataset.category;
        renderProducts();
    });
});

// =====================================
// KEYBOARD AND SESSION RESTORE
// =====================================

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeCart();
        closeProductDetails();
        closeCheckout();
        closeAccount();
    }
});

(async function restoreCustomerSession() {
    if (!getCustomerToken()) return;

    try {
        const authenticated = await loadCustomerProfile();

        if (!authenticated) {
            localStorage.removeItem(TOKEN_KEY);
            return;
        }

        if (accountButton) accountButton.textContent = 'My Account';
    } catch (error) {
        console.error('Could not restore customer session:', error);
    }
})();

// =====================================
// INITIALIZE
// =====================================

renderCart();
loadProducts();
