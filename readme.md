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

To set the dimensions of the element, the following custom properties can be used on the `nice-select` selector:

-	`--nice-min-width` - the minimum width of the `<nice-select>` element, regardless of content. The element will grow to accomodate the longest option name.
-	`--nice-max-height` - the maxmimum height of the `<nice-select>` element, regardless of content. The element will scroll if there are more options than can be displayed at once.

Additonally, **nice-select** exposes the following states to be used in a `:state()` pseudo class:

-	`open` - when the dropdown is open
-	`interacted` - when the user has interacted with the dropdown

## Getters and Setters

**nice-select** exposes the following getters and setters:

-	`interacted` (boolean, get) - return true if the user has interacted with the element
-	`open` (boolean, get/set) - the open/closed state of the dropdown
-	`value` (string, get/set) - the current value of the element
-	`validity` (boolean, get) - whether a valid option has been selected

## Events

**nice-select** exposes the following events:

-	`change` - when the value of the `<nice-select>` changes

## Changing options and attributes

Any live changes made to the children of the `<nice-select>` element will be reflected in the shadow DOM, therefore no additional methods are required.