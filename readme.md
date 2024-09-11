# nice-select: a web component to replace selects

## Usage

Call the script:

`<script src="nice-select.js"></script>`

Insert select elements in your HTML as usual but replace `<select>` with `<nice-select>`.

For progressive enhancement, use plain `<select>` elements and call
```JS
niceSelect(selector)
```
where `selector` is the css selector for the element(s) containing your `<select>` elements (defaults to the whole document if not specified).

See `demo.html` for an example.

## Attributes

Use the following attributes on your `<select>` or `<nice-select>` element for enhanced functionality:

-	`placeholder` - the placeholder text shown when no option is selected
-	`data-search` - enables search input to filter options
-	`data-search-placeholder` - the placeholder text shown inside the search input field
-	`data-validity-message` - the message shown on failed form validation

## Styling

**nice-select** uses the shadow dom for encapsulated styling. All child elements can be styled as `::part()` pseudo elements using their node names minus the `nice-` prefix.

The full list of parts is:

`dropdown`, `dropdown-inner`, `dropdown-padding`, `optgroup`, `optgroup-label`, `option`, `optionlist`, `presentation`, `search`, `search-wrapper`.

Additonally, **nice-select** exposes the following states to be used in a `:state()` pseudo class:

-	`open` - when the dropdown is open
-	`interacted` - when the user has interacted with the dropdown

## Getters and Setters

**nice-select** exposes the following getters and setters:

-	`interacted` (boolean, get) - return true if the user has interacted with the dropdown
-	`open` (boolean, get/set) - the open/closed state of the dropdown
-	`value` (string, get/set) - the value of the selected option
-	`validity` (boolean, get/set) - whether the a valid option has been selected

## Events

**nice-select** exposes the following events:

-	`change` - when the value of the `<nice-select>` changes