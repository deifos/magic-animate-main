import * as fal from "@fal-ai/serverless-client";

fal.config({
  credentials: process.env.FAL_KEY,
  requestMiddleware: fal.withProxy({
    targetUrl: "/api/fal/proxy",
  }),
});

export async function POST(request: Request) {
  let resp = null;

  const { img, mask   } = await request.json();
 
  const payload = {
    subscriptionId: "110602490-svd", // 
    input: {
      image_url: img,
      mask_image_url: mask,
      sync_mode: true,
    },
    pollInterval: 4000,
    logs: true,
  };

  try {
    const result: any = await fal.subscribe(payload.subscriptionId, payload);

    resp = result;

  } catch (error) {
    console.log(error);
    // Handle errors and return an appropriate response to the frontend
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
    });
  }

  // Return the imageUrl in the response to the frontend
  // return new Response(JSON.stringify({ imageUrl }), {
  return new Response(JSON.stringify(resp), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
