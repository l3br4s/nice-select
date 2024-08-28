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
				}
				option:not([disabled]) {
					cursor: pointer;
				}
				option:not([disabled]):focus,
				option:not([disabled]):hover {
					background: #f0f0f0;
				}
				option[selected] {
					background: #444;
					color: white;
				}
				option[disabled] {
					color: inherit;
					opacity: .5;
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
					position: absolute;
					opacity: .5;
				}
				nice-presentation {
					display: block;
				}
			`);

			let searchPlaceHolderCSS = new CSSStyleSheet();
			const updateSearchPlaceHolderCSS = () => {
				searchPlaceHolderCSS.replace(`
					nice-search:empty:before {
						content: '${this.dataset.searchPlaceholder || ''}';
					}
				`);
			}
			updateSearchPlaceHolderCSS();

			const shadow = this.attachShadow({ mode: 'open' });
			shadow.adoptedStyleSheets = [css, searchPlaceHolderCSS];

			/** @type {HTMLElement[]} */
			let selectOptions = [];
			let availableOptions = [];
			let visibleOptions = [];
			let currentOption;
			let focusElement;
			let searchInputElement;

			let placeholder = this.getAttribute('placeholder');
			const presentationElement = document.createElement('nice-presentation');
			presentationElement.textContent = placeholder || 'Select';

			/** @type {string} */
			let value = this.querySelector('[selected]')?.getAttribute('value') || '';

			const dropdownElement = document.createElement('nice-dropdown');
			const optionListElement = document.createElement('nice-optionlist');

			optionListElement.addEventListener('click', (e) => {
				if (e.target?.tagName === 'OPTION') {
					currentOption = e.target;
					selectCurrrentOption();
					focusElement?.focus();
				}
			});

			shadow.append(presentationElement);
			shadow.append(dropdownElement);


			const updateAvailableOptions = () => {
				availableOptions = visibleOptions.filter((option) => {
					return !option.hasAttribute('disabled');
				})
			}

			const selectCurrrentOption = () => {
				if (!currentOption || currentOption?.hasAttribute('disabled')) return;

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
					searchInputElement = document.createElement('nice-search');
					searchInputElement.contentEditable = 'true';
					dropdownElement.insertBefore(searchInputWrapper, dropdownElement.firstChild);
					searchInputWrapper.appendChild(searchInputElement);

					searchInputElement.addEventListener('input', (e) => {
						visibleOptions = selectOptions.filter((option) => {
							return option.textContent?.toLowerCase().includes(e.target?.textContent?.toLowerCase() ?? '')
						});

						updateAvailableOptions();

						for (let option of selectOptions) {
							option.hidden = !visibleOptions.includes(option);
						}
					});

					focusElement = searchInputElement;
				}
				else {
					this.tabIndex = 0;
					shadow.querySelector('nice-search_wrapper')?.remove();

					for (let option of selectOptions) {
						option.removeAttribute('hidden');
					}

					focusElement = presentationElement;
				}
			}
			toggleSearch();

			dropdownElement.append(optionListElement);


			const addValidNodeToOptions = (node) => {
				if (node?.nodeName !== 'OPTION') return;

				const newOptionElement = node.cloneNode(true);

				if (node.hasAttribute('selected')) {
					if (node.hasAttribute('disabled')) {
						newOptionElement.removeAttribute('selected');
					}
					else {
						currentOption = newOptionElement;
						selectCurrrentOption();
					}
				}

				if (!node.hasAttribute('hidden')) {
					visibleOptions.push(newOptionElement);

					if (!node.hasAttribute('disabled')) {
						availableOptions.push(newOptionElement);
					}
				}

				optionListElement.append(newOptionElement);
				selectOptions.push(newOptionElement);
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
					console.log(record);
					switch (record.attributeName) {
						case 'data-search':
							toggleSearch();
							break;
						case 'data-search-placeholder':
							updateSearchPlaceHolderCSS();
							break;
						case 'placeholder':
							placeholder = record.target.attributes.placeholder.value;
							presentationElement.textContent = value || placeholder;
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
			this.attributesObserver.observe(this, {
				attributes: true,
				attributeFilter: ['data-search', 'data-search-placeholder', 'placeholder']
			});

			this.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();
					updateAvailableOptions();

					let nextOption;

					if (e.key === 'ArrowDown') {
						nextOption = availableOptions[availableOptions.indexOf(currentOption) + 1]
							?? availableOptions[0];
					}
					else if (e.key === 'ArrowUp') {
						nextOption = availableOptions[availableOptions.indexOf(currentOption) - 1]
							?? availableOptions[availableOptions.length - 1];
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


