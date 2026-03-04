/**
 * @file src/core/utils.js
 * Shared formatting and math helpers
 * No dependencies
 */
function formatDuration(sec) {
    if (sec <= 0) return '0s';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

function getSessionBonus(metricMin) {
    const metricHours = parseFloat(metricMin) / 60 || 0;
    return 25 * Math.tanh(metricHours / 6);
}

// === ENCRYPTION UTILITIES (pure Web Crypto – zero extra deps) ===
let masterKey = null;   // lives in RAM only, cleared on unload

async function deriveKey(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
    );
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return {
        key: await crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        ),
        salt
    };
