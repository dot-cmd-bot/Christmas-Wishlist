import type * as FaceApi from "@vladmandic/face-api";

let faceapiPromise: Promise<typeof FaceApi> | null = null;

/**
 * face-api (and its bundled TensorFlow.js) is browser-only. It is imported
 * dynamically so the server never evaluates it during SSR / prerendering.
 */
function getFaceApi(): Promise<typeof FaceApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("face-api can only run in the browser"));
  }
  if (!faceapiPromise) {
    faceapiPromise = import("@vladmandic/face-api");
  }
  return faceapiPromise;
}

const MODEL_URL = "/models";

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      const faceapi = await getFaceApi();
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      modelsLoaded = true;
    })();
  }
  return loadPromise;
}

export async function computeDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
): Promise<Float32Array | null> {
  const faceapi = await getFaceApi();
  // minConfidence 0.3: close-up / poorly lit faces (score ~0.4-0.6) are
  // otherwise missed entirely. False positives are harmless — matching still
  // requires a low Euclidean distance to a known reference face.
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
  const detection = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export async function euclideanDistance(
  a: Float32Array | number[],
  b: Float32Array | number[],
): Promise<number> {
  const faceapi = await getFaceApi();
  return faceapi.euclideanDistance(a, b);
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function facePhotoUrl(faceRecognitionId: string): string {
  return `/faces/${faceRecognitionId}.jpg`;
}
