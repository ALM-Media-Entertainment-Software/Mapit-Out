/**
 * Map It Out (Mapit Estimating) - runtime configuration (loaded before js/main.js by mapitout.html).
 * Exposes window.MAPITOUT_CONFIG, window.MAPITOUT_TELEMETRY, and sets window.DRAWIO_CONFIG directly.
 * js/PreConfig.js re-applies it (bootstrap.js loads PreConfig.js after page scripts and resets
 * DRAWIO_CONFIG), while direct assignment keeps the backend enforced on all hostnames.
 *
 * Responsibilities (ADR 0002, ADR 0009):
 * 1. Wire draw.io's AI chat to a local LM Studio server (OpenAI-compatible API).
 * 2. Neutralize upstream draw.io / diagrams.net telemetry and cloud conversion/cache endpoints.
 * 3. Capture first-party editor, error, and AI telemetry in window.MAPITOUT_TELEMETRY (with
 *    CustomEvent('mapitout:telemetry') for listeners such as the prompt-injection detector, and
 *    optional JSON/HTML HTTP forwarding when window.MAPITOUT_TELEMETRY_CONFIG.endpoint is set).
 * 4. Rebrand in-app logo and window title to Map It Out / Mapit Estimating without patching
 *    upstream Editor.js / EditorUi.js.
 */
