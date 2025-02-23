import e from "express"
import { Dropbox } from "dropbox";
import fetch from "node-fetch"
const router = e.Router()

const handle = async (req, res) => {
    const dbx = new Dropbox({ accessToken: process.env.NEXT_PUBLIC_DROPBOX_API_KEY, fetch });
    try {
        const body = await req.json();
        const { id, output, status, error } = body;

        console.log("Replicate Webhook received:", body);

        if (status === "succeeded") {
            // Process the successful prediction
            const imageUrls = Array.isArray(output) ? output : [output]; // Ensure output is an array

            for (const [index, imageUrl] of imageUrls.entries()) {
                if (dbx) {
                    try {
                        const imageResponse = await fetch(imageUrl);
                        if (!imageResponse.ok) {
                            throw new Error(`Failed to fetch image from Replicate: ${imageResponse.status} for URL: ${imageUrl}`);
                        }

                        const imageBuffer = await imageResponse.arrayBuffer();
                        const fileContent = Buffer.from(imageBuffer);
                        const filename = `generated_image_${id}_${index}.png`; // Include prediction ID
                        const dropboxPath = `/images/${filename}`;

                        const uploadResult = await dbx.filesUpload({
                            path: dropboxPath,
                            contents: fileContent,
                            mode: { '.tag': 'overwrite' }
                        });

                        console.log("Dropbox Upload Success:", uploadResult);

                        const sharedLinkResult = await dbx.sharingCreateSharedLinkWithSettings({
                            path: dropboxPath,
                            settings: { requested_visibility: 'public' }
                        });

                        const sharedUrl = sharedLinkResult.result.url.replace('?dl=0', '?raw=1'); // Direct access URL
                        // You might want to store the sharedUrl in a database
                        console.log(`Dropbox URL: ${sharedUrl}`);
                    } catch (dropboxError) {
                        console.error(`Dropbox upload failed for image ${imageUrl}:`, dropboxError);
                        // Handle Dropbox upload error
                    }
                } else {
                    console.warn("Dropbox not configured, skipping upload.");
                    // Handle the case where Dropbox is not configured
                }
            }
            return res.json({ status: "success", message: "Images Uploaded to Dropbox" }, { status: 200 }).status(200);

        } else if (status === "failed") {
            console.error("Replicate prediction failed:", error);
            return res.json({ status: "failed", message: "Replicate prediction failed", error: error }, { status: 500 }).status(500);
        } else {
            console.log("Replicate prediction in progress:", body);
            return res.json({ status: "processing", message: "Replicate prediction in progress" }, { status: 202 }).status(202); // Accepted
        }
    } catch (error) {
        console.error("Error in Replicate webhook:", error);
        return res.json({ status: "error", message: error.message }, { status: 500 }).status(500);
    }
}
router.post("/", handle)
export default router;