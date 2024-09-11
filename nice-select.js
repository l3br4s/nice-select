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
			this.dropdownInnerElement = document.createElement('nice-dropdown-inner');
			this.dropdownInnerElement.setAttribute('part', 'dropdown-inner');
			this.dropdownPaddingElement = document.createElement('nice-dropdown-padding');
			this.dropdownPaddingElement.setAttribute('part', 'dropdown-padding');
			this.dropdownElement.append(this.dropdownInnerElement);
			this.dropdownInnerElement.append(this.dropdownPaddingElement);
			this.optionListElement = document.createElement('nice-optionlist');
			this.optionListElement.setAttribute('part', 'optionlist');

			this.placeholder = this.getAttribute('placeholder');
			this.presentationElement = document.createElement('nice-presentation');
			this.presentationElement.setAttribute('part', 'presentation');
			this.presentationElement.textContent = this.placeholder || 'Select';

			this.allOptions = [];
			this.availableOptions = [];
			this.visibleOptions = [];
			this.validityMessage = 'Please select on option.';

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
					this.dropdownPaddingElement?.insertBefore(searchInputWrapper, this.dropdownPaddingElement.firstChild);
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
							optgroup.hidden = !optgroup.querySelector('option:not([hidden])');
						}
					});

					this.focusElement = this.searchInputElement;
					this.onfocus = () => {
						this.focusElement.focus();
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
				this.skipObservers = true;

				for (let option of this.allOptions) {
					option.removeAttribute('selected');
				}

				this.internals.setFormValue(this.currentOption.value || null);

				if (this.currentOption.value) {
					this.internals.states.add('valid');
					this.internals.setValidity({valueMissing: false});
				}
				else {
					this.internals.states.delete('valid');
					this.internals.setValidity({valueMissing: true}, this.validityMessage);
				}

				this.currentOption.setAttribute('selected', '');

				const target = [...this.querySelectorAll('option')].filter((option) => (
					option.value === this.currentOption.value
					|| option.textContent === this.currentOption.textContent
				))[0];

				if (target) {
					for (let option of this.querySelectorAll('option')) {
						option.removeAttribute('selected');
					}
					target.setAttribute('selected', '');
				}

				if (this.currentOption?.textContent) {
					this.presentationElement.textContent = this.currentOption?.textContent;
				}
				else {
					this.presentationElement.innerHTML = '&nbsp;';
				}

				this.dispatchEvent(this.change);

				requestAnimationFrame(() => {
					this.skipObservers = false;
				})
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

			this.validityMessage = this.getAttribute('data-validity-message') ?? this.validityMessage;
			this.internals.setValidity({
				valueMissing: true,
			}, this.validityMessage);

			this.tabIndex = 0;

			this.shadow.append(this.presentationElement);
			this.shadow.append(this.dropdownElement);

			this.dropdownPaddingElement.append(this.optionListElement);

			const addValidNodeToOptions = (node, parent = this.optionListElement) => {
				if (node?.nodeName === 'OPTGROUP') {
					const options = [...node.querySelectorAll('option')];
					if (options.filter((option) => option.textContent.trim()).length === 0) return;

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


			const updateOptions = () => {
				this.allOptions = [];
				this.availableOptions = [];
				this.visibleOptions = [];

				this.optionListElement.innerHTML = '';

				for (const node of this.childNodes) {
					addValidNodeToOptions(node);

					requestAnimationFrame(() => {
						removeInvalidNodeFromDOM(node);
					})
				}
			}
			updateOptions();


			let callbackTimeout;
			const childListCallback = (records) => {

				if(this.skipObservers) return;

				clearTimeout(callbackTimeout);

				callbackTimeout = setTimeout(() => {
					updateOptions();
					this.style.setProperty('--nice-min-width', '0');
					requestAnimationFrame(calculateSizes);
				}, 10);
			}


			const calculateSizes = () => {
				this.skipObservers = true;

				this.style.setProperty('--nice-min-width', Math.max(this.dropdownPaddingElement?.offsetWidth ?? 0, this.presentationElement?.offsetWidth ?? 0) + 'px');

				requestAnimationFrame(() => {
					this.skipObservers = false;
				})
			}


			this.childListObserver = new MutationObserver(childListCallback);
			this.childListObserver.observe(this, {
				childList: true,
				subtree: true,
				characterData: true,
				attributes: true,
			});


			this.optionListElement.addEventListener('click', (e) => {
				if (e.target?.tagName !== 'OPTION' || this.currentOption === e.target) return;

				this.currentOption = e.target;
				this.selectCurrrentOption();
				this.focusElement?.focus();

				this.internals.states.add('interacted');
			});


			function getListOffset(element, viewport) {
				let offset = element.offsetTop;
				const parent = element.parentNode;

				function addOffset(parent) {
					if (!parent || parent === viewport) return;
					offset += parent.offsetTop;
					addOffset(parent.parentNode);
				}
				addOffset(parent);

				return offset;
			}


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

					const listHeight = this.optionListElement.offsetHeight;
					const listScrollTop = this.optionListElement.scrollTop;
					const currentTopOffset = getListOffset(this.currentOption, this.optionListElement);
					const currentBottomOffset = currentTopOffset + this.currentOption.offsetHeight;

					if (currentBottomOffset > listHeight + listScrollTop) {
						this.optionListElement.scrollTop = currentBottomOffset - listHeight;
					}
					else if (currentTopOffset < listScrollTop) {
						this.optionListElement.scrollTop = currentTopOffset;
					}
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
					--nice-background-color: white;
					--nice-color: black;
					--nice-focus-background-color: #f0f0f0;
					--nice-selected-background-color: #444;
					--nice-selected-color: white;
					display: inline-block;
					z-index: 1;
					padding-top: var(--nice-padding-top);
					padding-bottom: var(--nice-padding-bottom);
					padding-inline-start: var(--nice-padding-start);
					padding-inline-end: var(--nice-padding-end);
					min-width: max(var(--nice-min-width), ${minWidth});
					color: var(--nice-color);
				}
				@media (prefers-color-scheme: dark) {
					:host {
						--nice-background-color: black;
						--nice-color: white;
						--nice-focus-background-color: #4f4f4f;
						--nice-selected-background-color: #f0f0f0;
						--nice-selected-color: black;
					}
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
					display: grid;
					grid-template-rows: 0fr;
					padding-top: calc(1lh + var(--nice-padding-top) + var(--nice-padding-bottom) /2);
					border: 1px solid;
					border-radius: .25em;
					background: var(--nice-background-color);
					overflow: clip;
					transition: 200ms;
				}
				nice-dropdown-inner {
					grid-row: 1 / span 2;
				}
				:host(:focus-within),
				:host(:state(open)) {
					nice-dropdown {
						grid-template-rows: 1fr;
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
					transition: 100ms;

					&[selected] {
						background: var(--nice-selected-background-color);
						color: var(--nice-selected-color);
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
						background: var(--nice-focus-background-color);
					}
				}
				nice-optgroup {
					display: block;

					&:not(:first-child) {
						margin-top: var(--nice-option-padding-bottom);
					}
					&:not(:last-child) {
						padding-bottom: var(--nice-option-padding-bottom);
						border-bottom: 1px dotted;
					}
					option + & {
						padding-top: calc(var(--nice-option-padding-top));
						border-top: 1px dotted;
					}
					& + option {
						margin-top: var(--nice-option-padding-bottom);
					}
					&[hidden] {
						display: none;
					}
					&:has(nice-optgroup-label:not(:empty)) {
						padding-inline-start: var(--nice-option-padding-start);

						option {
							margin-inline-start: var(--nice-option-padding-start);
						}
					}
				}
				nice-optgroup-label {
					display: block;
					font-size: 90%;
					font-weight: bold;

					&:not(:empty) {
						padding-block: var(--nice-option-padding-top) var(--nice-option-padding-bottom);
					}
				}
				nice-search-wrapper {
					display: block;
					overflow: hidden;
					height: calc(1lh + .5em);
					padding-inline-start: var(--nice-option-padding-start);
					padding-inline-end: var(--nice-option-padding-end);
					border: 1px dotted;
					border-radius: .25em;

					&:focus-within nice-dropdown {
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
						opacity: .6;
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
					this.presentationElement.textContent = this.currentOption?.value || this.placeholder;
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


function niceSelect(selector) {

	if (selector) {
		for (let target of document.querySelectorAll(selector)) {
			replaceSelects(target);
		}
	}
	else {
		replaceSelects();
	}

	function replaceSelects(target = document) {
		const selects = target.querySelectorAll('select');

		for (let select of selects) {
			const niceSelect = document.createElement('nice-select');
			niceSelect.innerHTML = select.innerHTML;

			const attributes = select.attributes;
			for (let attribute of attributes) {
				niceSelect.setAttribute(attribute.name, attribute.value);
			}

			select.replaceWith(niceSelect);
		}
	}
}


