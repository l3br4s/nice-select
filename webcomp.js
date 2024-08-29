// @ts-check
customElements.define(
	'nice-select',
	class extends HTMLElement {
		static formAssociated = true;
		static observedAttributes = ['data-search', 'data-search-placeholder', 'placeholder', 'disabled'];


		constructor() {
			super();
			this.internals = this.attachInternals();

			this.dropdownElement = document.createElement('nice-dropdown');
			this.optionListElement = document.createElement('nice-optionlist');
			this.focusElement;
			this.searchInputElement;

			this.placeholder = this.getAttribute('placeholder');
			this.presentationElement = document.createElement('nice-presentation');
			this.presentationElement.textContent = this.placeholder || 'Select';

			this.allOptions = [];
			this.availableOptions = [];
			this.visibleOptions = [];

			this.shadow = this.attachShadow({
				mode: 'open',
				// delegatesFocus: true
			});


			this.toggleSearch = () => {
				if (this.searchEnabled && this.hasAttribute('data-search')) return;
				this.searchEnabled = this.hasAttribute('data-search');

				if(this.searchEnabled) {
					const searchInputWrapper = document.createElement('nice-search_wrapper');
					this.searchInputElement = document.createElement('nice-search');
					this.searchInputElement.contentEditable = 'true';
					this.dropdownElement?.insertBefore(searchInputWrapper, this.dropdownElement.firstChild);
					searchInputWrapper.appendChild(this.searchInputElement);

					this.searchInputElement.addEventListener('input', (e) => {
						this.visibleOptions = this.allOptions.filter((option) => {
							return option.textContent?.toLowerCase().includes(e.target?.textContent?.toLowerCase() ?? '')
						});

						this.updateAvailableOptions();

						for (let option of this.allOptions) {
							option.hidden = !this.visibleOptions.includes(option);
						}
					});

					this.focusElement = this.searchInputElement;
					this.onfocus = () => {
						this.searchInputElement.focus();
					}
				}
				else {
					this.shadow.querySelector('nice-search_wrapper')?.remove();

					for (let option of this.allOptions) {
						option.removeAttribute('hidden');
					}

					this.focusElement = this.presentationElement;
				}
			}


			this.updateAvailableOptions = () => {
				this.availableOptions = this.visibleOptions.filter((option) => {
					return !option.hasAttribute('disabled');
				})
			}


			this.selectCurrrentOption = () => {
				if (!this.currentOption || this.currentOption?.hasAttribute('disabled')) return;

				for (let option of this.allOptions) {
					option.removeAttribute('selected');
				}

				this.submitValue = this.currentOption.value;
				this.internals.setFormValue(this.submitValue || null);

				if (this.submitValue) {
					this.internals.states.add('valid');
					this.internals.setValidity({valueMissing: false});
				}
				else {
					this.internals.states.delete('valid');
					this.internals.setValidity({valueMissing: true}, 'value is empty');
				}

				this.currentOption.setAttribute('selected', '');

				if (this.currentOption?.textContent) {
					this.presentationElement.textContent = this.currentOption?.textContent;
				}
				else {
					this.presentationElement.innerHTML = '&nbsp;';
				}
			}


			this.updateSearchPlaceHolderCSS = (placeholder) => {
				this.searchPlaceHolderCSS?.replace(`
					nice-search:empty:before {
						content: '${placeholder || ''}';
					}
				`);
			}


			this.toggleDisabled = () => {
				if (this.hasAttribute('disabled')) {
					this.presentationElement.setAttribute('inert', '');
					this.dropdownElement?.setAttribute('inert', '');
				}
				else {
					this.presentationElement.removeAttribute('inert');
					this.dropdownElement?.removeAttribute('inert');
				}
			}
		}



		connectedCallback() {
			const minWidth = '8em';
			const css = new CSSStyleSheet();
			this.searchPlaceHolderCSS = new CSSStyleSheet();
			this.updateSearchPlaceHolderCSS(this.dataset.searchPlaceholder);
			this.shadow.adoptedStyleSheets = [css, this.searchPlaceHolderCSS];

			this.internals.setValidity({
				valueMissing: true,
			}, 'value is empty');

			this.tabIndex = 0;

			this.optionListElement.addEventListener('click', (e) => {
				if (e.target?.tagName === 'OPTION') {
					this.currentOption = e.target;
					this.selectCurrrentOption();
					this.focusElement?.focus();
				}
			});


			this.shadow.append(this.presentationElement);
			this.shadow.append(this.dropdownElement);


			this.dropdownElement.append(this.optionListElement);


			const addValidNodeToOptions = (node, parent = this.optionListElement) => {
				if (node?.nodeName === 'OPTGROUP') {
					const newOptgroupElement = node.cloneNode();
					this.optionListElement?.append(newOptgroupElement);

					for (const child of node.children) {
						addValidNodeToOptions(child, newOptgroupElement);
					}
				}

				if (node?.nodeName !== 'OPTION') return;
				if (!node?.textContent.trim()) return;

				const newOptionElement = node.cloneNode(true);

				if (newOptionElement.hasAttribute('selected')) {
					if (newOptionElement.hasAttribute('disabled')) {
						newOptionElement.removeAttribute('selected');
					}
					else {
						this.currentOption = newOptionElement;
						this.selectCurrrentOption();
					}
				}

				if (!newOptionElement.hasAttribute('hidden')) {
					this.visibleOptions.push(newOptionElement);

					if (!newOptionElement.hasAttribute('disabled')) {
						this.availableOptions.push(newOptionElement);
					}
				}

				if (!newOptionElement.value) {
					newOptionElement.value = newOptionElement.textContent;
				}

				parent?.append(newOptionElement);
				this.allOptions.push(newOptionElement);
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


			const calculateMinWidth = () => {
				this.style.setProperty('--nice-min-width', Math.max(this.optionListElement?.offsetWidth ?? 0, this.presentationElement?.offsetWidth ?? 0) + 'px');
			}
			requestAnimationFrame(calculateMinWidth);


			for (let node of this.childNodes) {
				addValidNodeToOptions(node);

				requestAnimationFrame(() => {
					removeInvalidNodeFromDOM(node);
				})
			}


			this.childListObserver = new MutationObserver(childListCallback);
			this.childListObserver.observe(this, { childList: true });


			this.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
					e.preventDefault();
					this.updateAvailableOptions();

					let nextOption;

					if (e.key === 'ArrowDown') {
						nextOption = this.availableOptions[this.availableOptions.indexOf(this.currentOption) + 1]
							?? this.availableOptions[0];
					}
					else if (e.key === 'ArrowUp') {
						nextOption = this.availableOptions[this.availableOptions.indexOf(this.currentOption) - 1]
							?? this.availableOptions[this.availableOptions.length - 1];
					}

					if (!nextOption) return;

					this.currentOption = nextOption;

					this.selectCurrrentOption();
				}
			});


			// this.toggleDisabled();
			// this.toggleSearch();


			css.replace(`
				:host, *, *::before, *::after {
					box-sizing: border-box;
				}
				:host {
					--nice-padding-top: .375em;
					--nice-padding-bottom: .375em;
					--nice-padding-start: .625em;
					--nice-padding-end: .625em;
					--nice-option-padding-top: .25em;
					--nice-option-padding-bottom: .25em;
					--nice-option-padding-start: .25em;
					--nice-option-padding-end: .5em;
					--nice-optgroup-label-size: .85;
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
				:host[disabled] {
					color: gray;
					cursor: not-allowed;
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
					padding-block: var(--nice-option-padding-top) var(--nice-option-padding-bottom);
					padding-inline: var(--nice-option-padding-start) var(--nice-option-padding-end);
					transition: 130ms;
				}
				option:not([disabled]) {
					cursor: pointer;
				}
				option:not([disabled], [selected]):focus,
				option:not([disabled], [selected]):hover {
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
				optgroup:not(:first-child) {
					padding-top: calc(var(--nice-option-padding-top) * 2);
					border-top: 1px dotted;
				}
				optgroup:not(:last-child) {
					margin-bottom: var(--nice-option-padding-bottom);
					border-bottom: 1px dotted;
				}
				optgroup {
					font-size: .9em;
					padding-inline-start: calc(var(--nice-option-padding-start) / 2 / .9);
				}
				optgroup [label] {
					font-size: calc(1em * .85);
				}
				optgroup option {
					font-size: calc(1em / .9);
					margin-inline-start: 1em;
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
					overflow: clip;
				}
				nice-dropdown:not([inert]) nice-search {
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
		}



		attributeChangedCallback(name, oldValue, newValue) {
			switch (name) {
				case 'data-search':
					this.toggleSearch();
					break;
				case 'data-search-placeholder':
					this.updateSearchPlaceHolderCSS(newValue);
					break;
				case 'placeholder':
					this.placeholder = newValue;
					this.presentationElement.textContent = this.submitValue || this.placeholder;
					break;
				case 'disabled':
					this.toggleDisabled();
					break;
			}
		}


		get open() {
			return this.internals.states.has('open');
		}
		set open(value) {
			if (value) {
				this.internals.states.add('open');
			} else {
				this.internals.states.delete('open');
			}
		}


		checkValidity() {
			return this.internals.checkValidity();
		}
		reportValidity() {
			return this.internals.reportValidity();
		}
		get validity() {
			return this.internals.validity;
		}


		get value() {
			return this.currentOption?.value || null;
		}
		set value(value) {
			const option = this.availableOptions.find((option) => option.value === value);

			if (!option) {
				throw new Error(`'${value}' is not a valid option.`);
			}

			this.currentOption = option;
			this.selectCurrrentOption();
		}



		discconnectCallback() {
			console.log('disconnect');
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


