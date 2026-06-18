import { serve } from "bun";
import {
  downloadArtifactHandler,
  listAgentsHandler,
  listArtifactsHandler,
} from "./api/artifacts";
import index from "./index.html";

const server = serve({
  port: process.env.PORT ? Number(process.env.PORT) : undefined,

  routes: {
    "/api/artifacts": {
      GET: listArtifactsHandler,
    },

    "/api/artifacts/download": {
      GET: downloadArtifactHandler,
    },

    "/api/agents": {
      GET: listAgentsHandler,
    },

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    // Serve index.html for all unmatched routes.
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
