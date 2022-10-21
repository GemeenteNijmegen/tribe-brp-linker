/**
 * Add a copy button to all inputs with the data-copy attribute set
 * 
 * Buttons get inserted directly after the input in source order, and
 * will copy the .value attribute of the input element, with whitespace
 * trimmed.
 */
function addCopyToClipboardButtons() {
  document.querySelectorAll('input[data-copy]').forEach((el) => {
    const button = document.createElement('button');
    button.innerHTML = '📋 kopieer';
    el.parentNode.appendChild(button);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      navigator.clipboard.writeText(el.value.trim());
    });
  });
}

addCopyToClipboardButtons();