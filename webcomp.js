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
					box-sizing: content-box;
					height: 1lh;
					padding-block: .25em;
					padding-inline-start: .25em;
					padding-inline-end: .5em;
					transition: 130ms;
					cursor: pointer;
				}
				option:focus,
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

			/** @type {HTMLElement[]} */
			let selectOptions = [];
			let hiddenOptions = [];
			let visibleOptions = [];
			let currentOption;

			const placeholder = this.getAttribute('placeholder');
			const presentationElement = document.createElement('nice-presentation');
			presentationElement.textContent = placeholder || 'Select';

			/** @type {string} */
			let value = this.querySelector('[selected]')?.getAttribute('value') || '';

			const dropdownElement = document.createElement('nice-dropdown');
			const optionListElement = document.createElement('nice-optionlist');

			optionListElement.addEventListener('click', (e) => {
				/** @type {HTMLOptionElement} */

				if (e.target?.tagName === 'OPTION') {
					currentOption = e.target;
					selectCurrrentOption();
				}
			});

			shadow.append(presentationElement);
			shadow.append(dropdownElement);


			const selectCurrrentOption = () => {
				for (let option of selectOptions) {
					option.removeAttribute('selected');
				}

				value = currentOption.value;
				currentOption.setAttribute('selected', '');

				if (currentOption?.textContent) {
					presentationElement.textContent = currentOption?.textContent;
				}
				else {
					presentationElement.innerHTML = '&nbsp;';
				}
			}

			const toggleSearch = () => {
				if(this.hasAttribute('data-search')) {
					this.removeAttribute('tabindex');

					const searchInputWrapper = document.createElement('nice-search_wrapper');
					const searchInput = document.createElement('nice-search');
					searchInput.contentEditable = 'true';
					dropdownElement.insertBefore(searchInputWrapper, dropdownElement.firstChild);
					searchInputWrapper.appendChild(searchInput);

					searchInput.addEventListener('input', (e) => {
						/** @type {HTMLElement} */
						const input = e.target;

						visibleOptions = selectOptions.filter((option) => {
							return option.textContent?.toLowerCase().includes(input?.textContent?.toLowerCase() ?? '')
						});

						hiddenOptions = selectOptions.filter((option) => {
							return !option.textContent?.toLowerCase().includes(input?.textContent?.toLowerCase() ?? '')
						});

						for (let option of selectOptions) {
							option.hidden = hiddenOptions.includes(option);
						}
					});
				}
				else {
					this.tabIndex = 0;
					shadow.querySelector('nice-search_wrapper')?.remove();

					for (let option of selectOptions) {
						option.removeAttribute('hidden');
					}
				}
			}
			toggleSearch();

			dropdownElement.append(optionListElement);


			const addValidNodeToOptions = (node) => {
				if (!node) return;

				if (node.nodeName === 'OPTION') {
					const newOptionElement = node.cloneNode(true);

					if (node.hasAttribute('selected')) {
						currentOption = newOptionElement;
						selectCurrrentOption();
					}

					if (node.hasAttribute('hidden')) {
						hiddenOptions.push(newOptionElement);
					}
					else {
						visibleOptions.push(newOptionElement);
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

			const childListCallback = (records) => {
				for (const record of records) {
					for (const node of record.addedNodes) {
						addValidNodeToOptions(node);
						removeInvalidNodeFromDOM(node);
					}
				}
				this.style.setProperty('--nice-min-width', '0');
				requestAnimationFrame(calculateMinWidth);
			}

			const attributesCallback = (records) => {
				for (const record of records) {
					if (record.attributeName === 'data-search') {
						toggleSearch();
					}
				}
			}

			const calculateMinWidth = () => {
				this.style.setProperty('--nice-min-width', Math.max(optionListElement.offsetWidth, presentationElement.offsetWidth) + 'px');
			}
			requestAnimationFrame(calculateMinWidth);

			for (let node of this.childNodes) {
				addValidNodeToOptions(node);

				requestAnimationFrame(() => {
					removeInvalidNodeFromDOM(node);
				})
			}

			this.childListObserver = new MutationObserver(childListCallback);
			this.attributesObserver = new MutationObserver(attributesCallback);
			this.childListObserver.observe(this, { childList: true });
			this.attributesObserver.observe(this, { attributes: true });

			this.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();

					let nextOption;

					if (e.key === 'ArrowDown') {
						nextOption = visibleOptions[visibleOptions.indexOf(currentOption) + 1]
							?? visibleOptions[0];
					}
					else if (e.key === 'ArrowUp') {
						nextOption = visibleOptions[visibleOptions.indexOf(currentOption) - 1]
							?? visibleOptions[visibleOptions.length - 1];
					}

					if (!nextOption) return;

					currentOption = nextOption;

					selectCurrrentOption();
				}
			});
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


