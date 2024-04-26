const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

var detailBtns = $$('.details-btn')
var modalBtns = $$('.item-modal')
var mesBtns = $$('.message')
var hanldeOrderForm = document.forms['delete-course-form']
var rejectBtn = $('.btn-delete')
var acceptBtn = $('.btn-accept')
var signBtns = $$('.sign-btn')
var idOrderArr = []
var idOrder

document.addEventListener('DOMContentLoaded', function () {
    const orderSection = document.querySelector('.table-order-section');

    orderSection.addEventListener('click', function (event) {
        const target = event.target;

        if (target.closest('.details-btn')) {
            handleDetailButtonClick(target.closest('.details-btn'));
        } else if (target.closest('.btn-accept')) {
            handleAcceptButtonClick(target.closest('.btn-accept'));
        } else if (target.closest('.btn-delete')) {
            handleRejectButtonClick(target.closest('.btn-delete'));
        }
    });

    // table.addEventListener('click', function (event) {
    //     const target = event.target;
	// 	console.log('Clicked on:', target);
	// 	if (!target) return;
        
	// 	// Using Event Delegation
    //     // Handling Detail Button clicks
    //     if (target.classList.contains('details-btn') || target.closest('.details-btn')) {
    //         handleDetailButtonClick(target);
    //     }
        
    //     // Handling Accept Button clicks
    //     if (target.classList.contains('btn-accept') || target.closest('.btn-accept')) {
    //         handleAcceptButtonClick(target);
    //     }

    //     // Handling Reject Button clicks
    //     if (target.classList.contains('btn-delete') || target.closest('.btn-delete')) {
    //         handleRejectButtonClick(target);
    //     }
    // });

	// Initial badge color update for existing items
	updateBadgeColors();
	
	// Observer pattern
	const socket = io();
    socket.on('orderUpdate', (data) => {
        // console.log('Order update received:', data.order);
        updateOrderTable(data.order);
    });
});

function handleDetailButtonClick(target) {
    const detailBtn = target.closest('.details-btn');
	if (!detailBtn) return;  // Ensure we have the right element
    const id = detailBtn.getAttribute('data-id');
	// console.log('Clicked on Order ID:', id);
    
    // Code to toggle modal visibility
    toggleModalsAndMessages(id);

    // Update buttons visibility based on status
    updateButtonVisibility(detailBtn, id);
}

function handleAcceptButtonClick(target) {
    const acceptBtn = target.closest('.btn-accept');
	// console.log('Accept button clicked:', acceptBtn);
    const id = acceptBtn.getAttribute('data-id');

    // Perform Accept action, e.g., submitting a form or sending a request
    submitOrderChange(id, 'accept');
}

function handleRejectButtonClick(target) {
    const rejectBtn = target.closest('.btn-delete');
    const id = rejectBtn.getAttribute('data-id');

    // Perform Reject action
    submitOrderChange(id, 'reject');
}

function toggleModalsAndMessages(id) {
    // Hide all modals and messages
    document.querySelectorAll('.item-modal, .message').forEach(el => {
        el.classList.add('d-none');
    });

    // Show the correct modal and message
    document.querySelectorAll(`.item-modal[data-id="${id}"], .message[data-id="${id}"]`).forEach(el => {
        el.classList.remove('d-none');
    });
}

function updateButtonVisibility(detailBtn, id) {
    const status = detailBtn.getAttribute('data-status');
    const acceptBtn = document.querySelector('.btn-accept');
    const rejectBtn = document.querySelector('.btn-delete');
    if (status !== 'pending') {
        acceptBtn.classList.add('d-none');
        rejectBtn.classList.add('d-none');
    } else {
        acceptBtn.classList.remove('d-none');
        rejectBtn.classList.remove('d-none');
        acceptBtn.setAttribute('data-id', id);
        rejectBtn.setAttribute('data-id', id);
    }
}

function submitOrderChange(orderId, actionType) {
	// console.log('Submitting Order Change:', orderId, actionType);
    const formAction = `/order/manage-order/${orderId}/${actionType}?_method=PUT`;
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = formAction;
    document.body.appendChild(form);
    form.submit();
}

function updateBadgeColors() {
    const signBtns = document.querySelectorAll('.sign-btn');
    signBtns.forEach(btn => {
        btn.classList.remove('bg-success', 'bg-primary', 'bg-danger');
        switch (btn.textContent.trim().toLowerCase()) {
            case "successful":
                btn.classList.add('bg-success');
                break;
            case "pending":
                btn.classList.add('bg-primary');
                break;
            case "cancelled":
                btn.classList.add('bg-danger');
                break;
        }
    });
}

function updateOrderTable(order) {
    const table = document.querySelector('.table-order tbody');
    if (!table) return;

    // Create a new table row element and set its data-id
    const row = document.createElement('tr');
	row.className = 'item-order';
    row.setAttribute('data-id', order._id); // Setting data-id for potential future use
    row.innerHTML = `
        <th scope='row'>1</th>
        <td>${order.idAccount.lastName} ${order.idAccount.firstName}</td>
        <td>${order.idAccount.email}</td>
        <td>${order.idAccount.phone}</td>
        <td class="d-flex justify-content-center">
            <span class="badge rounded-pill bg-primary sign-btn">${order.status}</span>
        </td>
        <td class='details-btn' data-id="${order._id}" data-status="${order.status}">
            <a href='' data-bs-toggle='modal' data-bs-target='#product-details'>
                <i class="fa-solid fa-ellipsis"></i>
            </a>
        </td>
    `;

    // Insert the new row at the beginning of the table
    if (table.firstChild) {
        table.insertBefore(row, table.firstChild);
    } else {
        table.appendChild(row); // If no rows are there, just append normally
    }

	console.log('Order added:', order);
    // Assuming 'order.products' and 'order.messages' are included in the data from the server
    updateModalContent(order);

    // Re-calculate and update the row index for all rows
    updateRowIndices();

    // Update the badge colors to reflect new statuses correctly
    updateBadgeColors();
}

