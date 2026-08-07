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
  // minConfidence 0.5: low-confidence boxes from chairs/objects are rejected so
  // an empty scene reports "no face" instead of producing a garbage descriptor.
  // All reference photos score >= 0.7, so they still build reliably.
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
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
