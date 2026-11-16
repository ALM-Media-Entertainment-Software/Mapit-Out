/**
 * Copyright (c) 2006-2024, JGraph Holdings Ltd
 * Copyright (c) 2006-2024, draw.io AG
 */
// Overrides of global vars need to be pre-loaded
window.DRAWIO_PUBLIC_BUILD = true;
window.EXPORT_URL = null; // Replace with the URL of your export server to enable server-side PDF and image export, e.g. https://www.example.com/export. With null, export to PDF uses the print dialog
window.DRAWIO_BASE_URL = null; // Replace with path to base of deployment, e.g. https://www.example.com/folder
window.DRAWIO_VIEWER_URL = null; // Replace your path to the viewer js, e.g. https://www.example.com/js/viewer.min.js
window.DRAWIO_LIGHTBOX_URL = null; // Replace with your lightbox URL, eg. https://www.example.com
window.DRAW_MATH_URL = 'math4/es5';
window.DRAWIO_CONFIG = window.MAPITOUT_CONFIG || null; // Map It Out: set by mapitout/config.js (only loaded by mapitout.html); null for stock index.html
if (window.MAPITOUT_CONFIG != null)
{
	var originBase = (typeof window.location !== 'undefined' && window.location.origin) ?
		window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) : '.';
	window.DRAWIO_BASE_URL = originBase;
	window.DRAWIO_LIGHTBOX_URL = originBase;
	window.VSS_CONVERT_URL = null;
	window.PLANT_URL = null;
	window.DRAWIO_LOG_URL = '';
	window.NOTIFICATIONS_URL = null;
	window.ICONSEARCH_PATH = null;
	window.ICON_SERVICE_PATH = null;
}
if (/mapitout\.html/.test(window.location.pathname) && window.DRAWIO_CONFIG === null && window.console)
{
	console.warn('Map It Out: MAPITOUT_CONFIG not found; mapitout/config.js did not load before js/PreConfig.js. AI is disabled.');
}
urlParams['sync'] = 'manual';
