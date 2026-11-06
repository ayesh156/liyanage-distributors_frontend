/**
 * @file whatsapp.js
 * @description Standardized WhatsApp communication utility.
 * Formats Sri Lankan phone numbers to E.164 without leading '+' or zeros,
 * cleanly encodes messages including universally supported emojis and double newlines,
 * and launches WhatsApp chat URLs directly for dispatches and alerts.
 */

/**
 * Formats a Sri Lankan phone number to WhatsApp international standard.
 * Cleans non-digits and ensures country code ('94') prefix for wa.me URL dispatch.
 *
 * @param {string|number} rawPhone - Raw input phone number
 * @returns {string} E.164 formatted number without '+' (e.g. '94771112233')
 */
export const formatSriLankanWhatsAppNumber = (rawPhone) => {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length >= 11) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `94${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `94${digits}`;
  }
  return digits;
};

/**
 * Constructs a clean, universally supported, clickable WhatsApp dispatch message.
 * Omits emojis to eliminate surrogate pair rendering glitches and Mojibake,
 * and explicitly inserts a double newline (\n\n) before URLs so WhatsApp's text parser
 * reliably formats the hyperlink as clickable.
 *
 * @param {string} manifestCode - Unique manifest reference code (e.g., MAN-20261105-01)
 * @param {string} shareUrl - Target HTTP/HTTPS web route for manifest verification
 * @returns {string} Formatted dispatch message text
 */
export const buildManifestDispatchMessage = (manifestCode, shareUrl) => {
  return `Today's Delivery Van Manifest (${manifestCode}) is ready for your verification:\n\n${shareUrl}`;
};

/**
 * Opens a WhatsApp chat session with the provided phone number and prefilled message.
 * Ensures the ENTIRE message string is properly passed through encodeURIComponent()
 * before constructing the https://wa.me/?text= URL.
 *
 * @param {string|number} phone - Sales representative or customer phone number
 * @param {string} [message=''] - Message content to prefill in WhatsApp
 * @returns {string|null} The dispatched WhatsApp URL, or null if phone is empty/invalid
 */
export const openWhatsAppChat = (phone, message = '') => {
  const formattedPhone = formatSriLankanWhatsAppNumber(phone);
  if (!formattedPhone) return null;
  const encodedText = message ? `?text=${encodeURIComponent(message)}` : '';
  const whatsappUrl = `https://wa.me/${formattedPhone}${encodedText}`;
  if (typeof window !== 'undefined') {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }
  return whatsappUrl;
};

