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
			this.dropdownElement.setAttribute('part', 'dropdown');
			const dropdownInner = document.createElement('nice-dropdown-inner');
			dropdownInner.setAttribute('part', 'dropdown-inner');
			this.dropdownPadding = document.createElement('nice-dropdown-padding');
			this.dropdownPadding.setAttribute('part', 'dropdown-padding');
			this.dropdownElement.append(dropdownInner);
			dropdownInner.append(this.dropdownPadding);
			this.optionListElement = document.createElement('nice-optionlist');
			this.optionListElement.setAttribute('part', 'optionlist');

			this.placeholder = this.getAttribute('placeholder');
			this.presentationElement = document.createElement('nice-presentation');
			this.presentationElement.setAttribute('part', 'presentation');
			this.presentationElement.textContent = this.placeholder || 'Select';

			this.allOptions = [];
			this.availableOptions = [];
			this.visibleOptions = [];

			this.shadow = this.attachShadow({
				mode: 'open',
				// delegatesFocus: true
			});

			this.change = new Event('change');


			this.toggleSearch = () => {
				if (this.searchEnabled && this.hasAttribute('data-search')) return;
				this.searchEnabled = this.hasAttribute('data-search');

				if(this.searchEnabled) {
					const searchInputWrapper = document.createElement('nice-search-wrapper');
					searchInputWrapper.setAttribute('part', 'search-wrapper');
					this.searchInputElement = document.createElement('nice-search');
					this.searchInputElement.setAttribute('part', 'search');
					this.searchInputElement.contentEditable = 'true';
					this.dropdownPadding?.insertBefore(searchInputWrapper, this.dropdownPadding.firstChild);
					searchInputWrapper.appendChild(this.searchInputElement);

					this.searchInputElement.addEventListener('input', (e) => {
						this.visibleOptions = this.allOptions.filter((option) => {
							return option.textContent?.toLowerCase().includes(e.target?.textContent?.toLowerCase() ?? '')
						});

						this.updateAvailableOptions();

						for (let option of this.allOptions) {
							option.hidden = !this.visibleOptions.includes(option);
						}

						for (let optgroup of this.optionListElement.querySelectorAll('nice-optgroup')) {
							optgroup.hidden = optgroup.querySelector('option:not([hidden])') ? false : true;
						}
					});

					this.focusElement = this.searchInputElement;
					this.onfocus = () => {
						this.searchInputElement.focus();
					}
				}
				else {
					this.shadow.querySelector('nice-search-wrapper')?.remove();

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

				this.dispatchEvent(this.change);
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


			this.openListener = (e) => {
				if (!this.contains(e.target)) {
					this.internals.states.delete('open');
				}
				else {
					this.internals.states.add('open');
				}
			}
		} // constructor




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

			this.shadow.append(this.presentationElement);
			this.shadow.append(this.dropdownElement);

			this.dropdownPadding.append(this.optionListElement);


			const addValidNodeToOptions = (node, parent = this.optionListElement) => {
				if (node?.nodeName === 'OPTGROUP') {
					const newOptgroupElement = document.createElement('nice-optgroup');
					const newOptgroupLabel = document.createElement('nice-optgroup-label');
					newOptgroupLabel.setAttribute('part', 'optgroup-label');
					newOptgroupLabel.textContent = node.getAttribute('label');
					newOptgroupElement.appendChild(newOptgroupLabel);
					newOptgroupElement.setAttribute('part', 'optgroup');

					this.optionListElement?.append(newOptgroupElement);

					for (const child of node.children) {
						addValidNodeToOptions(child, newOptgroupElement);
					}
				}

				if (node?.nodeName !== 'OPTION') return;
				if (!node?.textContent.trim()) return;

				const newOptionElement = node.cloneNode(true);
				newOptionElement.setAttribute('part', 'option');

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

				if (node.nodeName !== 'OPTION' && node.nodeName !== 'OPTGROUP') {
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


			this.optionListElement.addEventListener('click', (e) => {
				if (e.target?.tagName !== 'OPTION' || this.currentOption === e.target) return;

				this.currentOption = e.target;
				this.selectCurrrentOption();
				this.focusElement?.focus();

				this.internals.states.add('interacted');
			});


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

					this.internals.states.add('interacted');
					this.internals.states.add('open');
				}
			});


			document.addEventListener('click', this.openListener);


			css.replace(`
				:host, *, *::before, *::after {
					box-sizing: border-box;
					position: relative;
				}
				:host {
					--nice-padding-top: .375em;
					--nice-padding-bottom: .375em;
					--nice-padding-start: .625em;
					--nice-padding-end: .625em;
					--nice-option-padding-top: .25em;
					--nice-option-padding-bottom: .15em;
					--nice-option-padding-start: .25em;
					--nice-option-padding-end: .5em;
					--nice-optgroup-label-size: .85;
					--nice-min-width: ${minWidth};
					--nice-max-height: 15lh;
					display: inline-block;
					z-index: 1;
					padding-top: var(--nice-padding-top);
					padding-bottom: var(--nice-padding-bottom);
					padding-inline-start: var(--nice-padding-start);
					padding-inline-end: var(--nice-padding-end);
					min-width: max(var(--nice-min-width), ${minWidth});
				}
				:host([disabled]) {
					color: gray;
					cursor: not-allowed;
				}
				nice-dropdown {
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					z-index: -1;
					padding-top: calc(1lh + var(--nice-padding-top) + var(--nice-padding-bottom) /2);
					border: 1px solid;
					border-radius: .25em;
					background: white;
					overflow: hidden;
					overflow: hidden;
					transition: 1500ms;
				}
				nice-dropdown-inner {
				}
				:host(:focus-within),
				:host(:state(open)) {
					nice-dropdown {
					}
				}
				nice-dropdown-padding {
					display: flex;
					flex-direction: column;
					gap: .25em;
					padding-bottom: var(--nice-padding-bottom);
					padding-inline-start: var(--nice-padding-start);
					padding-inline-end: var(--nice-padding-end);
				}
				nice-optionlist {
					display: block;
					max-height: var(--nice-max-height);
					overflow-y: auto;
					scrollbar-width: thin;
					padding-inline-end: .3em;
				}
				option {
					box-sizing: content-box;
					height: 1lh;
					padding-block: var(--nice-option-padding-top) var(--nice-option-padding-bottom);
					padding-inline: var(--nice-option-padding-start) var(--nice-option-padding-end);
					transition: 130ms;

					&[selected] {
						background: #444;
						color: white;
					}
					&[disabled] {
						color: inherit;
						opacity: .5;
					}
					&:not([disabled]) {
						cursor: pointer;
					}
					&:not([disabled], [selected]):focus,
					&:not([disabled], [selected]):hover {
						background: #f0f0f0;
					}
				}
				nice-optgroup {
					display: block;
					padding-inline-start: var(--nice-option-padding-start);

					&:not(:first-child) {
						padding-top: calc(var(--nice-option-padding-top) * 2);
						padding-bottom: var(--nice-option-padding-bottom);
						margin-top: var(--nice-option-padding-top);
						border-top: 1px dotted;
					}
					&:not(:last-child) {
						margin-bottom: var(--nice-option-padding-bottom);
						border-bottom: 1px dotted;
					}
					&[hidden] {
						display: none;
					}
					option {
						margin-inline-start: var(--nice-option-padding-start);

						&:first-of-type {
							margin-top: var(--nice-option-padding-top);
						}
					}
				}
				nice-optgroup-label {
					display: block;
					font-size: 90%;
					font-weight: bold;
				}
				nice-search-wrapper {
					display: block;
					overflow: hidden;
					height: calc(1lh + .5em);
					padding-inline-start: var(--nice-option-padding-start);
					padding-inline-end: var(--nice-option-padding-end);
					border: 1px dotted;
					border-radius: .25em;

					&:focus-within {
						outline: 1px solid;
					}
				}
				nice-search {
					display: block;
					width: 100%;
					padding-block: .25em;
					cursor: text;
					white-space: nowrap;
					overflow: clip;

					&:focus {
						outline: none;
					}
					&:empty:before {
						position: absolute;
						opacity: .5;
					}
					div, br {
						display: none;
					}
					nice-dropdown:not([inert]) & {
						overflow-x: scroll;
					}
				}
				nice-presentation {
					display: block;
					cursor: pointer;
				}
			`);
		} // connectedCallback




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
		} // attributeChangedCallback



		get interacted() {
			return this.internals.states.has('interacted');
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
			document.removeEventListener('click', this.openListener);
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


