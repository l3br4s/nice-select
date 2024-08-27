// @ts-check
customElements.define(
	'nice-select',
	class extends HTMLElement {

		connectedCallback() {
			const minWidth = '8em';
			const css = new CSSStyleSheet();

			css.replace(`
				:host, *, *::before, *::after {
					box-sizing: border-box;
				}
				:host {
					--nice-padding-top: .375em;
					--nice-padding-bottom: .375em;
					--nice-padding-start: .625em;
					--nice-padding-end: .625em;
					--nice-min-width: ${minWidth};
					display: inline-block;
					position: relative;
					z-index: 1;
					padding-top: var(--nice-padding-top);
					padding-bottom: var(--nice-padding-bottom);
					padding-inline-start: var(--nice-padding-start);
					padding-inline-end: var(--nice-padding-end);
					min-width: max(var(--nice-min-width), ${minWidth});
				}
				nice-dropdown {
					display: flex;
					flex-direction: column;
					gap: .25em;
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					padding-top: calc(1lh + var(--nice-padding-top) + var(--nice-padding-bottom));
					padding-bottom: var(--nice-padding-bottom);
					padding-inline-start: var(--nice-padding-start);
					padding-inline-end: var(--nice-padding-end);
					background: white;
					border: 1px solid;
					border-radius: .25em;
					z-index: -1;
				}
				nice-optionlist {
					display: block;
					overflow-y: scroll;
					scrollbar-width: thin;
					padding-inline-end: .3em;
				}
				option {
					padding-block: .25em;
					padding-inline-start: .25em;
					padding-inline-end: .5em;
					transition: 130ms;
					cursor: pointer;
				}
				option:hover {
					background: #f0f0f0;
				}
				option[selected] {
					background: #444;
					color: white;
				}
				nice-search_wrapper {
					display: block;
					overflow: hidden;
					height: calc(1lh + .5em);
					padding: .25em .5em;
					border: 1px dotted;
					border-radius: .25em;
				}
				nice-search_wrapper:focus-within {
					outline: 1px solid
				}
				nice-search {
					display: block;
					width: 100%;
					cursor: text;
					white-space: nowrap;
					overflow-y: clip;
					overflow-x: scroll;
				}
				nice-search:focus {
					outline: none;
				}
				nice-search br {
					display: none;
				}
				nice-search:empty:before {
					content: '${this.dataset.searchPlaceholder || ''}';
					position: absolute;
					opacity: .5;
				}
				nice-presentation {
					display: block;
				}
			`);

			const shadow = this.attachShadow({ mode: 'open' });
			shadow.adoptedStyleSheets = [css];

			const placeholder = this.getAttribute('placeholder');
			const presentationElement = document.createElement('nice-presentation');
			presentationElement.textContent = placeholder || 'Select';

			/** @type {string} */
			let value = this.querySelector('[selected]')?.getAttribute('value') || '';

			const dropdownElement = document.createElement('nice-dropdown');
			const optionListElement = document.createElement('nice-optionlist');

			optionListElement.addEventListener('click', (e) => {
				/** @type {HTMLOptionElement} */
				const option = e.target;

				if (option?.tagName === 'OPTION') {
					value = option.value || '';

					for (let option of selectOptions) {
						option.removeAttribute('selected');
					}

					option.setAttribute('selected', '');

					if (option?.textContent) {
						presentationElement.textContent = option?.textContent;
					}
					else {
						presentationElement.innerHTML = '&nbsp;';
					}
				}
			});

			shadow.append(presentationElement);
			shadow.append(dropdownElement);

			if(this.hasAttribute('search')) {
				const searchInputWrapper = document.createElement('nice-search_wrapper');
				const searchInput = document.createElement('nice-search');
				searchInput.contentEditable = 'true';
				dropdownElement.appendChild(searchInputWrapper);
				searchInputWrapper.appendChild(searchInput);

				searchInput.addEventListener('input', (e) => {
					/** @type {HTMLElement} */
					const input = e.target;

					for (let option of selectOptions) {
						option.hidden = !option.textContent?.toLowerCase()
										.includes(input?.textContent?.toLowerCase())
						;
					}
				});
			}

			dropdownElement.append(optionListElement);

			/** @type {HTMLElement[]} */
			let selectOptions = [];

			const addValidNodeToOptions = (node) => {
				if (!node) return;

				// if (node.nodeName === 'OPTION'
				// 	&& node.attributes.type?.value === 'radio'
				// ) {
				// 	node.name = 'nice';
				// 	const newOptionElement = document.createElement('label');
				// 	newOptionElement.innerHTML = node.outerHTML + node.placeholder;
				// 	shadow.append(newOptionElement);
				// 	selectOptions.push(newOptionElement);
				// }

				if (node.nodeName === 'OPTION') {
					const newOptionElement = node.cloneNode(true);

					if (node.hasAttribute('selected')) {
						value = newOptionElement.value;
						presentationElement.textContent = newOptionElement.textContent;

						for (let option of selectOptions) {
							option.removeAttribute('selected');
						}
					}

					optionListElement.append(newOptionElement);
					selectOptions.push(newOptionElement);
				}
			}

			const removeInvalidNodeFromDOM = (node) => {
				if (!node) return;

				if (node.nodeName !== 'OPTION') {
					node.remove();
				}
			}

			const observerCallback = (records) => {
				for (const record of records) {
					for (const node of record.addedNodes) {
						addValidNodeToOptions(node);
						removeInvalidNodeFromDOM(node);
					}
				}
				this.style.setProperty('--nice-min-width', '0');
				requestAnimationFrame(calculateMinWidth);
			}

			const calculateMinWidth = () => {
				console.log(optionListElement, optionListElement.offsetWidth);
				console.log(presentationElement, presentationElement.offsetWidth);

				this.style.setProperty('--nice-min-width', Math.max(optionListElement.offsetWidth, presentationElement.offsetWidth) + 'px');
			}
			requestAnimationFrame(calculateMinWidth);

			for (let node of this.childNodes) {
				addValidNodeToOptions(node);

				requestAnimationFrame(() => {
					removeInvalidNodeFromDOM(node);
				})
			}

			this.observer = new MutationObserver(observerCallback);
			this.observer.observe(this, { childList: true });
		}
	}
);



// const selects = document.querySelectorAll('select');

// for (let select of selects) {
// 	const niceSelect = document.createElement('nice-select');

// 	for (let option of select.options) {
// 		const input = document.createElement('input');
// 		input.type = 'radio';
// 		input.value = option.value;
// 		input.name = 'nice';
// 		input.placeholder = option.text;
// 		niceSelect.append(input);
// 	}

// 	if (select.hasAttribute('data-search')) {
// 		niceSelect.setAttribute('search', '');
// 	}

// 	select.replaceWith(niceSelect);
// }


