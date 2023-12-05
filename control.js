// document.querySelectorAll('.content').forEach(function (contentBlock) {
//     console.log("on click registered")
//     contentBlock.addEventListener('click', function () {
//         this.querySelector('.modal').style.display = 'flex';
//         document.querySelectorAll('.content').forEach(function (c) {
//             if (c !== contentBlock) {
//                 c.style.display = 'none';
//             }
//         });
//     });
// });

function hideAllContent() {
    document.querySelectorAll('.content').forEach(function (c) {
        c.style.display = 'none';
    });
}

function showAllContent() {
    document.querySelectorAll('.content').forEach(function (c) {
        c.style.display = 'flex';
    });
}

// Function to open a modal
function openModal(modalId) {
    var modal = document.querySelector('.modal[data-modal-id="' + modalId + '"]');
    if (modal) {
        modal.style.display = "flex";
        hideAllContent();
    }
}

// Function to close a modal
function closeModal(modal) {
    modal.style.display = "none";
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(function (modal) {
        closeModal(modal);
    });
}

// Adding click event listeners to content divs
document.querySelectorAll('.content').forEach(function (content) {
    content.addEventListener('click', function (event) {
        var modalId = content.getAttribute('data-modal-id');
        openModal(modalId);
        event.stopPropagation();
    });
});

// Adding click event listeners to close buttons
document.querySelectorAll('.close-button').forEach(function (button) {
    button.addEventListener('click', function () {
        var modal = button.closest('.modal');
        closeModal(modal);
        showAllContent();
    });
});

document.getElementById("bottom").addEventListener('click', function (event) {
    closeAllModals();
    showAllContent();
});

// Adding click event listeners to close buttons
document.querySelectorAll('.close-button').forEach(function (button) {
    button.addEventListener('click', function () {
        var modal = button.closest('.modal');
        closeModal(modal);
        showAllContent();
    });
});
