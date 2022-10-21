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

function htmlStringToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

function formAsURLSearchParams(form) {
  const data = new URLSearchParams();
  for (const pair of new FormData(form)) {
      data.append(pair[0], pair[1]);
  }
  return data;
}

function replaceElement(data) {
  const element = htmlStringToElement(data);
  const old = document.getElementById(element.id);
  old.replaceWith(element);
}

function refreshXsrfToken(token) {
  document.querySelectorAll("input[name='xsrf_token']").forEach(el => el.value = token);
}

function addFormEventHandlers() {
  document.addEventListener('submit', event => {
      event.preventDefault();
      const data = formAsURLSearchParams(event.target);
      post(data, event.submitter);
  });
}

function post(params, sendingButton) {
  sendingButton.disabled = true;
  sendingButton.dataset.originalValue = sendingButton.value;
  sendingButton.value = 'Bezig…';
  fetch(document.location.href, {
    method: 'POST',
    credentials: "same-origin",
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'accept': 'application/json' },
    body: params
  })
  .then(response => response.json())
  .then(data => {
    console.log(data);
    sendingButton.disabled = false;
    sendingButton.value = sendingButton.dataset.originalValue;
    replaceElement(data.html);
    refreshXsrfToken(data.xsrf_token);
  })
  .catch(error => {
    console.error(error);
    sendingButton.disabled = false;
    sendingButton.value = sendingButton.dataset.originalValue;
  });
}

addFormEventHandlers();
addCopyToClipboardButtons();
