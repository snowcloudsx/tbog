// Rebuilds the single index.pck the engine asks for from the split parts.
// GitHub caps pushed files at 100 MB, so the pack ships as pck.partNNN chunks.
const PARTS = [
	{
		"name": "pck.part000",
		"size": 94371840
	},
	{
		"name": "pck.part001",
		"size": 94371840
	},
	{
		"name": "pck.part002",
		"size": 94371840
	},
	{
		"name": "pck.part003",
		"size": 59471912
	}
];
const PACK_NAME = "index.pck";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);
	if (event.request.method !== "GET" || !url.pathname.endsWith("/" + PACK_NAME)) {
		return;
	}
	event.respondWith(streamPack(url));
});

async function streamPack(packUrl) {
	const total = PARTS.reduce((sum, part) => sum + part.size, 0);
	const stream = new ReadableStream({
		async start(controller) {
			try {
				for (const part of PARTS) {
					const response = await fetch(new URL(part.name, packUrl).href);
					if (!response.ok || !response.body) {
						throw new Error(`Could not load ${part.name} (HTTP ${response.status}).`);
					}
					const reader = response.body.getReader();
					for (;;) {
						const { done, value } = await reader.read();
						if (done) {
							break;
						}
						controller.enqueue(value);
					}
				}
				controller.close();
			} catch (error) {
				controller.error(error);
			}
		},
	});
	return new Response(stream, {
		headers: {
			"Content-Type": "application/octet-stream",
			"Content-Length": String(total),
		},
	});
}