(function()
{
	var originBase = (typeof window.location !== 'undefined' && window.location.origin) ?
		window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/')) :
		'';

	// 1. Outbound endpoint lockdown (applied before Init.js runs and re-applied by PreConfig.js)
	function applyOutboundLockdown()
	{
		window.DRAWIO_BASE_URL = originBase || '.';
		window.DRAWIO_LIGHTBOX_URL = originBase || '.';
		window.DRAWIO_VIEWER_URL = null;
		window.EXPORT_URL = null;
		window.VSS_CONVERT_URL = null;
		window.PLANT_URL = null;
		window.DRAWIO_LOG_URL = '';
		window.NOTIFICATIONS_URL = null;
		window.ICONSEARCH_PATH = null;
		window.ICON_SERVICE_PATH = null;
	}

	applyOutboundLockdown();

	// 2. First-party telemetry collector (sink destination OPEN until monorepo control plane is wired)
	var telemetryCfg = Object.assign({
		enabled: true,
		endpoint: null, // OPEN: HTTP endpoint URL (e.g. control plane)
		format: 'json', // 'json' or 'html'
		maxEvents: 500
	}, window.MAPITOUT_TELEMETRY_CONFIG || {});

	var listeners = [];
	var events = [];

	function escapeHtml(str)
	{
		return String(str == null ? '' : str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function formatEventHtml(entry)
	{
		return '<article class="mapitout-telemetry-event" data-type="' + escapeHtml(entry.type) +
			'" data-ts="' + escapeHtml(entry.ts) + '">' +
			'<h4>' + escapeHtml(entry.type) + ' <small>(' + escapeHtml(entry.ts) + ')</small></h4>' +
			'<pre>' + escapeHtml(JSON.stringify(entry.data, null, 2)) + '</pre>' +
			'</article>';
	}

	function recordTelemetry(type, data)
	{
		if (!telemetryCfg.enabled)
		{
			return null;
		}

		var entry = {
			ts: new Date().toISOString(),
			app: 'mapitout',
			type: String(type || 'unknown'),
			data: data != null ? data : {}
		};

		events.push(entry);

		if (events.length > telemetryCfg.maxEvents)
		{
			events.shift();
		}

		for (var i = 0; i < listeners.length; i++)
		{
			try
			{
				listeners[i](entry);
			}
			catch (e)
			{
				// ignore listener error
			}
		}

		try
		{
			if (typeof window.CustomEvent === 'function' && typeof window.dispatchEvent === 'function')
			{
				window.dispatchEvent(new window.CustomEvent('mapitout:telemetry', {detail: entry}));
			}
		}
		catch (e)
		{
			// ignore dispatch error
		}

		if (typeof telemetryCfg.endpoint === 'string' && telemetryCfg.endpoint.length > 0 &&
			typeof window.fetch === 'function')
		{
			try
			{
				var isHtml = telemetryCfg.format === 'html';
				window.fetch(telemetryCfg.endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': isHtml ? 'text/html; charset=utf-8' : 'application/json'
					},
					body: isHtml ? formatEventHtml(entry) : JSON.stringify(entry),
					keepalive: true
				}).catch(function() {});
			}
			catch (e)
			{
				// ignore network error
			}
		}

		return entry;
	}

	window.MAPITOUT_TELEMETRY = {
		config: telemetryCfg,
		events: events,
		record: recordTelemetry,
		subscribe: function(fn)
		{
			if (typeof fn === 'function')
			{
				listeners.push(fn);
			}
			return function()
			{
				var idx = listeners.indexOf(fn);
				if (idx >= 0)
				{
					listeners.splice(idx, 1);
				}
			};
		},
		toJSON: function()
		{
			return events.slice();
		},
		toHTML: function()
		{
			return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
				'<title>Map It Out Telemetry</title></head><body>' +
				events.map(formatEventHtml).join('\n') +
				'</body></html>';
		}
	};

	// 3. Local LLM configuration
	var llm = Object.assign({
		// LM Studio default. Enable "Serve on local network" + CORS in the
		// LM Studio server tab if the editor is served from another origin.
		baseUrl: 'http://localhost:1234/v1',
		// Model identifiers must match GET {baseUrl}/models exactly. 'local-model' is only a
		// placeholder: set the real id in mapitout/env.js (a console warning is shown otherwise).
		models: [
			{name: 'Local - set model id in env.js', model: 'local-model'}
		],
		// LM Studio ignores the key, but draw.io hides a model unless its
		// key is set, so a placeholder is required.
		apiKey: 'lm-studio'
	}, window.MAPITOUT_LLM || {});

	if (llm.models.some(function(m) { return m.model === 'local-model'; }) && window.console)
	{
		console.warn('Map It Out: AI model id is the placeholder "local-model". Set the id shown by ' +
			llm.baseUrl + '/models in mapitout/env.js (window.MAPITOUT_LLM).');
	}

	// 4. Runtime hook for branding and telemetry (applied when Editor.configure runs)
	var runtimeHookApplied = false;

	function applyRuntimeHooks()
	{
		applyOutboundLockdown();

		if (typeof window.Editor !== 'undefined' && window.Editor != null)
		{
			window.Editor.enableRealtimeCache = false;
			window.Editor.logoImage = 'mapitout/logo.svg';

			if (window.Editor.prototype != null)
			{
				window.Editor.prototype.appName = 'Map It Out';
			}
		}

		if (typeof window.EditorUi !== 'undefined' && window.EditorUi != null && !runtimeHookApplied)
		{
			runtimeHookApplied = true;
			window.EditorUi.enableLogging = false;

			var origDebug = window.EditorUi.debug;

			window.EditorUi.logEvent = function(data)
			{
				recordTelemetry('editor.event', data);
			};

			window.EditorUi.logError = function(message, url, linenumber, colno, err, severity, quiet)
			{
				recordTelemetry('editor.error', {
					message: message,
					url: url,
					linenumber: linenumber,
					colno: colno,
					severity: severity || 'SEVERE',
					stack: (err != null && err.stack != null) ? String(err.stack) : null
				});

				if (!quiet && window.console != null && typeof window.console.error === 'function')
				{
					window.console.error(severity || 'SEVERE', message, url, linenumber, colno, err);
				}
			};

			window.EditorUi.sendReport = function(data)
			{
				recordTelemetry('editor.report', {data: data});
			};

			window.EditorUi.debug = function()
			{
				var first = arguments.length > 0 ? arguments[0] : null;

				if (first === 'EditorUi.ChatWindow.send')
				{
					recordTelemetry('ai.request', {
						url: arguments[2],
						model: (arguments[6] != null) ? arguments[6].model : null,
						params: arguments[4]
					});
				}
				else if (first === 'EditorUi.ChatWindow.response')
				{
					recordTelemetry('ai.response', {
						durationMs: arguments[8],
						text: (Array.isArray(arguments[6]) && arguments[6].length > 0) ? arguments[6][0] : null
					});
				}

				if (typeof origDebug === 'function')
				{
					return origDebug.apply(this, arguments);
				}
			};
		}
	}

	var configObj = Object.assign({}, window.MAPITOUT_CONFIG, {
		enableAi: true,
		enableExportUrl: false,
		// Separate storage namespace: a stock editor's saved '.configuration' (same origin)
		// must never override the local-only AI backend below.
		settingsName: 'mapitout',
		// Styles the top-left app icon cleanly for the Mapit Estimating mark
		customCss: '.geAppIcon { background-color: transparent !important; background-size: contain !important; border-radius: 4px; }',
		// Re-uses draw.io's built-in 'gpt' key slot (OpenAI-compatible request
		// shape) and points it at LM Studio. Gemini/Claude/GPT cloud models are
		// removed so nothing leaves the machine by default.
		gptApiKey: llm.apiKey,
		gptUrl: llm.baseUrl + '/chat/completions',
		aiActions: ['create', 'update', 'assist'], // no 'createPublic' (hosted draw.io)
		aiModels: llm.models.map(function(m)
		{
			return {name: m.name, model: m.model, config: 'gpt'};
		})
	});

	// Editor.configure(config) reads config.version first; this getter hooks Editor & EditorUi
	// right before App.main() constructs the editor UI, without patching upstream core files.
	Object.defineProperty(configObj, 'version', {
		enumerable: true,
		configurable: true,
		get: function()
		{
			applyRuntimeHooks();
			return 'mapitout-0.2';
		}
	});

	window.MAPITOUT_APPLY_HOOKS = applyRuntimeHooks;
	window.MAPITOUT_CONFIG = configObj;
	window.DRAWIO_CONFIG = window.MAPITOUT_CONFIG;
})();
