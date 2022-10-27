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

/**
 * Transform an html-string to an actual nodetree
 * 
 * @param {string} html the valid HTML as as string
 * @returns {Node} the html node
 */
function htmlStringToElement(html) {
  var template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

/**
 * Convert a form's formData to URLSearchParams.
 * 
 * @param {Node} form a form node
 * @returns {URLSearchParams} the formData as urlsearchparams
 */
function formAsURLSearchParams(form) {
  const data = new URLSearchParams();
  for (const pair of new FormData(form)) {
      data.append(pair[0], pair[1]);
  }
  return data;
}

/**
 * Replace a DOM-element with another element
 * 
 * It will replace an element with the same ID value
 * as the replacing element.
 * 
 * @param {Node} data 
 */
function replaceElement(data) {
  const element = htmlStringToElement(data);
  const old = document.getElementById(element.id);
  old.replaceWith(element);
}

/**
 * Replace the value for all inputs with name=xsrf_token
 * 
 * @param {*} token 
 */
function refreshXsrfToken(token) {
  document.querySelectorAll("input[name='xsrf_token']").forEach(el => el.value = token);
}

/**
 * Add form submit listener to document
 * 
 * Submit will call post() with the current form's data + action url
 * NB: It will always 'POST', even if the form method = 'GET'.
 */
function addFormEventHandlers() {
  document.addEventListener('submit', event => {
      event.preventDefault();
      const data = formAsURLSearchParams(event.target);
      post(event.target.action, data, event.submitter);
  });
}

/**
 * Do a post request
 * 
 * This function assumes a form is submitted. It will
 * add visual feedback to the submit-button used, and 
 * handle the returned data:
 * - if a data.html-key is returned, it will replace the nodetree
 *   with the same ID as the return data.html-nodetree
 * - if a data.redirect_to key is returned, it will redirect to the 
 *   provided URL.
 * 
 * @param {string} url
 * @param {URLSearchParams} params 
 * @param {Node} sendingButton 
 */
function post(url, params, sendingButton) {
  sendingButton.disabled = true;
  sendingButton.dataset.originalValue = sendingButton.value;
  sendingButton.value = 'Bezig…';
  fetch(url, {
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
    if(data.xsrf_token) {
      refreshXsrfToken(data.xsrf_token);
    }
    if(data.html) {
      replaceElement(data.html);
    }
    if(data.redirect_to) {
      window.location.replace(data.redirect_to);
    }
  })
  .catch(error => {
    console.error(error);
    sendingButton.disabled = false;
    sendingButton.value = sendingButton.dataset.originalValue;
  });
}

addFormEventHandlers();
addCopyToClipboardButtons();
