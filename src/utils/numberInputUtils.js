/**
 * @file numberInputUtils.js
 * @description Standardized handlers for numeric/value input UX across Liyanage Distributors.
 * Eliminates "0" stickiness by auto-clearing/selecting text on focus, allowing empty string
 * and intermediate decimal prefixes ("0.", "0.0", "5.") on change, stripping unnecessary
 * leading zeros on integers ("05" -> "5"), and normalizing empty strings back to safe numbers on blur.
 */

/**
 * Handles input focus: if the current value is 0, "0", or "0.00", automatically clears
 * it to "" so the user can type immediately without manually backspacing.
 * Otherwise selects all text via select().
 *
 * @param {React.FocusEvent<HTMLInputElement>} e
 * @param {Function} [setValue] - Optional controlled state setter
 */
export function handleNumericFocus(e, setValue) {
  const val = e.currentTarget.value;
  if (val === '0' || val === '0.0' || val === '0.00') {
    if (typeof setValue === 'function') {
      setValue('');
    } else {
      e.currentTarget.value = '';
    }
  } else {
    try {
      e.currentTarget.select();
    } catch (_err) {
      // Ignore if select not supported
    }
  }
}

/**
 * Normalizes user typing on change:
 * - Allows empty string ""
 * - Preserves valid decimal prefixes (e.g. "0.", "0.0", "5.", "12.")
 * - Strips unnecessary leading zeros on integers (e.g. "05" -> "5", "012" -> "12")
 *
 * @param {string} rawValue
 * @returns {string} normalized string
 */
export function normalizeNumericChange(rawValue) {
  if (rawValue === '' || rawValue === undefined || rawValue === null) {
    return '';
  }
  const str = String(rawValue);

  // If input starts with "0" followed by a non-decimal digit (e.g. "05", "005"), strip leading zeros
  if (/^0[0-9]+/.test(str)) {
    return str.replace(/^0+(?=\d)/, '');
  }

  return str;
}

/**
 * Handles input blur: normalizes empty string "" back to a safe fallback (e.g. "0").
 *
 * @param {React.FocusEvent<HTMLInputElement>} e
 * @param {Function} setValue - State setter
 * @param {string|number} [defaultValue="0"] - Safe default value on blur
 */
export function handleNumericBlur(e, setValue, defaultValue = '0') {
  const val = e.currentTarget.value;
  if (val === '' || val === undefined || val === null) {
    if (typeof setValue === 'function') {
      setValue(defaultValue);
    }
  }
}