// Function to update row indices based on their position in the table
function updateRowIndices() {
    const rows = document.querySelectorAll('.table-order tbody tr');
    rows.forEach((row, index) => {
        const firstCell = row.querySelector('th');
        if (firstCell) {
            firstCell.textContent = index + 1; // Update row number starting from 1
        }
    });
}

function updateModalContent(order) {
    const modalBody = document.querySelector('#product-details .modal-body');
    if (!modalBody) return;

    // Find the existing table or create a new one if it does not exist
    let productTable = modalBody.querySelector('.table.table-bordered');
    let tbody;
    if (!productTable) {
        productTable = document.createElement('table');
        productTable.className = 'table table-bordered table-fixed';
        productTable.innerHTML = '<thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Quantity</th><th>Price</th></tr></thead>';
        tbody = document.createElement('tbody');
        productTable.appendChild(tbody);
        modalBody.appendChild(productTable);
    } else {
        tbody = productTable.querySelector('tbody');
    }

    // Ensure tbody is present
    if (!tbody) {
        tbody = document.createElement('tbody');
        productTable.appendChild(tbody);
    }

    // Append new rows to tbody with specific classes and data attributes
    order.detail.forEach(item => {
        const product = item.idProduct; // Assuming idProduct contains all product details
        const productRow = document.createElement('tr');
        productRow.className = 'item-modal d-none'; // Add class 'd-none' to initially hide rows
        productRow.setAttribute('data-id', order._id); // Set data-id to order ID for unique identification
        productRow.innerHTML = `
            <td><div class='img'><a href='#'><img class='img-product' src='${product.image}' alt='Product Image' /></a></div></td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${item.quantity}</td>
            <td>${product.price}</td>
        `;
        tbody.appendChild(productRow);
    });

    // Handle the message section
    let messageDiv = modalBody.querySelector('.message[data-id="' + order._id + '"]');
    if (order.message) {
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.className = 'message d-none'; // Initially hidden
            messageDiv.setAttribute('data-id', order._id);
            modalBody.appendChild(messageDiv);
        }
        messageDiv.classList.remove('d-none'); // Show message if present
        messageDiv.innerHTML = `<strong>Message:</strong><p>${order.message}</p>`;
    } else if (messageDiv) {
        // If no message is provided but the message div exists, keep it hidden
        messageDiv.classList.add('d-none');
    }
}

// document.addEventListener('DOMContentLoaded', function () {
// 	const table = document.querySelector('.table-order');
// 	// Handle details button
// 	for (const detailBtn of detailBtns) {
// 		if (detailBtn.getAttribute('data-status') != 'pending') {
// 			idOrderArr.push(detailBtn.getAttribute('data-id'))
// 		}

// 		detailBtn.onclick = function () {
// 			for (const modalBtn of modalBtns) {
// 				modalBtn.classList.add("d-none")
// 			}
// 			for (const mesBtn of mesBtns) {
// 				mesBtn.classList.add("d-none")
// 			}

// 			id = detailBtn.getAttribute('data-id')
// 			idOrder = id

// 			for (const orderBtn of modalBtns) {
// 				if (orderBtn.getAttribute('data-id') == id) {
// 					orderBtn.classList.remove("d-none")
// 				}
// 			}
// 			for (const orderBtn of mesBtns) {
// 				if (orderBtn.getAttribute('data-id') == id) {
// 					orderBtn.classList.remove("d-none")
// 				}
// 			}

// 			if (idOrderArr.includes(id)) {
// 				acceptBtn.classList.add('d-none')
// 				rejectBtn.classList.add('d-none')
// 			} else {
// 				acceptBtn.classList.remove('d-none')
// 				rejectBtn.classList.remove('d-none')
// 				acceptBtn.setAttribute('data-id',id)
// 				rejectBtn.setAttribute('data-id',id)
// 			}
// 		}
// 	}

// 	// Handle reject and accept button
// 	rejectBtn.onclick = function () {
// 		if (idOrder) {
// 			hanldeOrderForm.action = '/order/manage-order/' + idOrder + '/reject?_method=PUT'
// 			hanldeOrderForm.submit()
// 		}
// 	}
// 	acceptBtn.onclick = function (e) {
// 		e.preventDefault()
// 		if (idOrder) {
// 			hanldeOrderForm.action = '/order/manage-order/' + idOrder + '/accept?_method=PUT'
// 			hanldeOrderForm.submit()
// 		}
// 	}

// 	// Handle sign button
// 	for (var btn of signBtns) {
// 		btn.classList.remove('bg-success', 'bg-primary', 'bg-danger')
// 		if (btn.textContent == "successful") {
// 			btn.classList.add('bg-success')
// 		} else if (btn.textContent == "pending") {
// 			btn.classList.add('bg-primary')
// 		} else if (btn.textContent == "cancelled") {
// 			btn.classList.add('bg-danger')
// 		}
// 	}
// })